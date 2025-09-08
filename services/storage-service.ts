import { readFileSync, writeFileSync } from 'node:fs';
import type { Question, QAItem } from '../types/types';
import type { Result } from '../types/result';
import { Ok, Err } from '../types/result';
import { InputValidator, ValidationError } from '../utils/input-validation';
import Logger from '../utils/logger';

/**
 * Secure storage service for managing questions and answers
 */
export class StorageService {
  private readonly baseDir: string;

  constructor(baseDir: string = './data') {
    this.baseDir = baseDir;
  }

  /**
   * Load questions for a region with validation
   */
  async loadQuestions(regionPinyin: string): Promise<Result<Question[], Error>> {
    try {
      const validatedPinyin = InputValidator.validateRegionPinyin(regionPinyin);
      const { questionFile } = InputValidator.validateFilePath(validatedPinyin, this.baseDir);
      
      const content = readFileSync(questionFile, 'utf-8');
      const questions = JSON.parse(content) as Question[];
      
      // Validate structure
      if (!Array.isArray(questions)) {
        return Err(new Error('Questions file does not contain an array'));
      }
      
      const validQuestions = questions.filter(q => 
        typeof q === 'object' && 
        q !== null && 
        typeof q.question === 'string' && 
        q.question.trim().length > 0
      );
      
      if (validQuestions.length !== questions.length) {
        Logger.warn(`Filtered out ${questions.length - validQuestions.length} invalid questions`);
      }
      
      Logger.info(`Loaded ${validQuestions.length} questions for region: ${regionPinyin}`);
      return Ok(validQuestions);
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        Logger.info(`No questions file found for region: ${regionPinyin}, starting fresh`);
        return Ok([]);
      }
      return Err(new Error(`Failed to load questions: ${error}`));
    }
  }

  /**
   * Save questions for a region with validation
   */
  async saveQuestions(regionPinyin: string, questions: Question[]): Promise<Result<void, Error>> {
    try {
      const validatedPinyin = InputValidator.validateRegionPinyin(regionPinyin);
      const { questionFile } = InputValidator.validateFilePath(validatedPinyin, this.baseDir);
      
      // Validate questions structure
      const validQuestions = questions.filter(q => 
        typeof q === 'object' && 
        q !== null && 
        typeof q.question === 'string' && 
        q.question.trim().length > 0
      );
      
      if (validQuestions.length !== questions.length) {
        Logger.warn(`Filtered out ${questions.length - validQuestions.length} invalid questions before saving`);
      }
      
      const content = JSON.stringify(validQuestions, null, 2);
      writeFileSync(questionFile, content, 'utf-8');
      
      Logger.info(`Saved ${validQuestions.length} questions for region: ${regionPinyin}`);
      return Ok(undefined);
      
    } catch (error) {
      return Err(new Error(`Failed to save questions: ${error}`));
    }
  }

  /**
   * Load answers for a region with validation
   */
  async loadAnswers(regionPinyin: string): Promise<Result<QAItem[], Error>> {
    try {
      const validatedPinyin = InputValidator.validateRegionPinyin(regionPinyin);
      const { qaFile } = InputValidator.validateFilePath(validatedPinyin, this.baseDir);
      
      const content = readFileSync(qaFile, 'utf-8');
      const answers = JSON.parse(content) as QAItem[];
      
      // Validate structure
      if (!Array.isArray(answers)) {
        return Err(new Error('Answers file does not contain an array'));
      }
      
      const validAnswers = answers.filter(qa => 
        typeof qa === 'object' && 
        qa !== null && 
        typeof qa.question === 'string' && 
        typeof qa.content === 'string' &&
        qa.question.trim().length > 0 &&
        qa.content.trim().length > 0
      );
      
      if (validAnswers.length !== answers.length) {
        Logger.warn(`Filtered out ${answers.length - validAnswers.length} invalid answers`);
      }
      
      Logger.info(`Loaded ${validAnswers.length} answers for region: ${regionPinyin}`);
      return Ok(validAnswers);
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        Logger.info(`No answers file found for region: ${regionPinyin}, starting fresh`);
        return Ok([]);
      }
      return Err(new Error(`Failed to load answers: ${error}`));
    }
  }

  /**
   * Save answers for a region with validation
   */
  async saveAnswers(regionPinyin: string, answers: QAItem[]): Promise<Result<void, Error>> {
    try {
      const validatedPinyin = InputValidator.validateRegionPinyin(regionPinyin);
      const { qaFile } = InputValidator.validateFilePath(validatedPinyin, this.baseDir);
      
      // Validate answers structure
      const validAnswers = answers.filter(qa => 
        typeof qa === 'object' && 
        qa !== null && 
        typeof qa.question === 'string' && 
        typeof qa.content === 'string' &&
        qa.question.trim().length > 0 &&
        qa.content.trim().length > 0
      );
      
      if (validAnswers.length !== answers.length) {
        Logger.warn(`Filtered out ${answers.length - validAnswers.length} invalid answers before saving`);
      }
      
      const content = JSON.stringify(validAnswers, null, 2);
      writeFileSync(qaFile, content, 'utf-8');
      
      Logger.info(`Saved ${validAnswers.length} answers for region: ${regionPinyin}`);
      return Ok(undefined);
      
    } catch (error) {
      return Err(new Error(`Failed to save answers: ${error}`));
    }
  }

  /**
   * Update question status based on existing answers
   */
  async updateQuestionStatus(regionPinyin: string): Promise<Result<{ questions: Question[]; answers: QAItem[] }, Error>> {
    try {
      const questionsResult = await this.loadQuestions(regionPinyin);
      const answersResult = await this.loadAnswers(regionPinyin);
      
      if (!questionsResult.success) return questionsResult;
      if (!answersResult.success) return answersResult;
      
      const questions = questionsResult.data;
      const answers = answersResult.data;
      
      // Create set for O(1) lookup
      const answeredQuestions = new Set(answers.map(item => item.question));
      
      // Update question status
      questions.forEach(q => {
        q.is_answered = answeredQuestions.has(q.question);
      });
      
      // Save updated questions
      const saveResult = await this.saveQuestions(regionPinyin, questions);
      if (!saveResult.success) {
        Logger.error(`Failed to save updated question status: ${saveResult.error.message}`);
      }
      
      const answeredCount = questions.filter(q => q.is_answered).length;
      Logger.info(`Updated question status: ${answeredCount}/${questions.length} answered`);
      
      return Ok({ questions, answers });
      
    } catch (error) {
      return Err(new Error(`Failed to update question status: ${error}`));
    }
  }

  /**
   * Get statistics for a region
   */
  async getRegionStats(regionPinyin: string): Promise<Result<{
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
    totalAnswers: number;
    completionRate: number;
  }, Error>> {
    try {
      const statusResult = await this.updateQuestionStatus(regionPinyin);
      if (!statusResult.success) return statusResult;
      
      const { questions, answers } = statusResult.data;
      
      const totalQuestions = questions.length;
      const answeredQuestions = questions.filter(q => q.is_answered).length;
      const unansweredQuestions = totalQuestions - answeredQuestions;
      const totalAnswers = answers.length;
      const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
      
      return Ok({
        totalQuestions,
        answeredQuestions,
        unansweredQuestions,
        totalAnswers,
        completionRate
      });
      
    } catch (error) {
      return Err(new Error(`Failed to get region stats: ${error}`));
    }
  }
}