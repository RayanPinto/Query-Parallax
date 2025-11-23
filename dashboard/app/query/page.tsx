"use client";

import { useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2, Zap, Database, Clock, Server, Cpu } from "lucide-react";

interface WorkerStat {
  worker: string;
  latency: number; // ms
}

export default function QueryPage() {
  const [sql, setSql] = useState("SELECT COUNT(*) FROM numbers");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStat[]>([]);
  const [duration, setDuration] = useState<number>(0);

  const runQuery = async () => {
    setLoading(true);
    setSteps([]);
    setResult(null);
    setWorkerStats([]);
    setDuration(0);
    const start = performance.now();
    try {
      // Step 1 – Send query to dispatcher
      setSteps((s) => [...s, "📤 Sending query to dispatcher..."]);
      const resp = await axios.post("http://localhost:8089/query", { sql });

      // Simulate extracting per‑worker latency from response headers (for demo)
      // In real implementation you would have the dispatcher return timings.
      const dummyStats: WorkerStat[] = [
        { worker: "Worker 1", latency: Math.random() * 30 + 20 },
        { worker: "Worker 2", latency: Math.random() * 30 + 20 },
        { worker: "Worker 3", latency: Math.random() * 30 + 20 },
        { worker: "Worker 4", latency: Math.random() * 30 + 20 },
      ];

      setSteps((s) => [...s, "🔎 Dispatcher split query into sub‑queries..."]);
      setSteps((s) => [...s, `⚙️ Dispatched to ${dummyStats.length} workers`]);
      setSteps((s) => [...s, "📊 Aggregating results..."]);

      setResult(resp.data);
      setWorkerStats(dummyStats);
    } catch (err) {
      console.error(err);
      setSteps((s) => [...s, "❌ Query failed – check console for details"]); 
    } finally {
      const end = performance.now();
      setDuration(((end - start) / 1000).toFixed(2) as any);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-white">Query Execution Playground</h1>
      <div className="flex gap-4 items-start">
        {/* Input Panel */}
        <div className="flex-1 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <label className="block text-gray-300 mb-2 font-medium">SQL Query</label>
          <textarea
            className="w-full h-32 bg-gray-800 text-gray-100 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
          />
          <button
            onClick={runQuery}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Execute Query
          </button>
        </div>
        {/* Result Panel */}
        <div className="flex-1 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Execution Steps</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>{s}</span>
              </li>
            ))}
          </ul>
          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-200">Result</h3>
              <pre className="bg-gray-800 p-3 rounded text-gray-100 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          {duration > 0 && (
            <p className="mt-4 text-sm text-gray-400">⏱️ Total processing time: {duration}s</p>
          )}
        </div>
      </div>

      {/* Worker Latency Chart */}
      {workerStats.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Worker Latency (ms)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workerStats} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="worker" type="category" stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
              <Bar dataKey="latency" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
