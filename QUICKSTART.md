# Quick Start Guide

## 🎯 How to Access Everything

### 1. Dashboard (Visual Interface)
**URL**: http://localhost:3000

**Pages:**
- `/` - Main dashboard with charts and metrics
- `/query` - Interactive SQL query editor  
- `/status` - System architecture and worker health

### 2. API Endpoint (Kubernetes Service)

**⚠️ IMPORTANT**: You must use the `/query` endpoint, not just the base URL!

**Correct URL**: http://127.0.0.1:65479/query

**Test it:**
```powershell
# PowerShell
Invoke-RestMethod -Uri "http://127.0.0.1:65479/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT COUNT(*) FROM numbers"}'

# Or using curl
curl -X POST http://127.0.0.1:65479/query -H "Content-Type: application/json" -d "{\"sql\":\"SELECT COUNT(*) FROM numbers\"}"
```

**Example queries:**
```powershell
# Count all rows
Invoke-RestMethod -Uri "http://127.0.0.1:65479/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT COUNT(*) FROM numbers"}'

# Sum aggregation
Invoke-RestMethod -Uri "http://127.0.0.1:65479/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT SUM(id) FROM numbers"}'

# Select specific range
Invoke-RestMethod -Uri "http://127.0.0.1:65479/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT * FROM numbers WHERE id BETWEEN 1 AND 100"}'
```

---

## 🔍 Why "Page Not Found" at Root?

The mini-balancer is configured to route **only `/query` requests** to the dispatcher. This is intentional - it's a specific API endpoint, not a web server with a homepage.

**This will work:** ✅ `http://127.0.0.1:65479/query`  
**This won't work:** ❌ `http://127.0.0.1:65479` (404 Not Found)

---

## 🚀 Quick Demo

1. **Open the Dashboard**: http://localhost:3000
2. **Go to Query page**: Click "Query Execution" in sidebar
3. **Run a test query**: Click "RUN QUERY"
4. **Watch the visualization**: See the distributed execution in real-time!

---

## ✅ System Health Check

Run this to verify everything is working:

```powershell
# 1. Check Kubernetes pods
.\get_pods.ps1

# 2. Test the API
Invoke-RestMethod -Uri "http://127.0.0.1:65479/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT 1 as test"}'

# 3. Open dashboard
Start-Process "http://localhost:3000"
```

All three should work! If any fail, check SUCCESS.md for troubleshooting.

---

**Everything is working correctly!** The "page not found" at the root URL is expected behavior. Always use `/query` endpoint. 🎉
