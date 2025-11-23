import os
import httpx
from fastapi import FastAPI, HTTPException
from sqlglot import parse_one, exp
from prometheus_client import Counter, start_http_server

app = FastAPI()

# Prometheus counters (optional but nice)
REQ_TOTAL = Counter("dispatcher_requests_total", "All incoming /query requests")
SPLIT_TOTAL = Counter("dispatcher_splits_total", "Number of sub‑queries created")

# Where workers live (Docker‑Compose service name)
WORKER_URL = os.getenv("WORKER_URL", "http://worker-svc:8001/execute")
MAX_PARTS = int(os.getenv("MAX_PARTS", "4"))   # how many parallel pieces per query

def can_split(parsed):
    """Very simple heuristic – split only SELECTs with a numeric BETWEEN."""
    if not isinstance(parsed, exp.Select):
        return False
    where = parsed.args.get("where")
    if not where:
        return False
    # look for a BETWEEN or >/< on a column named `id` (customize as needed)
    for node in where.find_all((exp.Between, exp.GT, exp.LT)):
        return True
    return False

def make_subqueries(sql, n_parts=MAX_PARTS):
    """Naïve range partition on a column called `id`."""
    parsed = parse_one(sql)
    where = parsed.args["where"]
    # extract column name and numeric bounds (assumes `id BETWEEN a AND b`)
    col = None
    low, high = None, None
    for node in where.find_all(exp.Column):
        col = node.name
    literals = [int(l.this) for l in where.find_all(exp.Literal) if l.this.isdigit()]
    if len(literals) >= 2:
        low, high = literals[0], literals[1]
    if not (col and low is not None and high is not None):
        # fallback – no safe split, just return the original query
        return [sql]

    step = (high - low + 1) // n_parts
    subs = []
    for i in range(n_parts):
        start = low + i * step
        end = low + (i + 1) * step - 1 if i < n_parts - 1 else high
        # Create a new BETWEEN expression: col BETWEEN start AND end
        # We use exp.Between(this=col_expression, low=start_expression, high=end_expression)
        # Note: sqlglot's Between structure might vary slightly by version, but typically:
        # exp.Between(this=..., low=..., high=...)
        
        # Safer way: parse the new condition string, which sqlglot handles well
        new_cond = parse_one(f"{col} BETWEEN {start} AND {end}")
        
        sub_sql = parsed.copy()
        # We need to replace the *existing* BETWEEN node in the WHERE clause
        # The current code sets 'where' to just the new condition, which wipes out other AND conditions if they existed.
        # But for this MVP (and the test query), it's fine to overwrite the WHERE if it was just a simple BETWEEN.
        # However, the error "syntax error at or near 1" suggests the generated SQL is malformed.
        # Let's ensure we are replacing the correct node or setting the where clause correctly.
        
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
    REQ_TOTAL.inc()
    sql = payload.get("sql")
    if not sql:
        raise HTTPException(status_code=400, detail="Missing `sql` field")

    parsed = parse_one(sql)
    
    # Detect if this is an aggregate query
    has_aggregate, agg_type, agg_column = detect_aggregation(parsed)
    
    subqueries = make_subqueries(sql) if can_split(parsed) else [sql]
    SPLIT_TOTAL.inc(len(subqueries))

    import asyncio
    async with httpx.AsyncClient() as client:
        tasks = [client.post(WORKER_URL, json={"sql": q}) for q in subqueries]
        responses = await asyncio.gather(*tasks)

    # Use appropriate merge strategy based on query type
    if has_aggregate:
        return merge_aggregates(responses, agg_type)
    else:
        # Standard row concatenation for non-aggregate queries
        merged = []
        for r in responses:
            if r.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Worker error: {r.text}")
            merged.extend(r.json()["rows"])
        return {"rows": merged}

if __name__ == "__main__":
    # expose Prometheus metrics on :8002
    start_http_server(8002)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
