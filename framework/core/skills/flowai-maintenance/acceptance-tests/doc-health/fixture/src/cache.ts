// Cache implementation backing FR-CACHE.
// See [FR-CACHE](../documents/requirements.md#3.1-fr-cache-local-cache-for-repeated-lookups)
// for the contract.
//
// NOTE: this comment intentionally references [FR-MISSING](../documents/requirements.md#fr-missing-no-such-anchor)
// to demonstrate a broken doc link.

const store = new Map<string, unknown>();

export function get(key: string): unknown | undefined {
  return store.get(key);
}

export function set(key: string, value: unknown): void {
  store.set(key, value);
}
