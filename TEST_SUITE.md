# 🧪 Query Test Suite

## Test Your Distributed Query System!

Open **http://localhost:3000/query** and try these queries.
Copy each SQL query into the editor and click "Run Query".

---

## ✅ Test 1: Basic COUNT (Aggregate)
### SQL:
```sql
SELECT COUNT(*) FROM numbers
```

### Expected Result:
```json
{
  "result": 100000
}
```

### What to Watch:
- All 4 pipeline steps should light up
- 4 worker progress bars should animate
- Duration: ~20-50ms

---

## ✅ Test 2: SUM (Aggregate)
### SQL:
```sql
SELECT SUM(id) FROM numbers
```

### Expected Result:
```json
{
  "result": 5000050000
}
```

### Explanation:
Sum of 1+2+3+...+100000 = 100000 * 100001 / 2 = 5,000,050,000

---

## ✅ Test 3: MIN (Aggregate)
### SQL:
```sql
SELECT MIN(id) FROM numbers
```

### Expected Result:
```json
{
  "result": 1
}
```

---

## ✅ Test 4: MAX (Aggregate)
### SQL:
```sql
SELECT MAX(id) FROM numbers
```

### Expected Result:
```json
{
  "result": 100000
}
```

---

## ✅ Test 5: AVG (Aggregate)
### SQL:
```sql
SELECT AVG(id) FROM numbers
```

### Expected Result:
```json
{
  "result": 50000.5
}
```

### Explanation:
Average of 1-100000 = (1 + 100000) / 2 = 50,000.5

---

## ✅ Test 6: COUNT with WHERE (Dynamic Splitting)
### SQL:
```sql
SELECT COUNT(*) FROM numbers WHERE id <= 50000
```

### Expected Result:
```json
{
  "result": 50000
}
```

### What's Special:
- This uses dynamic range detection
- The system automatically figures out the bounds
- Still splits into 4 parallel queries!

---

## ✅ Test 7: SUM with WHERE
### SQL:
```sql
SELECT SUM(id) FROM numbers WHERE id BETWEEN 1 AND 1000
```

### Expected Result:
```json
{
  "result": 500500
}
```

### Explanation:
Sum of 1+2+3+...+1000 = 1000 * 1001 / 2 = 500,500

---

## ✅ Test 8: Small Range SELECT (Row Data)
### SQL:
```sql
SELECT * FROM numbers WHERE id BETWEEN 1 AND 10
```

### Expected Result:
```json
[
  {"id": 1},
  {"id": 2},
  {"id": 3},
  {"id": 4},
  {"id": 5},
  {"id": 6},
  {"id": 7},
  {"id": 8},
  {"id": 9},
  {"id": 10}
]
```

### Note:
You'll see 10 rows of actual data!

---

## ✅ Test 9: Specific Rows
### SQL:
```sql
SELECT * FROM numbers WHERE id BETWEEN 99995 AND 100000
```

### Expected Result:
```json
[
  {"id": 99995},
  {"id": 99996},
  {"id": 99997},
  {"id": 99998},
  {"id": 99999},
  {"id": 100000}
]
```

### What to Check:
- Verify the last ID is exactly 100000
- Pipeline should still show all 4 steps

---

## ✅ Test 10: COUNT Specific Range
### SQL:
```sql
SELECT COUNT(*) FROM numbers WHERE id > 90000
```

### Expected Result:
```json
{
  "result": 10000
}
```

### Explanation:
90001 to 100000 = 10,000 rows

---

## ✅ Test 11: Multiple Aggregates (Advanced)
### SQL:
```sql
SELECT MIN(id) FROM numbers WHERE id > 50000
```

### Expected Result:
```json
{
  "result": 50001
}
```

---

## ✅ Test 12: Edge Case - Single Row Range
### SQL:
```sql
SELECT * FROM numbers WHERE id = 42
```

### Expected Result:
```json
[
  {"id": 42}
]
```

---

## 🎯 Performance Comparison Test

Try these two queries and compare the timing:

### Query A (Small Range):
```sql
SELECT COUNT(*) FROM numbers WHERE id BETWEEN 1 AND 1000
```
**Expected Duration:** ~15-30ms

### Query B (Full Table):
```sql
SELECT COUNT(*) FROM numbers
```
**Expected Duration:** ~20-50ms

### What to Notice:
- Full table scan is only slightly slower!
- This proves the parallelization is working
- Normally, full table would be 100x slower

---

## 🔥 Stress Test (Optional)

If you're feeling adventurous:

### SQL:
```sql
SELECT SUM(id) FROM numbers WHERE id BETWEEN 1 AND 90000
```

### Expected Result:
```json
{
  "result": 4050045000
}
```

### Calculation:
Sum of 1 to 90000 = 90000 * 90001 / 2 = 4,050,045,000

---

## 📊 What to Verify

For EACH query, check:

1. ✅ **Pipeline Visualization:**
   - Step 1 (Parsing) lights up green
   - Step 2 (Partitioning) lights up green
   - Step 3 (Distributed Execution) lights up green + worker bars animate
   - Step 4 (Aggregation) lights up green

2. ✅ **Result Correctness:**
   - Result matches expected value
   - JSON format is correct

3. ✅ **Performance:**
   - Most queries complete in 15-100ms
   - Watch the duration in the result panel

4. ✅ **No Errors:**
   - Green checkmark appears
   - "Execution Result" header shows success

---

## 🐛 If Something Fails

If any query fails, check:

1. **Browser Console** (F12) - look for error messages
2. **Network Tab** - see if the request reached the server
3. **Try refreshing** the page and running the query again
4. **Verify database** by running:
   ```powershell
   .\init_k8s_database.ps1
   ```

---

## 🏆 Challenge Mode

After testing all the above, try writing your own queries!

**Ideas:**
- `SELECT COUNT(*) FROM numbers WHERE id % 2 = 0` (even numbers)
- `SELECT SUM(id) FROM numbers WHERE id < 10000 OR id > 90000`
- `SELECT MAX(id) - MIN(id) FROM numbers`

**Have fun testing your distributed query system!** 🚀
