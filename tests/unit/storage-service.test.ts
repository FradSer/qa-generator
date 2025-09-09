import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { StorageService } from '../../services/storage-service';
import type { Question, QAItem } from '../../types/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('StorageService', () => {
  let storageService: StorageService;
  const testDataDir = './test-data';
  const testRegion = 'testregion';

  beforeEach(() => {
    storageService = new StorageService();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadQuestions', () => {
    it('should return empty array for non-existent file', async () => {
      const result = await storageService.loadQuestions(testRegion);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should load existing questions', async () => {
      // Create test data
      const testQuestions: Question[] = [
        { question: 'Test question 1', is_answered: false },
        { question: 'Test question 2', is_answered: true }
      ];

      // Ensure directory exists
      await fs.mkdir(testDataDir, { recursive: true });
      const filePath = path.join(testDataDir, `${testRegion}_q_results.json`);
      await fs.writeFile(filePath, JSON.stringify(testQuestions, null, 2));

      const result = await storageService.loadQuestions(testRegion, testDataDir);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].question).toBe('Test question 1');
      expect(result.data[1].is_answered).toBe(true);
    });

    it('should handle invalid JSON gracefully', async () => {
      // Create invalid JSON file
      await fs.mkdir(testDataDir, { recursive: true });
      const filePath = path.join(testDataDir, `${testRegion}_q_results.json`);
      await fs.writeFile(filePath, 'invalid json content');

      const result = await storageService.loadQuestions(testRegion, testDataDir);
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Failed to parse');
    });
  });

  describe('saveQuestions', () => {
    it('should save questions successfully', async () => {
      const testQuestions: Question[] = [
        { question: 'New question', is_answered: false }
      ];

      const result = await storageService.saveQuestions(testRegion, testQuestions, testDataDir);
      
      expect(result.success).toBe(true);

      // Verify file was created
      const filePath = path.join(testDataDir, `${testRegion}_q_results.json`);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify content
      const content = await fs.readFile(filePath, 'utf-8');
      const savedQuestions = JSON.parse(content);
      expect(savedQuestions).toHaveLength(1);
      expect(savedQuestions[0].question).toBe('New question');
    });

    it('should validate region pinyin', async () => {
      const testQuestions: Question[] = [];
      const result = await storageService.saveQuestions('invalid123', testQuestions);
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('must contain only lowercase letters');
    });

    it('should validate questions array', async () => {
      const invalidQuestions = [{ invalidField: 'test' }] as any;
      const result = await storageService.saveQuestions(testRegion, invalidQuestions);
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid question object');
    });
  });

  describe('loadAnswers', () => {
    it('should return empty array for non-existent file', async () => {
      const result = await storageService.loadAnswers(testRegion);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should load existing answers', async () => {
      const testAnswers: QAItem[] = [
        {
          question: 'Test question',
          content: 'Test answer',
          reasoning_content: 'Test reasoning'
        }
      ];

      await fs.mkdir(testDataDir, { recursive: true });
      const filePath = path.join(testDataDir, `${testRegion}_qa_results.json`);
      await fs.writeFile(filePath, JSON.stringify(testAnswers, null, 2));

      const result = await storageService.loadAnswers(testRegion, testDataDir);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].question).toBe('Test question');
      expect(result.data[0].content).toBe('Test answer');
    });
  });

  describe('updateQuestionStatus', () => {
    it('should update question status based on answers', async () => {
      const testQuestions: Question[] = [
        { question: 'Question 1', is_answered: false },
        { question: 'Question 2', is_answered: false }
      ];

      const testAnswers: QAItem[] = [
        {
          question: 'Question 1',
          content: 'Answer 1',
          reasoning_content: 'Reasoning 1'
        }
      ];

      // Create test files
      await fs.mkdir(testDataDir, { recursive: true });
      const questionsPath = path.join(testDataDir, `${testRegion}_q_results.json`);
      const answersPath = path.join(testDataDir, `${testRegion}_qa_results.json`);
      
      await fs.writeFile(questionsPath, JSON.stringify(testQuestions, null, 2));
      await fs.writeFile(answersPath, JSON.stringify(testAnswers, null, 2));

      const result = await storageService.updateQuestionStatus(testRegion, testDataDir);
      
      expect(result.success).toBe(true);
      expect(result.data.questions).toHaveLength(2);
      expect(result.data.questions[0].is_answered).toBe(true);  // Should be updated
      expect(result.data.questions[1].is_answered).toBe(false); // Should remain false
      expect(result.data.answers).toHaveLength(1);
    });
  });

  describe('getRegionStats', () => {
    it('should calculate region statistics correctly', async () => {
      const testQuestions: Question[] = [
        { question: 'Question 1', is_answered: true },
        { question: 'Question 2', is_answered: false },
        { question: 'Question 3', is_answered: true }
      ];

      const testAnswers: QAItem[] = [
        { question: 'Question 1', content: 'Answer 1', reasoning_content: 'Reasoning 1' },
        { question: 'Question 3', content: 'Answer 3', reasoning_content: 'Reasoning 3' }
      ];

      // Create test files
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(
        path.join(testDataDir, `${testRegion}_q_results.json`),
        JSON.stringify(testQuestions, null, 2)
      );
      await fs.writeFile(
        path.join(testDataDir, `${testRegion}_qa_results.json`),
        JSON.stringify(testAnswers, null, 2)
      );

      const result = await storageService.getRegionStats(testRegion, testDataDir);
      
      expect(result.success).toBe(true);
      expect(result.data.totalQuestions).toBe(3);
      expect(result.data.totalAnswers).toBe(2);
      expect(result.data.answeredQuestions).toBe(2);
      expect(result.data.unansweredQuestions).toBe(1);
      expect(result.data.completionPercentage).toBe(66.67);
    });

    it('should handle no questions scenario', async () => {
      const result = await storageService.getRegionStats(testRegion, testDataDir);
      
      expect(result.success).toBe(true);
      expect(result.data.totalQuestions).toBe(0);
      expect(result.data.completionPercentage).toBe(0);
    });
  });
});