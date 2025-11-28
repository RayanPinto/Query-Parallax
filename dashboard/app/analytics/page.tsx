"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Database, Users, ShoppingCart, TrendingUp, Activity, Cpu, Clock, CheckCircle } from "lucide-react";

interface QueryResult {
  description: string;
  sql: string;
  rows: any[];
  time: number;
  status: "success" | "error";
}

interface WorkerMetrics {
  name: string;
  status: string;
  cpu: string;
  memory: string;
}

export default function AnalyticsPage() {
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [workerMetrics, setWorkerMetrics] = useState<WorkerMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<QueryResult | null>(null);
  const [stats, setStats] = useState({
    totalQueries: 0,
    successRate: 0,
    avgTime: 0,
    totalRows: 0,
  });

  // Predefined demo queries
  const demoQueries = [
    {
      description: "Employees by Department",
      sql: "SELECT d.dept_name, COUNT(e.emp_id) as employee_count FROM departments d LEFT JOIN employees e ON d.dept_id = e.dept_id GROUP BY d.dept_name ORDER BY employee_count DESC",
    },
    {
      description: "Top 10 Highest Paid Employees",
      sql: "SELECT emp_name, job_title, salary FROM employees ORDER BY salary DESC LIMIT 10",
    },
    {
      description: "Product Sales by Category",
      sql: "SELECT p.category, COUNT(DISTINCT oi.order_id) as order_count, SUM(oi.quantity) as total_quantity FROM products p JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.category ORDER BY total_quantity DESC",
    },
    {
      description: "Order Status Distribution",
      sql: "SELECT status, COUNT(*) as order_count FROM orders GROUP BY status ORDER BY order_count DESC",
    },
    {
      description: "Employees with >3 Orders (HAVING)",
      sql: "SELECT e.emp_name, COUNT(o.order_id) as order_count FROM employees e JOIN orders o ON e.emp_id = o.emp_id GROUP BY e.emp_name HAVING COUNT(o.order_id) > 3 ORDER BY order_count DESC LIMIT 15",
    },
    {
      description: "Department Order Performance",
      sql: "SELECT d.dept_name, COUNT(DISTINCT o.order_id) as total_orders FROM departments d JOIN employees e ON d.dept_id = e.dept_id JOIN orders o ON e.emp_id = o.emp_id GROUP BY d.dept_name ORDER BY total_orders DESC",
    },
  ];

  // Fetch worker metrics
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await fetch('/api/k8s-status');
        const data = await response.json();
        if (data.workers) {
          const formattedWorkers = data.workers.map((w: any) => ({
            name: w.name || `Worker ${w.id}`,
            status: w.status || 'Running',
            cpu: `${w.cpu || 0}m`,
            memory: `${w.memory || 0}Mi`,
          }));
          setWorkerMetrics(formattedWorkers);
        }
      } catch (error) {
        console.error('Failed to fetch workers:', error);
      }
    };

    fetchWorkers();
    const interval = setInterval(fetchWorkers, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load metrics from localStorage and listen for updates
  useEffect(() => {
    const loadMetrics = () => {
      const saved = localStorage.getItem('dashboardMetrics');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setStats(prev => ({
            ...prev,
            totalQueries: parsed.totalRequests || 0,
            // We can't easily reconstruct successRate/avgTime/totalRows from just the dashboard metrics 
            // because dashboardMetrics only stores totalRequests, avgLatency, etc.
            // But we can at least sync the total count and latency.
            avgTime: parsed.avgLatency || 0,
          }));
        } catch (e) {
          console.error('Failed to load metrics:', e);
        }
      }
    };

    loadMetrics();

    const handleQueryEvent = (event: any) => {
      console.log('Analytics: Query event received', event.detail);
      loadMetrics(); // Reload from storage to get latest counts
      
      // Also update local stats if needed
      if (event.detail?.latency) {
        setStats(prev => ({
          ...prev,
          totalQueries: prev.totalQueries + 1,
          avgTime: (prev.avgTime * prev.totalQueries + event.detail.latency) / (prev.totalQueries + 1),
        }));
      }
    };

    window.addEventListener('queryExecuted', handleQueryEvent);
    // Also listen for storage events (cross-tab sync)
    window.addEventListener('storage', loadMetrics);

    return () => {
      window.removeEventListener('queryExecuted', handleQueryEvent);
      window.removeEventListener('storage', loadMetrics);
    };
  }, []);

  // Execute a query
  const executeQuery = async (query: typeof demoQueries[0]) => {
    setLoading(true);
    const startTime = performance.now();
    
    // Update global metrics in localStorage
    try {
      const saved = localStorage.getItem('dashboardMetrics');
      const currentMetrics = saved ? JSON.parse(saved) : {
        totalRequests: 1245,
        avgLatency: 0.045,
        workerRequests: 4980,
        dynamicSplits: 312,
      };
      
      // Estimate worker count (default to 4 if not fetched yet)
      const currentWorkerCount = workerMetrics.length || 4;
      
      const updatedMetrics = {
        totalRequests: currentMetrics.totalRequests + 1,
        avgLatency: currentMetrics.avgLatency, // Will be updated with actual latency later if we wanted
        workerRequests: currentMetrics.workerRequests + currentWorkerCount,
        dynamicSplits: currentMetrics.dynamicSplits + 1,
      };
      
      localStorage.setItem('dashboardMetrics', JSON.stringify(updatedMetrics));
    } catch (e) {
      console.error('Failed to update metrics:', e);
    }

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: query.sql }),
      });

      const data = await response.json();
      const endTime = performance.now();
      const time = (endTime - startTime) / 1000;

      const result: QueryResult = {
        description: query.description,
        sql: query.sql,
        rows: data.rows || [],
        time,
        status: response.ok ? "success" : "error",
      };

      setQueryResults(prev => [result, ...prev]);
      setSelectedQuery(result);

      // Update local stats
      setStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        successRate: ((prev.totalQueries * prev.successRate + (response.ok ? 100 : 0)) / (prev.totalQueries + 1)),
        avgTime: ((prev.totalQueries * prev.avgTime + time) / (prev.totalQueries + 1)),
        totalRows: prev.totalRows + (data.rows?.length || 0),
      }));

      // Dispatch global event
      window.dispatchEvent(new CustomEvent('queryExecuted', {
        detail: { latency: time }
      }));

    } catch (error) {
      console.error('Query failed:', error);
      const endTime = performance.now();
      const result: QueryResult = {
        description: query.description,
        sql: query.sql,
        rows: [],
        time: (endTime - startTime) / 1000,
        status: "error",
      };
      setQueryResults(prev => [result, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  // Execute all demo queries
  const executeAllQueries = async () => {
    for (const query of demoQueries) {
      await executeQuery(query);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between queries
    }
  };

  // Prepare chart data from selected query
  const getChartData = () => {
    if (!selectedQuery || !selectedQuery.rows || selectedQuery.rows.length === 0) return [];
    
    const firstRow = selectedQuery.rows[0];
    const keys = Object.keys(firstRow);
    
    // For simple aggregations
    if (keys.length === 2) {
      return selectedQuery.rows.map(row => ({
        name: String(row[keys[0]]),
        value: Number(row[keys[1]]) || 0,
      }));
    }
    
    return [];
  };

  const chartData = getChartData();
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Business Analytics</h1>
        <p className="text-gray-400">Complex query processing with real-time worker distribution</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Database className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Total Queries</h3>
          <p className="text-3xl font-bold text-white">{stats.totalQueries}</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Success Rate</h3>
          <p className="text-3xl font-bold text-white">{stats.successRate.toFixed(1)}%</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Avg Query Time</h3>
          <p className="text-3xl font-bold text-white">{(stats.avgTime * 1000).toFixed(0)}ms</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Total Rows</h3>
          <p className="text-3xl font-bold text-white">{stats.totalRows.toLocaleString()}</p>
        </div>
      </div>

      {/* Demo Queries & Worker Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demo Queries */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Demo Queries</h3>
            <button
              onClick={executeAllQueries}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Running..." : "Run All"}
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {demoQueries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => executeQuery(query)}
                disabled={loading}
                className="w-full text-left p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{query.description}</span>
                  <Activity className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{query.sql}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Worker Metrics */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Worker Status</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-400">{workerMetrics.length} Active</span>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {workerMetrics.length > 0 ? (
              workerMetrics.map((worker, idx) => (
                <div key={idx} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{worker.name}</span>
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                      {worker.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      <span>{worker.cpu}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>{worker.memory}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No workers detected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Query Results Visualization */}
      {selectedQuery && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white mb-2">{selectedQuery.description}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className={`px-2 py-1 rounded ${selectedQuery.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {selectedQuery.status}
              </span>
              <span>{selectedQuery.rows.length} rows</span>
              <span>{(selectedQuery.time * 1000).toFixed(0)}ms</span>
            </div>
          </div>

          {chartData.length > 0 && chartData.length <= 20 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Bar Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Pie Chart */}
              {chartData.length <= 10 && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {selectedQuery.rows[0] && Object.keys(selectedQuery.rows[0]).map((key) => (
                    <th key={key} className="text-left p-3 text-gray-400 font-semibold">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedQuery.rows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    {Object.values(row).map((value: any, vidx) => (
                      <td key={vidx} className="p-3 text-gray-300">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedQuery.rows.length > 10 && (
              <div className="text-center py-3 text-gray-500 text-sm">
                ... and {selectedQuery.rows.length - 10} more rows
              </div>
            )}
          </div>
        </div>
      )}

      {/* Query History */}
      {queryResults.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold text-white mb-4">Query History</h3>
          <div className="space-y-2">
            {queryResults.slice(0, 5).map((result, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedQuery(result)}
                className="w-full text-left p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{result.description}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${result.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {result.status}
                    </span>
                    <span className="text-xs text-gray-500">{(result.time * 1000).toFixed(0)}ms</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
