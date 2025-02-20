declare class Worker {
  constructor(specifier: string | URL);
  postMessage(message: any): void;
  terminate(): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

/**
 * A simple worker pool implementation for managing multiple worker threads
 */
export class WorkerPool {
  private workers: Worker[];
  private taskQueue: (() => Promise<any>)[];
  private busyWorkers: Set<Worker>;

  /**
   * Creates a new worker pool
   * @param size - Number of workers in the pool
   * @param workerScript - Path to the worker script
   */
  constructor(size: number, workerScript: string) {
    this.workers = Array.from({ length: size }, () => new Worker(workerScript));
    this.taskQueue = [];
    this.busyWorkers = new Set();

    // Set up message handlers for each worker
    this.workers.forEach(worker => {
      worker.onmessage = (e) => {
        this.handleWorkerMessage(worker, e.data);
      };
      worker.onerror = (e) => {
        this.handleWorkerError(worker, e);
      };
    });
  }

  /**
   * Executes a task using an available worker
   * @param task - Task to be executed
   * @returns Promise that resolves with the task result
   */
  async execute<T>(task: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      
      if (worker) {
        this.busyWorkers.add(worker);
        worker.postMessage(task);
        
        const messageHandler = (e: MessageEvent) => {
          worker.onmessage = null;
          this.busyWorkers.delete(worker);
          resolve(e.data as T);
        };
        
        const errorHandler = (e: ErrorEvent) => {
          worker.onerror = null;
          this.busyWorkers.delete(worker);
          reject(e);
        };
        
        worker.onmessage = messageHandler;
        worker.onerror = errorHandler;
      } else {
        // Queue the task if no worker is available
        this.taskQueue.push(async () => {
          try {
            const result = await this.execute<T>(task);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      }
    });
  }

  /**
   * Gets an available worker from the pool
   * @returns Available worker or null if none available
   */
  private getAvailableWorker(): Worker | null {
    return this.workers.find(worker => !this.busyWorkers.has(worker)) || null;
  }

  /**
   * Handles messages from workers
   * @param worker - Worker that sent the message
   * @param data - Message data
   */
  private handleWorkerMessage(worker: Worker, data: any) {
    this.busyWorkers.delete(worker);
    
    // Process next task in queue if any
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift();
      nextTask?.();
    }
  }

  /**
   * Handles worker errors
   * @param worker - Worker that encountered an error
   * @param error - ErrorEvent
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent) {
    console.error('Worker error:', error);
    this.busyWorkers.delete(worker);
    
    // Process next task in queue if any
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift();
      nextTask?.();
    }
  }

  /**
   * Terminates all workers in the pool
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
  }
} 