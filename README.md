# Adaptive Task Dispatcher for Dynamic Query Parallelization

## Quick Start Guide

### Prerequisites
- Docker Desktop running
- Minikube installed
- Node.js installed

### Starting the System

```powershell
# Set Minikube home
$env:MINIKUBE_HOME = "D:\MinikubeData"

# Start Minikube
cd d:\Z_final_pbl\mini-balancer
& ".\bin\minikube.exe" start --driver=docker

# Deploy to Kubernetes
.\deploy_k8s.ps1

# Initialize database (CRITICAL: Run this every time you restart Minikube!)
.\init_k8s_database.ps1

# Get service URL (keep this terminal open)
& ".\bin\minikube.exe" service mini-balancer --url

# Start dashboard (new terminal)
cd dashboard
npm run dev
```

### Accessing the System
- **Dashboard**: http://localhost:3000
- **API**: http://127.0.0.1:[PORT_FROM_MINIKUBE]

### Running Queries
1. Go to http://localhost:3000/query
2. Enter SQL query (e.g., `SELECT COUNT(*) FROM numbers`)
3. Click "Run Query"
4. View results and execution pipeline

### Viewing System Status
- **Performance Dashboard**: http://localhost:3000
- **System Status**: http://localhost:3000/status
- Shows real-time worker count, CPU, memory metrics

### Scaling Workers
```powershell
# Scale up
& ".\bin\kubectl.exe" scale deployment worker --replicas=10

# Scale down
& ".\bin\kubectl.exe" scale deployment worker --replicas=4
```

### Stopping the System
```powershell
# Stop Minikube
& ".\bin\minikube.exe" stop
```

---

## Architecture Overview

```
Client → Mini-Balancer → Dispatcher → Workers (1-10) → PostgreSQL
                                    ↓
                                Dashboard (Next.js)
```

### Components
- **Mini-Balancer**: Load balancer and API gateway
- **Dispatcher**: Query parser and task distributor
- **Workers**: Parallel query executors (auto-scaling)
- **PostgreSQL**: Database with 100K test rows
- **Dashboard**: Real-time monitoring UI

### Technology Stack
- **Backend**: Python (FastAPI), Go
- **Database**: PostgreSQL
- **Orchestration**: Kubernetes, Docker
- **Frontend**: Next.js, React, TypeScript
- **Monitoring**: Kubernetes metrics, HPA

---

## Key Features

1. **Distributed Query Processing**: Splits queries across multiple workers
2. **Auto-Scaling**: HPA scales workers based on load (1-10 pods)
3. **Real-Time Dashboard**: Live monitoring of system health
4. **Query Visualization**: 4-step execution pipeline
5. **Production-Ready**: Kubernetes deployment with monitoring

---

## Performance Metrics
- **Query Speedup**: 4-10x faster than single-threaded
- **Latency**: 30-50ms for 100K row COUNT queries
- **Scalability**: 1 to 10 workers dynamically
- **Database**: 100,000 test rows
