import os
import httpx
import asyncpg
from fastapi import FastAPI, HTTPException
from sqlglot import parse_one, exp
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

app = FastAPI()

# Prometheus metrics
REQ_TOTAL = Counter("dispatcher_requests_total", "All incoming /query requests")
SPLIT_TOTAL = Counter("dispatcher_splits_total", "Number of sub-queries created")
AGG_QUERIES = Counter("dispatcher_aggregate_queries_total", "Aggregate queries", ["agg_type"])
DYNAMIC_SPLITS = Counter("dispatcher_dynamic_splits_total", "Queries split dynamically (no explicit BETWEEN)")
QUERY_LATENCY = Histogram("dispatcher_query_duration_seconds", "Query latency", ["query_type"])
WORKER_REQUESTS = Counter("dispatcher_worker_requests_total", "Total requests sent to workers")
ACTIVE_QUERIES = Gauge("dispatcher_active_queries", "Currently processing queries")
GROUP_BY_QUERIES = Counter("dispatcher_group_by_queries_total", "Queries with GROUP BY")

# Where workers live (Docker‑Compose service name)
WORKER_URL = os.getenv("WORKER_URL", "http://worker-svc:8001/execute")
MAX_PARTS = int(os.getenv("MAX_PARTS", "4"))   # how many parallel pieces per query
DB_DSN = os.getenv("DB_DSN", "postgres://user:pw@postgres:5432/demo")

# Database connection pool (initialized on startup)
db_pool = None

async def get_table_bounds(table_name: str, partition_col: str = "id"):
    """
    Query the database to find min/max values for dynamic splitting.
    Returns: (min_val, max_val) or (None, None) if not found
    """
    try:
        async with db_pool.acquire() as conn:
            query = f"SELECT MIN({partition_col}), MAX({partition_col}) FROM {table_name}"
            row = await conn.fetchrow(query)
            if row and row[0] is not None and row[1] is not None:
                return (row[0], row[1])
    except Exception as e:
        print(f"Error querying bounds: {e}")
    return (None, None)

def extract_table_name(parsed):
    """Extract the main table name from a SELECT query."""
    if not isinstance(parsed, exp.Select):
        return None
    
    # Find the FROM clause
    from_clause = parsed.args.get("from")
    if from_clause:
        # Get the first table
        for table in from_clause.find_all(exp.Table):
            return table.name
    return None

def can_split(parsed):
    """Determine if a query can be split. Now supports queries without explicit BETWEEN."""
    if not isinstance(parsed, exp.Select):
        return False
    
    # We can split any SELECT query that has a table
    table_name = extract_table_name(parsed)
    return table_name is not None

async def make_subqueries(sql, n_parts=MAX_PARTS):
    """Intelligent range partition using dynamic database bounds."""
    parsed = parse_one(sql)
    
    # Remove HAVING clause from subqueries (it must be applied globally after merge)
    if parsed.args.get("having"):
        print(f"DEBUG: Removing HAVING clause from worker queries")
        parsed.set("having", None)
        
    table_name = extract_table_name(parsed)
    
    if not table_name:
        return [parsed.sql()]
    
    # Try to extract explicit bounds from WHERE clause first
    where = parsed.args.get("where")
    col = "id"  # Default partition column
    low, high = None, None
    
    if where:
        # Extract column name and bounds from BETWEEN clause
        for node in where.find_all(exp.Column):
            col = node.name
        literals = [int(l.this) for l in where.find_all(exp.Literal) if l.this.isdigit()]
        if len(literals) >= 2:
            low, high = literals[0], literals[1]
    
    # If no explicit bounds, query the database
    if low is None or high is None:
        low, high = await get_table_bounds(table_name, col)
        if low is None or high is None:
            # Can't determine bounds, don't split
            return [parsed.sql()]
    
    # Create n_parts sub-queries
    step = (high - low + 1) // n_parts
    subs = []
    for i in range(n_parts):
        start = low + i * step
        end = low + (i + 1) * step - 1 if i < n_parts - 1 else high
        
        # Create new WHERE condition
        new_cond = parse_one(f"{col} BETWEEN {start} AND {end}")
        
        sub_sql = parsed.copy()
        
        if where:
            # Combine with existing WHERE clause using AND
            combined = exp.And(this=where.this, expression=new_cond)
            sub_sql.set("where", exp.Where(this=combined))
        else:
            # No existing WHERE, just add the BETWEEN
            sub_sql.set("where", exp.Where(this=new_cond))
        
        query_str = sub_sql.sql()
        print(f"DEBUG: Subquery {i}: {query_str}")
        subs.append(query_str)
    return subs

def analyze_query(parsed):
    """
    Analyze query for aggregation, grouping, and having.
    """
    if not isinstance(parsed, exp.Select):
        return {'is_agg': False, 'group_by': [], 'having': None}
    
    # Check for aggregates
    agg_type = None
    agg_col = None
    agg_alias = None
    is_agg = False
    
    # Find the aggregate function and its alias
    for expression in parsed.expressions:
        # Search inside the expression for aggregate functions
        found_agg = False
        for node in expression.find_all((exp.Count, exp.Sum, exp.Avg, exp.Min, exp.Max)):
            is_agg = True
            found_agg = True
            if isinstance(node, exp.Count): agg_type = 'count'
            elif isinstance(node, exp.Sum): agg_type = 'sum'
            elif isinstance(node, exp.Avg): agg_type = 'avg'
            elif isinstance(node, exp.Min): agg_type = 'min'
            elif isinstance(node, exp.Max): agg_type = 'max'
            
            # Try to find the column being aggregated
            if isinstance(node.this, exp.Column):
                agg_col = node.this.name
            break
        
        if found_agg:
            agg_alias = expression.alias_or_name
            break
            
    # Check for Group By
    group_by = []
    group = parsed.args.get("group")
    if group:
        for expr in group.expressions:
            if isinstance(expr, exp.Column):
                group_by.append(expr.name)
            elif isinstance(expr, exp.Literal):
                group_by.append(str(expr.this))
            else:
                group_by.append(expr.alias_or_name)

    # Check for Having
    having = parsed.args.get("having")
    
    return {
        'is_agg': is_agg,
        'agg_type': agg_type,
        'agg_col': agg_col,
        'agg_alias': agg_alias,
        'group_by': group_by,
        'having': having
    }

def evaluate_condition(node, row):
    """Recursively evaluate a HAVING condition against a result row."""
    import sys
    
    if isinstance(node, exp.Literal):
        if node.is_int: return int(node.this)
        if node.is_number: return float(node.this)
        return node.this
    
    if isinstance(node, exp.Column):
        # Match column name or alias (case-insensitive)
        col_name = node.name
        val = row.get(col_name)
        
        # Try case-insensitive match if not found
        if val is None:
            for key in row.keys():
                if key.lower() == col_name.lower():
                    val = row[key]
                    break
        
        sys.stderr.write(f"DEBUG evaluate_condition: Column '{col_name}' -> {val} (row keys: {list(row.keys())})\n")
        sys.stderr.flush()
        return val
        
    # Handle aggregates in HAVING (e.g. COUNT(*) > 5)
    # We map them to the aggregate alias in the row
    if isinstance(node, (exp.Count, exp.Sum, exp.Avg, exp.Min, exp.Max)):
        # We assume the row contains the result of this aggregate
        # Heuristic: return the value of the aggregate column
        for key, val in row.items():
            if isinstance(val, (int, float)): # Candidate for aggregate result
                sys.stderr.write(f"DEBUG evaluate_condition: Aggregate -> {val}\n")
                sys.stderr.flush()
                return val
        return 0

    if isinstance(node, exp.GT): 
        left = evaluate_condition(node.this, row)
        right = evaluate_condition(node.expression, row)
        result = left > right if (left is not None and right is not None) else False
        sys.stderr.write(f"DEBUG evaluate_condition: {left} > {right} = {result}\n")
        sys.stderr.flush()
        return result
    if isinstance(node, exp.LT): return evaluate_condition(node.this, row) < evaluate_condition(node.expression, row)
    if isinstance(node, exp.GTE): return evaluate_condition(node.this, row) >= evaluate_condition(node.expression, row)
    if isinstance(node, exp.LTE): return evaluate_condition(node.this, row) <= evaluate_condition(node.expression, row)
    if isinstance(node, exp.EQ): return evaluate_condition(node.this, row) == evaluate_condition(node.expression, row)
    if isinstance(node, exp.NEQ): return evaluate_condition(node.this, row) != evaluate_condition(node.expression, row)
    if isinstance(node, exp.And): return evaluate_condition(node.this, row) and evaluate_condition(node.expression, row)
    if isinstance(node, exp.Or): return evaluate_condition(node.this, row) or evaluate_condition(node.expression, row)
    
    return False

def merge_grouped_results(responses, agg_type, agg_alias):
    """Merge results from workers for GROUP BY queries."""
    grouped_data = {}
    
    for r in responses:
        if r.status_code != 200:
            print(f"DEBUG: Worker failed: {r.status_code} {r.text}")
            continue
            
        data = r.json()
        rows = data.get("rows", [])
        print(f"DEBUG: Worker returned {len(rows)} rows")
        
        for row in rows:
            # Extract aggregate value
            agg_val = row.get(agg_alias)
            if agg_val is None:
                # Fallback: assume 'count' or similar common names
                if 'count' in row: agg_val = row['count']
                elif 'sum' in row: agg_val = row['sum']
                elif 'min' in row: agg_val = row['min']
                elif 'max' in row: agg_val = row['max']
                elif 'avg' in row: agg_val = row['avg']
                else: agg_val = list(row.values())[-1] # Last resort
            
            # Extract group keys
            if agg_alias and agg_alias in row:
                group_items = tuple((k, v) for k, v in row.items() if k != agg_alias)
            else:
                # Fallback: exclude the value we identified as aggregate (risky but necessary if no alias)
                # We try to exclude only the specific key that held the value if possible
                # But here we iterate all items.
                group_items = tuple((k, v) for k, v in row.items() if v != agg_val)
            
            if group_items not in grouped_data:
                grouped_data[group_items] = []
            grouped_data[group_items].append(agg_val)
            
    final_rows = []
    for group_items, values in grouped_data.items():
        if agg_type in ('count', 'sum'):
            res = sum(values)
        elif agg_type == 'min':
            res = min(values)
        elif agg_type == 'max':
            res = max(values)
        elif agg_type == 'avg':
            res = sum(values) / len(values)
        else:
            res = values[0]
            
        new_row = dict(group_items)
        # Add aggregate result
        key_name = agg_alias if agg_alias else 'result'
        new_row[key_name] = res
        final_rows.append(new_row)
        
    return {"rows": final_rows}

def merge_aggregates(responses, agg_type):
    """Legacy merger for scalar aggregates."""
    all_values = []
    for r in responses:
        if r.status_code != 200: continue
        rows = r.json()["rows"]
        if len(rows) > 0:
            first_key = list(rows[0].keys())[0]
            value = rows[0][first_key]
            if value is not None:
                all_values.append(value)
    
    if not all_values: return {"rows": [{"result": 0}]}
    
    if agg_type in ('count', 'sum'): result = sum(all_values)
    elif agg_type == 'avg': result = sum(all_values) / len(all_values)
    elif agg_type == 'min': result = min(all_values)
    elif agg_type == 'max': result = max(all_values)
    else: result = all_values[0]
    
    return {"rows": [{"result": result}]}

@app.post("/query")
async def dispatch(payload: dict):
    start_time = time.time()
    ACTIVE_QUERIES.inc()
    
    try:
        REQ_TOTAL.inc()
        sql = payload.get("sql")
        if not sql:
            raise HTTPException(status_code=400, detail="Missing `sql` field")

        parsed = parse_one(sql)
        
        # Analyze query structure
        analysis = analyze_query(parsed)
        is_agg = analysis['is_agg']
        agg_type = analysis['agg_type']
        group_by = analysis['group_by']
        having = analysis['having']
        
        print(f"DEBUG dispatch: is_agg={is_agg}, agg_type={agg_type}, group_by={group_by}, having={having is not None}")
        
        if is_agg:
            AGG_QUERIES.labels(agg_type=agg_type).inc()
        if group_by:
            GROUP_BY_QUERIES.inc()
        
        # Check if splitting will be dynamic
        where = parsed.args.get("where")
        if not where or not list(where.find_all(exp.Literal)):
            DYNAMIC_SPLITS.inc()
        
        can_split_query = can_split(parsed)
        print(f"DEBUG dispatch: can_split={can_split_query}")
        
        if can_split_query:
            subqueries = await make_subqueries(sql)
        else:
            # Even if we don't split, we need to remove HAVING clause
            # because it must be applied after merging results
            parsed_no_having = parse_one(sql)
            if parsed_no_having.args.get("having"):
                print(f"DEBUG dispatch: Removing HAVING from non-split query")
                parsed_no_having.set("having", None)
            subqueries = [parsed_no_having.sql()]
            
        print(f"DEBUG dispatch: Generated {len(subqueries)} subqueries")
        SPLIT_TOTAL.inc(len(subqueries))
        WORKER_REQUESTS.inc(len(subqueries))

        import asyncio
        async with httpx.AsyncClient() as client:
            tasks = [client.post(WORKER_URL, json={"sql": q}) for q in subqueries]
            responses = await asyncio.gather(*tasks)

        # Merge results
        if group_by:
            result = merge_grouped_results(responses, agg_type, analysis['agg_alias'])
        elif is_agg:
            result = merge_aggregates(responses, agg_type)
        else:
            # Standard row concatenation for non-aggregate queries
            merged = []
            for r in responses:
                if r.status_code != 200:
                    raise HTTPException(status_code=502, detail=f"Worker error: {r.text}")
                merged.extend(r.json()["rows"])
            result = {"rows": merged}
            
        # Apply HAVING clause if present
        if having and result["rows"]:
            print(f"DEBUG dispatch: Applying HAVING filter to {len(result['rows'])} rows")
            print(f"DEBUG dispatch: HAVING node type: {type(having)}")
            print(f"DEBUG dispatch: HAVING node: {having}")
            
            # Extract the actual condition from the Having node
            having_condition = having.this if hasattr(having, 'this') else having
            print(f"DEBUG dispatch: HAVING condition: {having_condition}")
            print(f"DEBUG dispatch: Sample row: {result['rows'][0] if result['rows'] else 'none'}")
            
            filtered_rows = []
            for row in result["rows"]:
                try:
                    passes = evaluate_condition(having_condition, row)
                    print(f"DEBUG dispatch: Row {row} -> passes={passes}")
                    if passes:
                        filtered_rows.append(row)
                except Exception as e:
                    print(f"DEBUG dispatch: Error evaluating row {row}: {e}")
            print(f"DEBUG dispatch: After HAVING filter: {len(filtered_rows)} rows")
            result["rows"] = filtered_rows
        
        # Record latency
        query_type = f"{agg_type}_aggregate" if is_agg else "select"
        QUERY_LATENCY.labels(query_type=query_type).observe(time.time() - start_time)
        
        return result
    finally:
        ACTIVE_QUERIES.dec()

@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = await asyncpg.create_pool(DB_DSN, min_size=2, max_size=10)
    print(f"Database pool created: {DB_DSN}")

@app.on_event("shutdown")
async def shutdown():
    global db_pool
    if db_pool:
        await db_pool.close()
        print("Database pool closed")

if __name__ == "__main__":
    # expose Prometheus metrics on :8002
    start_http_server(8002)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
