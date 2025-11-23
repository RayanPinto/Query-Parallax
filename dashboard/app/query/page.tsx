"use client";

import { useState, useEffect } from "react";
import { Play, Clock, Database, ArrowRight, CheckCircle, AlertCircle, Loader2, Zap } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { API_CONFIG } from "@/lib/config";

export default function QueryPage() {
  const [query, setQuery] = useState("SELECT COUNT(*) FROM numbers");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [executionPlan, setExecutionPlan] = useState<any[]>([]);
  const [cpuUsage, setCpuUsage] = useState(12);
  const [workerCount, setWorkerCount] = useState(4);

  // Fetch real worker count
  useEffect(() => {
    const fetchWorkerCount = async () => {
      try {
        const response = await fetch('/api/k8s-status');
        const data = await response.json();
        if (data.totalWorkers) {
          setWorkerCount(data.totalWorkers);
        }
      } catch (error) {
        console.error('Failed to fetch worker count:', error);
      }
    };

    fetchWorkerCount();
    const interval = setInterval(fetchWorkerCount, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const executeQuery = async () => {
    setLoading(true);
    setResult(null);
    setExecutionPlan([]);
    setCpuUsage(85); // Spike during query execution
    
    // Increment metrics in localStorage immediately
    try {
      const saved = localStorage.getItem('dashboardMetrics');
      const currentMetrics = saved ? JSON.parse(saved) : {
        totalRequests: 1245,
        avgLatency: 0.045,
        workerRequests: 4980,
        dynamicSplits: 312,
      };
      
      const updatedMetrics = {
        totalRequests: currentMetrics.totalRequests + 1,
        avgLatency: currentMetrics.avgLatency,
        workerRequests: currentMetrics.workerRequests + workerCount, // Use actual worker count
        dynamicSplits: currentMetrics.dynamicSplits + 1,
      };
      
      localStorage.setItem('dashboardMetrics', JSON.stringify(updatedMetrics));
      console.log('Metrics updated in localStorage:', updatedMetrics);
    } catch (e) {
      console.error('Failed to update metrics:', e);
    }
    
    const startTime = performance.now();
    
    try {
      // Simulate execution steps for visualization
      setExecutionPlan(prev => [...prev, { step: "Parsing SQL", status: "running", time: "0ms" }]);
      await new Promise(r => setTimeout(r, 400));
      setExecutionPlan(prev => {
        const newPlan = [...prev];
        newPlan[0].status = "completed";
        newPlan[0].time = "12ms";
        return [...newPlan, { step: "Analyzing Partition Strategy", status: "running", time: "0ms" }];
      });

      await new Promise(r => setTimeout(r, 600));
      setExecutionPlan(prev => {
        const newPlan = [...prev];
        newPlan[1].status = "completed";
        newPlan[1].time = "45ms";
        return [...newPlan, { step: "Dispatching to 4 Workers", status: "running", time: "0ms" }];
      });

      // Actual API call
      const response = await fetch(`${API_CONFIG.BASE_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query }),
      });
      const data = await response.json();
      
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      setExecutionPlan(prev => {
        const newPlan = [...prev];
        newPlan[2].status = "completed";
        newPlan[2].time = `${(parseFloat(duration) * 0.8).toFixed(0)}ms`;
        return [...newPlan, { step: "Aggregating Results", status: "completed", time: "5ms" }];
      });

      setResult({
        data: data.rows,
        duration: duration,
        rows: data.rows.length,
        status: "success"
      });

      // Notify dashboard of query execution with actual latency
      const eventDetail = { latency: parseFloat(duration) / 1000 };
      console.log('Query page: Dispatching queryExecuted event', eventDetail);
      window.dispatchEvent(new CustomEvent('queryExecuted', {
        detail: eventDetail
      }));

    } catch (error) {
      console.error("Query execution error:", error);
      setResult({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Query failed to execute. Check console for details."
      });
    } finally {
      setLoading(false);
      // CPU usage drops after query completes
      setTimeout(() => setCpuUsage(12 + Math.floor(Math.random() * 8)), 1000);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Query Execution Engine</h1>
        <p className="text-gray-400">Execute distributed queries and visualize the Map-Reduce process</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Editor */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">SQL Editor</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setQuery("SELECT COUNT(*) FROM numbers")}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  COUNT(*)
                </button>
                <button 
                  onClick={() => setQuery("SELECT SUM(id) FROM numbers")}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  SUM(id)
                </button>
                <button 
                  onClick={() => setQuery("SELECT * FROM numbers WHERE id BETWEEN 1 AND 1000")}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  SELECT *
                </button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-32 bg-gray-950 text-gray-100 font-mono text-sm p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-800"
                placeholder="Enter your SQL query here..."
              />
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex justify-end">
              <button
                onClick={executeQuery}
                disabled={loading}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                  ${loading 
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                  }
                `}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "Executing..." : "Run Query"}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {result && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  {result.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  Execution Result
                </h3>
                {result.status === "success" && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {result.duration}ms
                    </span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <Database className="w-4 h-4" /> {result.rows} rows
                    </span>
                  </div>
                )}
              </div>
              <div className="p-0 overflow-x-auto">
                {result.status === "success" ? (
                  <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: 0 }}>
                    {JSON.stringify(result.data, null, 2)}
                  </SyntaxHighlighter>
                ) : (
                  <div className="p-4 text-red-400 bg-red-500/10 border-l-4 border-red-500">
                    {result.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visualization */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Execution Pipeline</h3>
            
            <div className="space-y-8 relative">
              {/* Vertical Line */}
              <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-800" />

              {/* Steps */}
              {[
                { title: "Query Parsing", desc: "SQLGlot AST Analysis", icon: Database },
                { title: "Partitioning", desc: "Dynamic Range Calculation", icon: ArrowRight },
                { title: "Distributed Execution", desc: `${workerCount} Parallel Workers`, icon: Zap },
                { title: "Aggregation", desc: "Map-Reduce Merge", icon: CheckCircle },
              ].map((step, idx) => {
                const isActive = executionPlan.length > idx;
                const isCompleted = executionPlan[idx]?.status === "completed";
                const Icon = step.icon;

                return (
                  <div key={idx} className="relative flex gap-4">
                    <div className={`
                      relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500
                      ${isActive 
                        ? isCompleted ? "bg-green-500 border-green-900 text-white" : "bg-blue-500 border-blue-900 text-white animate-pulse"
                        : "bg-gray-800 border-gray-900 text-gray-500"
                      }
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={`flex-1 pt-1 transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-40"}`}>
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-200">{step.title}</h4>
                        {isActive && (
                          <span className="text-xs font-mono text-blue-400">
                            {executionPlan[idx]?.time || "..."}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{step.desc}</p>
                      
                      {/* Worker Visualization for Step 3 */}
                      {idx === 2 && isActive && (
                        <div className={`mt-3 grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(workerCount, 10)}, 1fr)` }}>
                          {Array.from({ length: Math.min(workerCount, 10) }).map((_, w) => (
                            <div key={w} className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                              <div className="h-full bg-green-500 animate-progress origin-left" style={{ animationDelay: `${w * 0.1}s` }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Status Mini-Card */}
          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-800/30 p-6">
            <h3 className="text-sm font-semibold text-blue-200 mb-2">System Health</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-2xl font-bold text-white">{workerCount} / {workerCount}</span>
              <span className="text-blue-200">Workers Active</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-blue-300">
                <span>CPU Usage</span>
                <span>{cpuUsage}%</span>
              </div>
              <div className="w-full bg-blue-950 rounded-full h-1.5">
                <div 
                  className="bg-blue-400 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${cpuUsage}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
