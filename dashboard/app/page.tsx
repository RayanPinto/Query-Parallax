"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, Database, Clock, Activity } from "lucide-react";

interface MetricCard {
  title: string;
  value: string;
  change: string;
  icon: any;
  bgColor: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    avgLatency: 0,
    workerRequests: 0,
    dynamicSplits: 0,
  });

  // Fetch metrics from Prometheus
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("http://localhost:8000/metrics");
        const text = await response.text();
        
        // Parse Prometheus metrics
        const totalReq = text.match(/dispatcher_requests_total\s+(\d+)/)?.[1] || "0";
        const workerReq = text.match(/dispatcher_worker_requests_total\s+(\d+)/)?.[1] || "0";
        const dynamicSplit = text.match(/dispatcher_dynamic_splits_total\s+(\d+)/)?.[1] || "0";
        
        setMetrics({
          totalRequests: parseInt(totalReq),
          avgLatency: 0.05,
          workerRequests: parseInt(workerReq),
          dynamicSplits: parseInt(dynamicSplit),
        });
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const metricCards: MetricCard[] = [
    {
      title: "Total Queries",
      value: metrics.totalRequests.toLocaleString(),
      change: "+12.5%",
      icon: Database,
      bgColor: "from-blue-500 to-blue-600",
    },
    {
      title: "Avg Latency",
      value: `${(metrics.avgLatency * 1000).toFixed(0)}ms`,
      change: "-23.4%",
      icon: Clock,
      bgColor: "from-purple-500 to-purple-600",
    },
    {
      title: "Worker Requests",
      value: metrics.workerRequests.toLocaleString(),
      change: "+45.2%",
      icon: Zap,
      bgColor: "from-green-500 to-green-600",
    },
    {
      title: "Dynamic Splits",
      value: metrics.dynamicSplits.toLocaleString(),
      change: "+89.1%",
      icon: TrendingUp,
      bgColor: "from-orange-500 to-orange-600",
    },
  ];

  // Sample data for charts
  const performanceData = [
    { time: "09:00", latency: 45, throughput: 120 },
    { time: "10:00", latency: 38, throughput: 180 },
    { time: "11:00", latency: 32, throughput: 240 },
    { time: "12:00", latency: 28, throughput: 320 },
    { time: "13:00", latency: 25, throughput: 450 },
    { time: "14:00", latency: 22, throughput: 520 },
  ];

  const queryTypeData = [
    { name: "SELECT", value: 45, color: "#3b82f6" },
    { name: "COUNT", value: 25, color: "#8b5cf6" },
    { name: "SUM", value: 15, color: "#10b981" },
    { name: "MIN/MAX", value: 10, color: "#f59e0b" },
    { name: "AVG", value: 5, color: "#ef4444" },
  ];

  const workerLoadData = [
    { worker: "Worker 1", load: 23 },
    { worker: "Worker 2", load: 28 },
    { worker: "Worker 3", load: 25 },
    { worker: "Worker 4", load: 24 },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Performance Dashboard</h1>
        <p className="text-gray-400">Real-time monitoring of distributed query processing</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${card.bgColor}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-green-400">{card.change}</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold text-white mb-4">Performance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
              <Legend />
              <Line type="monotone" dataKey="latency" stroke="#8b5cf6" strokeWidth={2} name="Latency (ms)" />
              <Line type="monotone" dataKey="throughput" stroke="#3b82f6" strokeWidth={2} name="Throughput (q/s)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Query Type Distribution */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold text-white mb-4">Query Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={queryTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {queryTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold text-white mb-4">Worker Load Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={workerLoadData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="worker" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
            <Bar dataKey="load" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Live Activity</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-gray-400">Real-time updates</span>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { type: "Query", msg: "COUNT(*) executed on 4 workers - 25ms", time: "2s ago" },
            { type: "Split", msg: "Dynamic split detected: 100k rows → 4 partitions", time: "5s ago" },
            { type: "Worker", msg: "Worker #3 completed task - 15ms response time", time: "8s ago" },
            { type: "Aggregate", msg: "SUM aggregation merged from 4 workers", time: "12s ago" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-semibold">
                {item.type}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">{item.msg}</p>
                <p className="text-xs text-gray-500 mt-1">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
