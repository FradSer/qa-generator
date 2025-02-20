import { readFileSync, writeFileSync } from 'node:fs';
import type { Region } from './config';
import { getRegionFileNames } from './config';
import type { QAItem, Question } from './types';

/**
 * Manages persistent storage operations for questions and answers
 */
export class StorageManager {
  private questionFile: string;
  private qaFile: string;

  constructor(region: Region) {
    const files = getRegionFileNames(region.pinyin);
    this.questionFile = files.questionFile;
    this.qaFile = files.qaFile;
  }

  /**
   * Loads questions from storage
   * @returns Array of questions
   */
  loadQuestions(): Question[] {
    try {
      return JSON.parse(readFileSync(this.questionFile, 'utf-8'));
    } catch (error) {
      console.log('No existing questions found');
      return [];
    }
  }

  /**
   * Loads QA pairs from storage
   * @returns Array of QA pairs
   */
  loadQAPairs(): QAItem[] {
    try {
      return JSON.parse(readFileSync(this.qaFile, 'utf-8'));
    } catch (error) {
      console.log('No existing QA pairs found');
      return [];
    }
  }

  /**
   * Saves questions to storage
   * @param questions - Questions to save
   */
  saveQuestions(questions: Question[]): void {
    writeFileSync(this.questionFile, JSON.stringify(questions, null, 2), 'utf-8');
  }

  /**
   * Saves QA pairs to storage
   * @param qaItems - QA pairs to save
   */
  saveQAPairs(qaItems: QAItem[]): void {
    writeFileSync(this.qaFile, JSON.stringify(qaItems, null, 2), 'utf-8');
  }
} 