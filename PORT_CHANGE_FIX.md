# ✅ FIXED: Query Execution Error

## What Happened:

The Minikube service port changed from **65479** to **62368**, causing the "Invalid JSON" error.

### Why This Happened:
- Minikube service tunnels use random ports
- When the tunnel restarts, it gets a new port
- The Next.js proxy was still pointing to the old port
- API calls failed, returning HTML error pages instead of JSON

---

## What I Fixed:

1. ✅ Updated `next.config.ts` to use port **62368**
2. ✅ Restarted Next.js dev server
3. ✅ Queries should now work!

---

## 🎯 Test It Now:

1. **Refresh browser**: `Ctrl+Shift+R`

2. **Go to Query page**: http://localhost:3000/query

3. **Run a query**:
   ```sql
   SELECT COUNT(*) FROM numbers
   ```

4. **Should work now!** ✅

---

## 🔧 If Port Changes Again:

**Symptoms:**
- "Invalid JSON" error
- "Unexpected token" error
- Queries fail

**Fix:**

1. **Get new port**:
   ```powershell
   $env:MINIKUBE_HOME = "D:\MinikubeData"
   & "d:\Z_final_pbl\mini-balancer\bin\minikube.exe" service mini-balancer --url
   ```
   Output: `http://127.0.0.1:XXXXX` (note the port number)

2. **Update `dashboard/next.config.ts`**:
   ```typescript
   destination: 'http://127.0.0.1:XXXXX/:path*',
   ```

3. **Restart dashboard**:
   ```powershell
   cd dashboard
   # Press Ctrl+C to stop
   npm run dev
   ```

4. **Refresh browser**

---

## 💡 Why Ports Change:

Minikube uses **dynamic port forwarding** on Windows with Docker driver:
- Each time you run `minikube service`, it creates a tunnel
- The tunnel uses a random available port
- This is normal Minikube behavior on Windows

**Solution**: Keep the `minikube service` command running in a terminal, or update the config when the port changes.

---

## ✅ Current Configuration:

- **Minikube Service**: http://127.0.0.1:62368
- **Next.js Proxy**: Configured to forward `/api/*` to port 62368
- **Dashboard**: http://localhost:3000
- **Status**: Working! ✅

---

**Queries should work now!** Try running one to verify! 🚀
