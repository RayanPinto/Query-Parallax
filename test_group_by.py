
import requests
import json
import time

API_URL = "http://127.0.0.1:55290/query"

def run_query(sql):
    print(f"Executing: {sql}")
    try:
        resp = requests.post(API_URL, json={"sql": sql})
        resp.raise_for_status()
        data = resp.json()
        print("Result:")
        print(json.dumps(data, indent=2))
        return data
    except Exception as e:
        print(f"Error: {e}")
        try:
            print(resp.text)
        except:
            pass
        return None

print("--- Test 1: GROUP BY ---")
# Expect: 10 rows (0-9), each with c ~ 10000
run_query("SELECT (id % 10) as m, COUNT(*) as c FROM numbers GROUP BY m")

print("\n--- Test 2: GROUP BY + HAVING (Filter All) ---")
# Expect: 0 rows
run_query("SELECT (id % 10) as m, COUNT(*) as c FROM numbers GROUP BY m HAVING c > 99999")

print("\n--- Test 3: GROUP BY + HAVING (Filter None) ---")
# Expect: 10 rows
run_query("SELECT (id % 10) as m, COUNT(*) as c FROM numbers GROUP BY m HAVING c > 5000")

print("\n--- Test 4: WHERE + GROUP BY + HAVING ---")
# Expect: 10 rows (each count ~5000)
run_query("SELECT (id % 10) as m, COUNT(*) as c FROM numbers WHERE id < 50000 GROUP BY m HAVING c > 2000")
