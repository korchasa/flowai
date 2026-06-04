// Silent consumer-callback swallow (Cat 14 / Defensive-Programming Smell).
// Runtime-fatal class per severity-rubric meta-rule: Critical.
export type Handler = (event: { type: string; payload: unknown }) => void;

export function dispatch(handler: Handler, event: { type: string; payload: unknown }): void {
  try {
    handler(event);
  } catch {
    // ignore — bug callsite, swallows every handler error
  }
}
