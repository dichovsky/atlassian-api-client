/**
 * Format a value as a string.
 *
 * @deprecated Use String() directly.
 * @example format(42) // "42"
 * @since 1.0.0
 */
export function format(value: unknown): string {
  return String(value);
}

/** Delay for the given number of ms. */
export const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const PI = 3.14159;
