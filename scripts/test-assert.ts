export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals<T>(
  actual: T,
  expected: T,
  message = "Values are not equal.",
): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} Expected ${expected}, got ${actual}.`);
  }
}
