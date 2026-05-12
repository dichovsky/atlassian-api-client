/** A friendly greeter. */
export class Greeter {
  /** The greeting prefix. */
  prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /** Returns a greeting for the given name. */
  greet(name: string): string {
    return `${this.prefix}, ${name}!`;
  }

  /** The default greeting. */
  get defaultGreeting(): string {
    return this.greet('world');
  }
}

/** Mood values supported by greetings. */
export type Mood = 'happy' | 'neutral' | 'grumpy';

/** A bare function greeting. */
export function greet(name: string, mood: Mood = 'neutral'): string {
  return `${mood}: hi ${name}`;
}

/** Default exported function. */
export default function rootGreet(): string {
  return 'root';
}
