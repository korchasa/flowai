// Critical-tier (1 of expected 1-2): silent consumer-callback swallow.
export type Handler = (event: { type: string; payload: unknown }) => void;

export function dispatch(handler: Handler, event: { type: string; payload: unknown }): void {
  try {
    handler(event);
  } catch {
    // swallowed
  }
}
