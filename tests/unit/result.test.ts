import { describe, test, expect } from 'bun:test';
import { Ok, Err, isOk, isErr, map, mapErr, andThen, unwrapOr, unwrap } from '../../types/result';

describe('Result Type', () => {
  describe('Ok constructor', () => {
    test('creates successful result', () => {
      const result = Ok('test data');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test data');
    });
  });

  describe('Err constructor', () => {
    test('creates error result', () => {
      const result = Err('test error');
      expect(result.success).toBe(false);
      expect(result.error).toBe('test error');
    });
  });

  describe('isOk type guard', () => {
    test('returns true for Ok result', () => {
      const result = Ok('success');
      expect(isOk(result)).toBe(true);
    });

    test('returns false for Err result', () => {
      const result = Err('error');
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr type guard', () => {
    test('returns false for Ok result', () => {
      const result = Ok('success');
      expect(isErr(result)).toBe(false);
    });

    test('returns true for Err result', () => {
      const result = Err('error');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('map function', () => {
    test('transforms Ok result', () => {
      const result = Ok(5);
      const mapped = map(result, x => x * 2);
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(10);
      }
    });

    test('passes through Err result', () => {
      const result = Err('original error');
      const mapped = map(result, x => x * 2);
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe('original error');
      }
    });
  });

  describe('mapErr function', () => {
    test('passes through Ok result', () => {
      const result = Ok('success');
      const mapped = mapErr(result, e => `mapped: ${e}`);
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe('success');
      }
    });

    test('transforms Err result', () => {
      const result = Err('original error');
      const mapped = mapErr(result, e => `mapped: ${e}`);
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe('mapped: original error');
      }
    });
  });

  describe('andThen function', () => {
    test('chains Ok results', () => {
      const result = Ok(5);
      const chained = andThen(result, x => Ok(x * 2));
      expect(isOk(chained)).toBe(true);
      if (isOk(chained)) {
        expect(chained.data).toBe(10);
      }
    });

    test('chains Ok to Err', () => {
      const result = Ok(5);
      const chained = andThen(result, x => Err(`Error with ${x}`));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe('Error with 5');
      }
    });

    test('passes through Err result', () => {
      const result = Err('original error');
      const chained = andThen(result, x => Ok(x * 2));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe('original error');
      }
    });
  });

  describe('unwrapOr function', () => {
    test('returns data for Ok result', () => {
      const result = Ok('success');
      const value = unwrapOr(result, 'default');
      expect(value).toBe('success');
    });

    test('returns default for Err result', () => {
      const result = Err('error');
      const value = unwrapOr(result, 'default');
      expect(value).toBe('default');
    });
  });

  describe('unwrap function', () => {
    test('returns data for Ok result', () => {
      const result = Ok('success');
      const value = unwrap(result);
      expect(value).toBe('success');
    });

    test('throws error for Err result', () => {
      const result = Err(new Error('test error'));
      expect(() => unwrap(result)).toThrow('test error');
    });
  });
});