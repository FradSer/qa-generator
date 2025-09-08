declare class Worker {
  constructor(specifier: string | URL);
  postMessage(message: any): void;
  terminate(): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

import Logger from '../utils/logger';

/**
 * A simple worker pool implementation for managing multiple worker threads
 */
export class WorkerPool {
  private workers: Worker[];
  private taskQueue: (() => void)[];
  private busyWorkers: Set<Worker>;
  private poolId: string;

  /**
   * Creates a new worker pool
   * @param size - Number of workers in the pool
   * @param workerScript - Path to the worker script
   */
  constructor(size: number, workerScript: string) {
    this.workers = Array.from({ length: size }, () => new Worker(workerScript));
    this.taskQueue = [];
    this.busyWorkers = new Set();
    this.poolId = Math.random().toString(36).substring(7);
    Logger.info(`Created worker pool with ${size} workers`, '👥');

    // Set up message handlers for each worker
    this.workers.forEach((worker, index) => {
      worker.onmessage = (e) => {
        this.handleWorkerMessage(worker, e.data);
      };
      worker.onerror = (e) => {
        this.handleWorkerError(worker, e);
      };
      Logger.debug(`Initialized worker ${index + 1}/${size}`);
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
        Logger.debug(`Assigned task to worker (${this.busyWorkers.size}/${this.workers.length} busy)`);
        
        const messageHandler = (e: MessageEvent) => {
          worker.onmessage = null;
          this.busyWorkers.delete(worker);
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
        Logger.debug(`No workers available, queuing task (${this.taskQueue.length + 1} tasks queued)`);
        this.taskQueue.push(() => this.executeTask<T>(task, resolve, reject));
      }
    });
  }

  /**
   * Executes a task directly without queueing (internal method)
   * @param task - Task to be executed
   * @param resolve - Promise resolve callback
   * @param reject - Promise reject callback
   */
  private executeTask<T>(
    task: any,
    resolve: (value: T) => void,
    reject: (reason?: any) => void
  ): void {
    const worker = this.getAvailableWorker();
    
    if (worker) {
      this.busyWorkers.add(worker);
      worker.postMessage(task);
      Logger.debug(`Assigned queued task to worker (${this.busyWorkers.size}/${this.workers.length} busy)`);
      
      const messageHandler = (e: MessageEvent) => {
        worker.onmessage = null;
        this.busyWorkers.delete(worker);
        Logger.debug(`Queued task completed (${this.busyWorkers.size}/${this.workers.length} busy)`);
        resolve(e.data as T);
      };
      
      const errorHandler = (e: ErrorEvent) => {
        worker.onerror = null;
        this.busyWorkers.delete(worker);
        Logger.error(`Worker error on queued task: ${e.message}`);
        reject(e);
      };
      
      worker.onmessage = messageHandler;
      worker.onerror = errorHandler;
    } else {
      // Worker became unavailable, re-queue the task
      Logger.debug(`Worker unavailable during queue processing, re-queuing task`);
      this.taskQueue.unshift(() => this.executeTask<T>(task, resolve, reject));
    }
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
    this.processNextQueuedTask();
  }

  /**
   * Process the next task in queue if any
   */
  private processNextQueuedTask(): void {
    if (this.taskQueue.length > 0 && this.getAvailableWorker()) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        Logger.debug(`Processing next queued task (${this.taskQueue.length} remaining)`);
        try {
          nextTask();
        } catch (error) {
          Logger.error(`Error executing queued task: ${error}`);
        }
      }
    }
  }

  /**
   * Handles worker errors
   * @param worker - Worker that encountered an error
   * @param error - ErrorEvent
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent) {
    Logger.error(`Worker error: ${error.message}`);
    this.busyWorkers.delete(worker);
    this.processNextQueuedTask();
  }

  /**
   * Terminates all workers in the pool
   */
  terminate() {
    Logger.info(`Terminating worker pool with ${this.workers.length} workers`);
    this.workers.forEach(worker => worker.terminate());
  }
} 