declare class Worker {
  constructor(specifier: string | URL);
  postMessage(message: any): void;
  terminate(): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

import Logger from '../utils/logger';
import { SecureLogger } from '../utils/secure-logger';

interface WorkerState {
  worker: Worker;
  isAvailable: boolean;
  taskCount: number;
  createdAt: number;
  lastUsed: number;
}

interface PoolMetrics {
  tasksCompleted: number;
  tasksQueued: number;
  averageTaskTime: number;
  workerUtilization: number;
}

/**
 * Enhanced worker pool implementation with performance optimizations and monitoring
 */
export class WorkerPool {
  private workerStates: Map<Worker, WorkerState>;
  private taskQueue: Array<{ task: any; resolve: Function; reject: Function; startTime: number }>;
  private poolId: string;
  private readonly maxWorkers: number;
  private metrics: PoolMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Creates a new worker pool with enhanced performance monitoring
   * @param size - Number of workers in the pool
   * @param workerScript - Path to the worker script
   */
  constructor(size: number, workerScript: string) {
    this.workerStates = new Map();
    this.taskQueue = [];
    this.poolId = Math.random().toString(36).substring(7);
    this.maxWorkers = Math.min(size, 50); // Cap at 50 workers
    this.metrics = {
      tasksCompleted: 0,
      tasksQueued: 0,
      averageTaskTime: 0,
      workerUtilization: 0
    };
    
    SecureLogger.info('Creating optimized worker pool', { size: this.maxWorkers, poolId: this.poolId });
    
    // Initialize workers synchronously in constructor
    this.initializeWorkersSync(workerScript);
    this.startHealthChecking();
  }
  
  /**
   * Initialize workers synchronously in constructor
   */
  private initializeWorkersSync(workerScript: string): void {
    for (let index = 0; index < this.maxWorkers; index++) {
      try {
        this.createWorkerSync(workerScript, index);
      } catch (error) {
        SecureLogger.error('Worker creation failed', { index, error: error instanceof Error ? error.message : 'Unknown error' });
        // Continue creating other workers even if one fails
      }
    }
    Logger.info(`Created worker pool with ${this.workerStates.size} workers`, '👥');
  }
  
  /**
   * Create and configure a single worker synchronously
   */
  private createWorkerSync(workerScript: string, index: number): void {
    const worker = new Worker(workerScript);
    const now = Date.now();
    
    const workerState: WorkerState = {
      worker,
      isAvailable: true,
      taskCount: 0,
      createdAt: now,
      lastUsed: now
    };
    
    worker.onmessage = (e) => {
      this.handleWorkerMessage(worker, e.data);
    };
    
    worker.onerror = (e) => {
      this.handleWorkerError(worker, e, index);
    };
    
    this.workerStates.set(worker, workerState);
    Logger.debug(`Initialized worker ${index + 1}/${this.maxWorkers}`);
  }

  /**
   * Executes a task using an available worker with enhanced performance tracking
   * @param task - Task to be executed
   * @returns Promise that resolves with the task result
   */
  async execute<T>(task: any): Promise<T> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const availableWorker = this.getOptimalWorker();
      
      if (availableWorker) {
        const workerState = this.workerStates.get(availableWorker)!;
        workerState.isAvailable = false;
        workerState.taskCount++;
        workerState.lastUsed = startTime;
        
        availableWorker.postMessage(task);
        this.metrics.tasksQueued--;
        
        const busyCount = Array.from(this.workerStates.values()).filter(s => !s.isAvailable).length;
        Logger.debug(`Assigned task to optimal worker (${busyCount}/${this.workerStates.size} busy)`);
        
        const messageHandler = (e: MessageEvent) => {
          availableWorker.onmessage = null;
          const workerState = this.workerStates.get(availableWorker)!;
          workerState.isAvailable = true;
          
          // Update metrics
          const taskTime = Date.now() - startTime;
          this.metrics.tasksCompleted++;
          this.metrics.averageTaskTime = 
            (this.metrics.averageTaskTime * (this.metrics.tasksCompleted - 1) + taskTime) / 
            this.metrics.tasksCompleted;
          Logger.debug(`Task completed (${this.busyWorkers.size}/${this.workers.length} busy)`);
          resolve(e.data as T);
        };
        
        const errorHandler = (e: ErrorEvent) => {
          worker.onerror = null;
          this.busyWorkers.delete(worker);
          Logger.error(`Worker error: ${e.message}`);
          reject(e);
        };
        
        worker.onmessage = messageHandler;
        worker.onerror = errorHandler;
      } else {
        // Queue the task if no worker is available
        this.metrics.tasksQueued++;
        Logger.debug(`No workers available, queuing task (${this.taskQueue.length + 1} tasks queued)`);
        this.taskQueue.push({ task, resolve, reject, startTime });
        this.processTaskQueue();
      }
    });
  }
  
  /**
   * Get the optimal worker based on task count and availability
   */
  private getOptimalWorker(): Worker | null {
    const availableWorkers = Array.from(this.workerStates.entries())
      .filter(([_, state]) => state.isAvailable)
      .sort(([_, a], [__, b]) => a.taskCount - b.taskCount); // Prefer workers with fewer completed tasks
    
    return availableWorkers.length > 0 ? availableWorkers[0][0] : null;
  }
  
  /**
   * Process queued tasks when workers become available
   */
  private processTaskQueue(): void {
    while (this.taskQueue.length > 0) {
      const optimalWorker = this.getOptimalWorker();
      if (!optimalWorker) break;
      
      const queuedTask = this.taskQueue.shift()!;
      const workerState = this.workerStates.get(optimalWorker)!;
      
      workerState.isAvailable = false;
      workerState.taskCount++;
      workerState.lastUsed = Date.now();
      
      optimalWorker.postMessage(queuedTask.task);
      this.metrics.tasksQueued--;
      
      const messageHandler = (e: MessageEvent) => {
        optimalWorker.onmessage = null;
        workerState.isAvailable = true;
        
        const taskTime = Date.now() - queuedTask.startTime;
        this.metrics.tasksCompleted++;
        this.metrics.averageTaskTime = 
          (this.metrics.averageTaskTime * (this.metrics.tasksCompleted - 1) + taskTime) / 
          this.metrics.tasksCompleted;
        
        queuedTask.resolve(e.data);
        this.processTaskQueue(); // Process next queued task
      };
      
      const errorHandler = (e: ErrorEvent) => {
        optimalWorker.onerror = null;
        workerState.isAvailable = true;
        SecureLogger.error('Queued task worker error', { error: e.message });
        queuedTask.reject(e);
        this.processTaskQueue();
      };
      
      optimalWorker.onmessage = messageHandler;
      optimalWorker.onerror = errorHandler;
    }
  }
  
  /**
   * Start health checking for worker monitoring
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Perform health checks on workers
   */
  private performHealthCheck(): void {
    const now = Date.now();
    let stuckWorkers = 0;
    
    for (const [worker, state] of this.workerStates.entries()) {
      // Check for stuck workers (busy for more than 2 minutes)
      if (!state.isAvailable && (now - state.lastUsed) > 120000) {
        stuckWorkers++;
        SecureLogger.warn('Potentially stuck worker detected', {
          taskCount: state.taskCount,
          lastUsed: state.lastUsed,
          stuckTime: now - state.lastUsed
        });
      }
    }
    
    // Update utilization metrics
    const busyWorkers = Array.from(this.workerStates.values()).filter(s => !s.isAvailable).length;
    this.metrics.workerUtilization = (busyWorkers / this.workerStates.size) * 100;
    
    if (stuckWorkers > 0) {
      SecureLogger.warn('Health check summary', {
        stuckWorkers,
        totalWorkers: this.workerStates.size,
        utilization: this.metrics.workerUtilization,
        queueLength: this.taskQueue.length
      });
    }
  }


  /**
   * Handles messages from workers with enhanced tracking
   * @param worker - Worker that sent the message
   * @param data - Message data
   */
  private handleWorkerMessage(worker: Worker, data: any) {
    const workerState = this.workerStates.get(worker);
    if (workerState) {
      workerState.isAvailable = true;
      this.processTaskQueue();
    }
  }

  /**
   * Handles worker errors with enhanced logging and recovery
   * @param worker - Worker that encountered an error
   * @param error - ErrorEvent
   * @param index - Worker index for logging
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent, index?: number) {
    const workerState = this.workerStates.get(worker);
    if (workerState) {
      SecureLogger.error('Worker error detected', {
        index,
        error: error.message,
        taskCount: workerState.taskCount,
        workerAge: Date.now() - workerState.createdAt
      });
      
      workerState.isAvailable = true;
      this.processTaskQueue();
      
      // Consider recreating worker if it has too many errors
      if (workerState.taskCount > 0) {
        this.considerWorkerRecreation(worker, index);
      }
    }
  }
  
  /**
   * Consider recreating a problematic worker
   */
  private considerWorkerRecreation(worker: Worker, index?: number): void {
    // Simple heuristic: recreate worker if it's had errors
    // In a production system, you might track error rates
    SecureLogger.info('Worker recreation not implemented in this version', { index });
  }
  
  /**
   * Get pool metrics for monitoring
   */
  getMetrics(): PoolMetrics & { poolId: string; workerCount: number; queueLength: number } {
    return {
      ...this.metrics,
      poolId: this.poolId,
      workerCount: this.workerStates.size,
      queueLength: this.taskQueue.length
    };
  }

  /**
   * Terminates all workers in the pool with enhanced cleanup
   */
  terminate() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    SecureLogger.info('Terminating optimized worker pool', {
      workerCount: this.workerStates.size,
      metrics: this.getMetrics()
    });
    
    for (const [worker] of this.workerStates.entries()) {
      try {
        worker.terminate();
      } catch (error) {
        SecureLogger.warn('Worker termination warning', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    this.workerStates.clear();
    this.taskQueue.length = 0;
  }
} 