/** Capitalize the first letter of a string (the first Unicode code point, not the first UTF-16 code unit). */
export const capitalize = (s: string): string => {
  const [first = "", ...rest] = s;
  return first.toUpperCase() + rest.join("");
};
