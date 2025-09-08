import { describe, test, expect } from 'bun:test';
import { CLIParser, type CLIArguments } from '../../utils/cli-utils';
import { ValidationError } from '../../utils/input-validation';

describe('CLI Utils', () => {
  describe('CLIParser', () => {
    describe('parse method', () => {
      test('parses basic arguments', () => {
        const parser = new CLIParser(['--mode', 'questions', '--region', 'chibi']);
        const result = parser.parse();
        
        expect(result.mode).toBe('questions');
        expect(result.region).toBe('chibi');
      });

      test('parses short flags', () => {
        const parser = new CLIParser(['-m', 'answers', '-r', 'changzhou']);
        const result = parser.parse();
        
        expect(result.mode).toBe('answers');
        expect(result.region).toBe('changzhou');
      });

      test('parses boolean flags', () => {
        const parser = new CLIParser(['--help', '--version', '--interactive']);
        const result = parser.parse();
        
        expect(result.help).toBe(true);
        expect(result.version).toBe(true);
        expect(result.interactive).toBe(true);
      });

      test('parses mixed arguments', () => {
        const parser = new CLIParser([
          '--mode', 'all', 
          '-c', '500', 
          '--workers', '10',
          '--interactive'
        ]);
        const result = parser.parse();
        
        expect(result.mode).toBe('all');
        expect(result.count).toBe('500');
        expect(result.workers).toBe('10');
        expect(result.interactive).toBe(true);
      });

      test('handles max-q-per-worker argument', () => {
        const parser = new CLIParser(['--max-q-per-worker', '100']);
        const result = parser.parse();
        
        expect(result['max-q-per-worker']).toBe('100');
      });

      test('throws error for missing values', () => {
        const parser = new CLIParser(['--mode']);
        expect(() => parser.parse()).toThrow(ValidationError);
      });

      test('throws error for flag followed by another flag', () => {
        const parser = new CLIParser(['--mode', '--region', 'chibi']);
        expect(() => parser.parse()).toThrow(ValidationError);
      });
    });

    describe('validateAndConvert method', () => {
      test('validates and converts valid arguments', () => {
        const args: CLIArguments = {
          mode: 'questions',
          region: 'chibi',
          count: '100',
          workers: '5'
        };
        
        const result = CLIParser.validateAndConvert(args);
        
        expect(result.mode).toBe('questions');
        expect(result.region.pinyin).toBe('chibi');
        expect(result.count).toBe(100);
        expect(result.workers).toBe(5);
      });

      test('applies default values', () => {
        const args: CLIArguments = {
          mode: 'questions',
          region: 'chibi'
        };
        
        const result = CLIParser.validateAndConvert(args);
        
        expect(result.count).toBe(1000); // default
        expect(result.workers).toBe(5); // default
        expect(result.attempts).toBe(3); // default
      });

      test('validates numeric ranges', () => {
        const args: CLIArguments = {
          mode: 'questions',
          region: 'chibi',
          count: '15000' // above max
        };
        
        expect(() => CLIParser.validateAndConvert(args)).toThrow(ValidationError);
      });

      test('throws error for missing required arguments', () => {
        const args: CLIArguments = {
          mode: 'questions'
          // missing region
        };
        
        expect(() => CLIParser.validateAndConvert(args)).toThrow(ValidationError);
      });

      test('validates mode values', () => {
        const args: CLIArguments = {
          mode: 'invalid' as any,
          region: 'chibi'
        };
        
        expect(() => CLIParser.validateAndConvert(args)).toThrow(ValidationError);
      });

      test('validates provider values', () => {
        const args: CLIArguments = {
          mode: 'questions',
          region: 'chibi',
          provider: 'invalid-provider'
        };
        
        expect(() => CLIParser.validateAndConvert(args)).toThrow(ValidationError);
      });

      test('handles invalid numeric arguments', () => {
        const args: CLIArguments = {
          mode: 'questions',
          region: 'chibi',
          count: 'not-a-number'
        };
        
        expect(() => CLIParser.validateAndConvert(args)).toThrow(ValidationError);
      });

      test('validates region existence', () => {
        const args: CLIArguments = {
          mode: 'questions',
          region: 'nonexistent-region'
        };
        
        expect(() => CLIParser.validateAndConvert(args)).toThrow(ValidationError);
      });

      test('uses environment variable for provider default', () => {
        const originalEnv = process.env.AI_PROVIDER;
        process.env.AI_PROVIDER = 'groq';
        
        const args: CLIArguments = {
          mode: 'questions',
          region: 'chibi'
        };
        
        const result = CLIParser.validateAndConvert(args);
        expect(result.provider).toBe('groq');
        
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.AI_PROVIDER = originalEnv;
        } else {
          delete process.env.AI_PROVIDER;
        }
      });

      test('validates max-q-per-worker parameter', () => {
        const args: CLIArguments = {
          mode: 'questions',
          region: 'chibi',
          'max-q-per-worker': '1000' // above max
        };
        
        expect(() => CLIParser.validateAndConvert(args)).toThrow(ValidationError);
      });
    });
  });
});