/** String helpers. */
export function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

export function reverse(value: string): string {
  return [...value].reverse().join("");
}
