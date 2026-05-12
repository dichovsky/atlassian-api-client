/** A function that gets star-re-exported. */
export function starFn(): number {
  return 42;
}

/** A shape that gets star-re-exported. */
export interface StarShape {
  readonly id: string;
  readonly count: number;
}
