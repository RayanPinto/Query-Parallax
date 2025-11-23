import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const binPath = 'd:\\Z_final_pbl\\mini-balancer\\bin\\kubectl.exe';
    
    // Set environment variable for Minikube
    const env = { ...process.env, MINIKUBE_HOME: 'D:\\MinikubeData' };
    
    // Get all pods
    const { stdout: podsOutput } = await execAsync(
      `"${binPath}" get pods -o json`,
      { env }
    );
    
    const podsData = JSON.parse(podsOutput);
    
    // Parse worker pods
    const workers = podsData.items
      .filter((pod: any) => pod.metadata.name.startsWith('worker-'))
      .map((pod: any, index: number) => {
        const isRunning = pod.status.phase === 'Running';
        const uptime = pod.metadata.creationTimestamp 
          ? getUptime(new Date(pod.metadata.creationTimestamp))
          : '0s';
        
        return {
          id: index + 1,
          name: pod.metadata.name,
          status: isRunning ? 'online' : 'offline',
          cpu: Math.floor(Math.random() * 20) + 5, // Mock CPU (Kubernetes metrics need metrics-server setup)
          memory: Math.floor(Math.random() * 15) + 15, // Mock memory
          requests: Math.floor(Math.random() * 500) + 1000, // Mock requests
          uptime: uptime,
        };
      });
    
    // Get HPA status
    let hpaData = null;
    try {
      const { stdout: hpaOutput } = await execAsync(
        `"${binPath}" get hpa worker-hpa -o json`,
        { env }
      );
      hpaData = JSON.parse(hpaOutput);
    } catch (error) {
      console.error('HPA not available:', error);
    }
    
    return NextResponse.json({
      workers,
      totalWorkers: workers.length,
      onlineWorkers: workers.filter((w: any) => w.status === 'online').length,
      hpa: hpaData ? {
        current: hpaData.status?.currentReplicas || 0,
        desired: hpaData.status?.desiredReplicas || 0,
        min: hpaData.spec?.minReplicas || 1,
        max: hpaData.spec?.maxReplicas || 10,
      } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching K8s status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Kubernetes status' },
      { status: 500 }
    );
  }
}

function getUptime(startTime: Date): string {
  const now = new Date();
  const diff = now.getTime() - startTime.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
