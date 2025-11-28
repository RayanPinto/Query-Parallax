"""
Comprehensive Test Suite for Complex Query Processing
Tests WHERE, GROUP BY, and HAVING clause support
"""

import requests
import json

API_URL = "http://127.0.0.1:55290/query"

def run_query(description, sql, expected_rows=None):
    print(f"\n{'='*70}")
    print(f"Test: {description}")
    print(f"SQL: {sql}")
    print(f"{'='*70}")
    
    try:
        resp = requests.post(API_URL, json={"sql": sql})
        resp.raise_for_status()
        data = resp.json()
        rows = data.get("rows", [])
        
        print(f"[OK] Status: {resp.status_code}")
        print(f"[OK] Rows returned: {len(rows)}")
        
        if expected_rows is not None:
            if len(rows) == expected_rows:
                print(f"[OK] Expected row count: PASS")
            else:
                print(f"[FAIL] Expected {expected_rows} rows, got {len(rows)}: FAIL")
        
        if len(rows) <= 5:
            print(f"[OK] Results:")
            print(json.dumps(rows, indent=2))
        else:
            print(f"[OK] Sample results (first 3):")
            print(json.dumps(rows[:3], indent=2))
            
        return True
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

print("\n" + "="*70)
print("COMPLEX QUERY PROCESSING TEST SUITE")
print("="*70)

# Test 1: Simple WHERE clause
run_query(
    "Simple WHERE clause",
    "SELECT COUNT(*) FROM numbers WHERE id <= 50000",
    expected_rows=1
)

# Test 2: WHERE with multiple conditions
run_query(
    "WHERE with AND condition",
    "SELECT COUNT(*) FROM numbers WHERE id > 1000 AND id <= 2000",
    expected_rows=1
)

# Test 3: GROUP BY without HAVING
run_query(
    "GROUP BY without HAVING",
    "SELECT (id % 10) as digit, COUNT(*) as count FROM numbers GROUP BY digit",
    expected_rows=10
)

# Test 4: GROUP BY with HAVING (filter some)
run_query(
    "GROUP BY with HAVING (filter to 0 rows)",
    "SELECT (id % 10) as digit, COUNT(*) as count FROM numbers GROUP BY digit HAVING count > 15000",
    expected_rows=0
)

# Test 5: GROUP BY with HAVING (keep all)
run_query(
    "GROUP BY with HAVING (keep all rows)",
    "SELECT (id % 10) as digit, COUNT(*) as count FROM numbers GROUP BY digit HAVING count > 5000",
    expected_rows=10
)

# Test 6: WHERE + GROUP BY + HAVING
run_query(
    "WHERE + GROUP BY + HAVING (complex)",
    "SELECT (id % 10) as digit, COUNT(*) as count FROM numbers WHERE id < 50000 GROUP BY digit HAVING count > 2000",
    expected_rows=10
)

# Test 7: WHERE + GROUP BY + HAVING (strict filter)
run_query(
    "WHERE + GROUP BY + HAVING (strict)",
    "SELECT (id % 10) as digit, COUNT(*) as count FROM numbers WHERE id < 50000 GROUP BY digit HAVING count >= 5000",
    expected_rows=9  # Only 9 because id % 10 = 0 has 4999 rows (0, 10, 20, ..., 49990)
)

# Test 8: Aggregation with SUM
run_query(
    "SUM aggregation",
    "SELECT SUM(id) as total FROM numbers WHERE id <= 100",
    expected_rows=1
)

print("\n" + "="*70)
print("TEST SUITE COMPLETE")
print("="*70)
