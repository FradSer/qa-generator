import chalk from 'chalk';

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Logger configuration interface
 */
interface LoggerConfig {
  showTimestamp: boolean;
  showLevel: boolean;
  showEmoji: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  showTimestamp: true,
  showLevel: true,
  showEmoji: true
};

/**
 * Emoji mappings for different log types
 */
const EMOJI = {
  DEBUG: '🔍',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  WORKER: '👷',
  PROGRESS: '📊',
  FILE: '📄',
  API: '🌐',
  PROCESS: '⚙️'
};

/**
 * Logger class for standardized logging across the application
 */
export class Logger {
  private static config: LoggerConfig = defaultConfig;
  private static workerId?: string;

  /**
   * Configure logger settings
   */
  static configure(config: Partial<LoggerConfig>) {
    Logger.config = { ...defaultConfig, ...config };
  }

  /**
   * Set worker ID for worker-specific logging
   */
  static setWorkerId(id: number | string) {
    Logger.workerId = String(id);
  }

  /**
   * Format log message with timestamp, level, and context
   */
  private static format(level: LogLevel, message: string, emoji?: string): string {
    const parts: string[] = [];
    
    if (Logger.config.showTimestamp) {
      parts.push(chalk.gray(new Date().toISOString()));
    }
    
    if (Logger.config.showLevel) {
      const levelColor = {
        [LogLevel.DEBUG]: chalk.blue,
        [LogLevel.INFO]: chalk.green,
        [LogLevel.WARN]: chalk.yellow,
        [LogLevel.ERROR]: chalk.red
      }[level];
      parts.push(levelColor(level.padEnd(5)));
    }
    
    if (Logger.workerId) {
      parts.push(chalk.cyan(`[Worker ${Logger.workerId}]`));
    }
    
    if (Logger.config.showEmoji && emoji) {
      parts.push(emoji);
    }
    
    parts.push(message);
    
    return parts.join(' ');
  }

  /**
   * Convert any value to a string representation
   */
  private static stringify(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  /**
   * Format error message with optional error object
   */
  private static formatError(message: unknown, error?: unknown): string {
    const mainMessage = this.stringify(message);
    if (error === undefined) return mainMessage;
    
    const errorStr = error instanceof Error 
      ? error.stack || error.message
      : this.stringify(error);
    
    return `${mainMessage}: ${errorStr}`;
  }

  // Basic logging methods
  static debug(message: unknown, emoji = EMOJI.DEBUG) {
    console.debug(Logger.format(LogLevel.DEBUG, Logger.stringify(message), emoji));
  }

  static info(message: unknown, emoji = EMOJI.INFO) {
    console.info(Logger.format(LogLevel.INFO, Logger.stringify(message), emoji));
  }

  static warn(message: unknown, emoji = EMOJI.WARN) {
    console.warn(Logger.format(LogLevel.WARN, Logger.stringify(message), emoji));
  }

  static error(message: unknown, error?: unknown, emoji = EMOJI.ERROR) {
    console.error(Logger.format(LogLevel.ERROR, Logger.formatError(message, error), emoji));
  }

  // Specialized logging methods
  static success(message: unknown) {
    Logger.info(message, EMOJI.SUCCESS);
  }

  static worker(message: unknown) {
    Logger.info(message, EMOJI.WORKER);
  }

  static progress(current: number, total: number, message?: string) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    Logger.info(`${progressBar} ${percentage}% ${message || ''}`, EMOJI.PROGRESS);
  }

  static file(message: unknown) {
    Logger.info(message, EMOJI.FILE);
  }

  static api(message: unknown) {
    Logger.info(message, EMOJI.API);
  }

  static process(message: unknown) {
    Logger.info(message, EMOJI.PROCESS);
  }

  /**
   * Create a visual progress bar
   */
  private static createProgressBar(percentage: number): string {
    const width = 20;
    const completed = Math.floor((width * percentage) / 100);
    const remaining = width - completed;
    return chalk.green('█'.repeat(completed)) + chalk.gray('░'.repeat(remaining));
  }
}

// Export default instance
export default Logger; 