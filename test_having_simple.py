import requests
import json

API_URL = "http://127.0.0.1:55290/query"

# Test simple HAVING
sql = "SELECT (id % 10) as m, COUNT(*) as c FROM numbers GROUP BY m HAVING c > 5000"
print(f"Testing: {sql}")
resp = requests.post(API_URL, json={"sql": sql})
print(f"Status: {resp.status_code}")
print(f"Response: {json.dumps(resp.json(), indent=2)}")
