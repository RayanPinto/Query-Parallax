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
    table_name = extract_table_name(parsed)
    
    if not table_name:
        return [sql]
    
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
            return [sql]
    
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
        
        subs.append(sub_sql.sql())
    return subs

def detect_aggregation(parsed):
    """
    Detect if query contains aggregate functions.
    Returns: (has_aggregate, agg_type, agg_column)
    agg_type can be: 'count', 'sum', 'avg', 'min', 'max', or None
    """
    if not isinstance(parsed, exp.Select):
        return (False, None, None)
    
    # Check the SELECT expressions for aggregate functions
    for expr in parsed.find_all((exp.Count, exp.Sum, exp.Avg, exp.Min, exp.Max)):
        if isinstance(expr, exp.Count):
            return (True, 'count', None)
        elif isinstance(expr, exp.Sum):
            # Extract the column being summed
            col = list(expr.find_all(exp.Column))
            col_name = col[0].name if col else None
            return (True, 'sum', col_name)
        elif isinstance(expr, exp.Avg):
            col = list(expr.find_all(exp.Column))
            col_name = col[0].name if col else None
            return (True, 'avg', col_name)
        elif isinstance(expr, exp.Min):
            col = list(expr.find_all(exp.Column))
            col_name = col[0].name if col else None
            return (True, 'min', col_name)
        elif isinstance(expr, exp.Max):
            col = list(expr.find_all(exp.Column))
            col_name = col[0].name if col else None
            return (True, 'max', col_name)
    
    return (False, None, None)

def merge_aggregates(responses, agg_type):
    """
    Reduce phase: merge partial aggregate results from workers.
    """
    all_values = []
    
    for r in responses:
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Worker error: {r.text}")
        rows = r.json()["rows"]
        
        # Each worker should return exactly one row with the partial aggregate
        if len(rows) > 0:
            # Get the first column value (the aggregate result)
            first_key = list(rows[0].keys())[0]
            value = rows[0][first_key]
            
            # Handle None values (e.g., COUNT on empty set)
            if value is not None:
                all_values.append(value)
    
    if not all_values:
        return {"rows": [{"result": 0}]}
    
    # Perform the final reduction based on aggregate type
    if agg_type == 'count' or agg_type == 'sum':
        result = sum(all_values)
    elif agg_type == 'avg':
        # For AVG, workers should return (sum, count) pairs
        # For simplicity in MVP, we'll just average the averages (not perfectly accurate)
        # TODO: Improve this by having workers return sum and count separately
        result = sum(all_values) / len(all_values)
    elif agg_type == 'min':
        result = min(all_values)
    elif agg_type == 'max':
        result = max(all_values)
    else:
        result = all_values[0]
    
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
        
        # Detect if this is an aggregate query
        has_aggregate, agg_type, agg_column = detect_aggregation(parsed)
        
        if has_aggregate:
            AGG_QUERIES.labels(agg_type=agg_type).inc()
        
        # Check if splitting will be dynamic
        where = parsed.args.get("where")
        if not where or not list(where.find_all(exp.Literal)):
            DYNAMIC_SPLITS.inc()
        
        subqueries = await make_subqueries(sql) if can_split(parsed) else [sql]
        SPLIT_TOTAL.inc(len(subqueries))
        WORKER_REQUESTS.inc(len(subqueries))

        import asyncio
        async with httpx.AsyncClient() as client:
            tasks = [client.post(WORKER_URL, json={"sql": q}) for q in subqueries]
            responses = await asyncio.gather(*tasks)

        # Use appropriate merge strategy based on query type
        if has_aggregate:
            result = merge_aggregates(responses, agg_type)
        else:
            # Standard row concatenation for non-aggregate queries
            merged = []
            for r in responses:
                if r.status_code != 200:
                    raise HTTPException(status_code=502, detail=f"Worker error: {r.text}")
                merged.extend(r.json()["rows"])
            result = {"rows": merged}
        
        # Record latency
        query_type = f"{agg_type}_aggregate" if has_aggregate else "select"
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
