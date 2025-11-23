"use client";

import { Server, Cpu, HardDrive, Network, Activity, ShieldCheck, AlertTriangle } from "lucide-react";

export default function StatusPage() {
  const workers = [
    { id: 1, status: "online", cpu: 12, memory: 24, requests: 1450, uptime: "2d 4h" },
    { id: 2, status: "online", cpu: 18, memory: 28, requests: 1320, uptime: "2d 4h" },
    { id: 3, status: "online", cpu: 15, memory: 25, requests: 1510, uptime: "2d 4h" },
    { id: 4, status: "online", cpu: 11, memory: 22, requests: 1280, uptime: "2d 4h" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">System Status</h1>
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
                  <span className="text-gray-200">{worker.cpu}%</span>
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
                  <span className="text-gray-200">{worker.memory}%</span>
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
