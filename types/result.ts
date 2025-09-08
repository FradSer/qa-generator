/**
 * Result type for handling success/error states in a type-safe way
 * Similar to Rust's Result<T, E> or functional programming Either monad
 */
export type Result<T, E> = {
  readonly success: true;
  readonly data: T;
} | {
  readonly success: false;
  readonly error: E;
};

/**
 * Creates a successful result
 */
export function Ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Creates an error result
 */
export function Err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if a Result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if a Result is an error
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Maps a successful result to a new value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  return isOk(result) ? Ok(fn(result.data)) : result;
}

/**
 * Maps an error result to a new error
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isErr(result) ? Err(fn(result.error)) : result;
}

/**
 * Chains results together (flatMap/bind operation)
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.data) : result;
}

/**
 * Returns the data if Ok, otherwise returns the default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.data : defaultValue;
}

/**
 * Returns the data if Ok, otherwise throws the error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw result.error;
}