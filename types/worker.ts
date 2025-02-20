/**
 * Base interface for worker tasks
 */
export interface WorkerTask {
  maxAttempts: number;
  workerId: number;
}

/**
 * Interface for question generation tasks
 */
export interface QuestionWorkerTask extends WorkerTask {
  regionName: string;
  batchSize: number;
}

/**
 * Interface for answer generation tasks
 */
export interface AnswerWorkerTask extends WorkerTask {
  question: string;
} 