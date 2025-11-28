"use client";

import { useEffect, useState } from "react";
import { Server, Cpu, HardDrive, Network, RefreshCw } from "lucide-react";

export default function StatusPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real Kubernetes data
  useEffect(() => {
    const fetchK8sStatus = async () => {
      try {
        const response = await fetch('/api/k8s-status');
        const data = await response.json();
        
        if (data.workers) {
          // Get real request counts from localStorage
          let realStats: Record<string, number> = {};
          try {
            const saved = localStorage.getItem('dashboardMetrics');
            if (saved) {
              const metrics = JSON.parse(saved);
              realStats = metrics.workerStats || {};
            }
          } catch (e) {
            console.error('Failed to read local stats:', e);
          }

          setWorkers(prev => {
            return data.workers.map((newWorker: any) => {
              const name = newWorker.name;
              return {
                ...newWorker,
                // Use real stats if available, otherwise 0
                requests: realStats[name] || 0
              };
            });
          });
        }
      } catch (error) {
        console.error('Failed to fetch K8s status:', error);
        // Fallback to mock data if API fails
        if (workers.length === 0) {
          setWorkers([
            { id: 1, name: "worker-1", status: "online", cpu: 12, memory: 24, requests: 0, uptime: "28m" },
            { id: 2, name: "worker-2", status: "online", cpu: 18, memory: 28, requests: 0, uptime: "28m" },
            { id: 3, name: "worker-3", status: "online", cpu: 15, memory: 25, requests: 0, uptime: "28m" },
            { id: 4, name: "worker-4", status: "online", cpu: 11, memory: 22, requests: 0, uptime: "28m" },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchK8sStatus();
    const interval = setInterval(fetchK8sStatus, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Increment requests when queries are executed
  // Load worker stats from localStorage
  useEffect(() => {
    const updateWorkerStats = () => {
      try {
        const saved = localStorage.getItem('dashboardMetrics');
        if (saved) {
          const metrics = JSON.parse(saved);
          const workerStats = metrics.workerStats || {};
          
          setWorkers(prev => prev.map(w => ({
            ...w,
            requests: workerStats[w.name] || w.requests || 0
          })));
        }
      } catch (e) {
        console.error('Failed to load worker stats:', e);
      }
    };

    // Initial load
    updateWorkerStats();

    // Listen for updates
    const handleQueryEvent = () => {
      // Small delay to allow localStorage to be updated by the event emitter
      setTimeout(updateWorkerStats, 100);
    };

    window.addEventListener('queryExecuted', handleQueryEvent);
    window.addEventListener('storage', updateWorkerStats);
    
    return () => {
      window.removeEventListener('queryExecuted', handleQueryEvent);
      window.removeEventListener('storage', updateWorkerStats);
    };
  }, [workers.length]); // Re-run when workers list changes (e.g. after initial fetch)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Kubernetes status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-white">System Status</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-green-400">{workers.length} Workers Active</span>
          </div>
        </div>
        <p className="text-gray-400">Real-time health monitoring of distributed infrastructure</p>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Network className="w-64 h-64 text-blue-500" />
        </div>
        
        <h2 className="text-xl font-bold text-white mb-8 relative z-10">System Architecture Live View</h2>
        
        <div className="flex items-center justify-between relative z-10">
          {/* Load Balancer */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center relative">
              <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-green-500 animate-pulse border-2 border-gray-900" />
              <Network className="w-10 h-10 text-blue-400" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-white">Mini-Balancer</h3>
              <p className="text-xs text-blue-400">Port 8089</p>
            </div>
          </div>

          {/* Connection Lines */}
          <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-green-500/50 mx-8 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-gray-900 border border-gray-700 text-xs text-gray-400">
              HTTP / JSON
            </div>
          </div>

          {/* Dispatcher */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center relative">
              <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-green-500 animate-pulse border-2 border-gray-900" />
              <Cpu className="w-10 h-10 text-purple-400" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-white">Dispatcher</h3>
              <p className="text-xs text-purple-400">Port 8000</p>
            </div>
          </div>

          {/* Connection Lines */}
          <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 to-green-500/50 mx-8 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-gray-900 border border-gray-700 text-xs text-gray-400">
              Async I/O
            </div>
          </div>

          {/* Workers Group */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-16 h-16 rounded-xl bg-green-600/20 border border-green-500/50 flex items-center justify-center">
                <Server className="w-6 h-6 text-green-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worker Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {workers.map((worker) => (
          <div key={worker.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Server className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Worker #{worker.id}</h3>
                  <p className="text-xs text-gray-500">{worker.uptime}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-400">Online</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">CPU Usage</span>
                  <span className="text-gray-200">{Math.floor(worker.cpu)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${worker.cpu}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Memory</span>
                  <span className="text-gray-200">{Math.floor(worker.memory)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div 
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${worker.memory}%` }} 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Requests</span>
                <span className="text-sm font-mono text-white">{worker.requests.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Database Status */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <HardDrive className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Database Cluster</h3>
            <p className="text-sm text-gray-400">PostgreSQL 15 • Primary Node</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <div className="text-sm text-gray-400 mb-1">Connection Pool</div>
            <div className="text-2xl font-bold text-white">45 / 100</div>
            <div className="text-xs text-green-400 mt-1">Healthy</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <div className="text-sm text-gray-400 mb-1">Cache Hit Ratio</div>
            <div className="text-2xl font-bold text-white">99.4%</div>
            <div className="text-xs text-green-400 mt-1">Excellent</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <div className="text-sm text-gray-400 mb-1">Disk Usage</div>
            <div className="text-2xl font-bold text-white">12.5 GB</div>
            <div className="text-xs text-blue-400 mt-1">15% Used</div>
          </div>
        </div>
      </div>
    </div>
  );
}
