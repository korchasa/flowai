// Assertions are local on purpose: a `jsr:` import trips the sandbox's
// `deno lint` (no-import-prefix), and the review would then stop on the
// fixture instead of on the primitive under test.
function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertThrows(fn: () => unknown, messageIncludes?: string): void {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e ?? new Error("thrown nullish value");
  }
  if (error === undefined) throw new Error("Expected function to throw");
  const message = error instanceof Error ? error.message : String(error);
  if (messageIncludes !== undefined && !message.includes(messageIncludes)) {
    throw new Error(`Expected "${messageIncludes}" in error, got "${message}"`);
  }
}
import { DataProcessor } from "./processor.ts";
import type { Schema } from "./processor.ts";

const schema: Schema = {
  fields: {
    name: { type: "string" },
    age: { type: "number", min: 0, max: 150 },
    email: { type: "string", pattern: "^[^@]+@[^@]+$" },
    active: { type: "boolean" },
    joined: { type: "date" },
  },
  required: ["name", "age"],
};

const processor = new DataProcessor({ schema });

Deno.test("validate: valid record passes", () => {
  const result = processor.validate({ name: "Alice", age: 30 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validate: missing required field", () => {
  const result = processor.validate({ age: 30 });
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].field, "name");
});

Deno.test("validate: type mismatch", () => {
  const result = processor.validate({ name: 123, age: 30 });
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].field, "name");
});

Deno.test("validate: number below min", () => {
  const result = processor.validate({ name: "Alice", age: -1 });
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].field, "age");
});

Deno.test("validate: number above max", () => {
  const result = processor.validate({ name: "Alice", age: 200 });
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].field, "age");
});

Deno.test("validate: pattern mismatch", () => {
  const result = processor.validate({
    name: "Alice",
    age: 30,
    email: "invalid",
  });
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].field, "email");
});

Deno.test("validate: pattern match", () => {
  const result = processor.validate({
    name: "Alice",
    age: 30,
    email: "a@b.com",
  });
  assertEquals(result.valid, true);
});

Deno.test("transform: trims strings and converts dates", () => {
  const results = processor.transform([
    { name: "  Alice  ", age: 30, joined: "2024-01-15" },
  ]);
  assertEquals(results[0].name, "Alice");
  assertEquals(results[0].joined, "2024-01-15T00:00:00.000Z");
});

Deno.test("transform: strict mode throws on invalid", () => {
  const strict = new DataProcessor({ schema, strict: true });
  assertThrows(() => strict.transform([{ age: 30 }]));
});

Deno.test("transform: non-strict mode skips validation", () => {
  const lenient = new DataProcessor({ schema, strict: false });
  const results = lenient.transform([{ age: 30 }]);
  assertEquals(results.length, 1);
});

Deno.test("validate: rejects a non-ISO date string", () => {
  const result = processor.validate({
    name: "Alice",
    age: 30,
    joined: "December 17, 1995",
  });
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].field, "joined");
});

Deno.test("validate: accepts an ISO date string", () => {
  const result = processor.validate({
    name: "Alice",
    age: 30,
    joined: "2026-01-31",
  });
  assertEquals(result.valid, true);
});

Deno.test("validate: rejects calendar dates that do not exist", () => {
  for (
    const joined of [
      "2026-02-30",
      "2026-04-31",
      "2025-02-29",
      "1900-02-29",
      "2026-13-01",
    ]
  ) {
    const result = processor.validate({ name: "Alice", age: 30, joined });
    assertEquals(result.valid, false);
  }
});

Deno.test("validate: accepts a leap day", () => {
  const result = processor.validate({
    name: "Alice",
    age: 30,
    joined: "2024-02-29",
  });
  assertEquals(result.valid, true);
  assertEquals(
    processor.validate({ name: "Alice", age: 30, joined: "2000-02-29" }).valid,
    true,
  );
});

Deno.test("validate: rejects out-of-range and offset-less times", () => {
  for (
    const joined of [
      "2026-01-31T24:00Z",
      "2026-01-31T10:60Z",
      "2026-01-31T10:00:60Z",
      "2026-01-31T10:00",
      "2026-01-31T10:00+24:00",
    ]
  ) {
    const result = processor.validate({ name: "Alice", age: 30, joined });
    assertEquals(result.valid, false);
  }
});

Deno.test("transform: date-time with offset converts to UTC", () => {
  const results = processor.transform([
    { name: "Alice", age: 30, joined: "2026-01-31T10:00+02:00" },
  ]);
  assertEquals(results[0].joined, "2026-01-31T08:00:00.000Z");
});

Deno.test("validate: rejects a non-finite number", () => {
  const result = processor.validate({ name: "Alice", age: NaN });
  assertEquals(result.valid, false);
  assertEquals(result.errors[0].field, "age");
});

Deno.test("constructor: rejects a batch size that would not advance", () => {
  for (const batchSize of [0, -1, 1.5]) {
    assertThrows(() => new DataProcessor({ schema, batchSize }));
  }
});

Deno.test("constructor: rejects an invalid pattern", () => {
  assertThrows(() =>
    new DataProcessor({
      schema: { fields: { a: { type: "string", pattern: "(" } } },
    })
  );
});

Deno.test("transform: processes every record across batches", () => {
  const small = new DataProcessor({ schema, batchSize: 2 });
  const records = [1, 2, 3, 4, 5].map((n) => ({ name: `u${n}`, age: n }));
  assertEquals(small.transform(records).length, 5);
});

Deno.test("toJson: serializes transformed records", () => {
  const json = processor.toJson(
    processor.transform([{ name: " Alice ", age: 30, joined: "2024-01-15" }]),
  );
  const parsed = JSON.parse(json);
  assertEquals(parsed.length, 1);
  assertEquals(parsed[0].name, "Alice");
  assertEquals(parsed[0].joined, "2024-01-15T00:00:00.000Z");
});

Deno.test("transform: non-strict mode still rejects an invalid date", () => {
  const lenient = new DataProcessor({ schema, strict: false });
  assertThrows(
    () => lenient.transform([{ name: "A", age: 1, joined: "nope" }]),
    "invalid date in field joined",
  );
});

Deno.test("transform: strict mode validates the trimmed value it returns", () => {
  const p = new DataProcessor({
    schema: { fields: { code: { type: "string", pattern: "^[A-Z]{3}$" } } },
  });
  assertEquals(p.transform([{ code: " ABC " }])[0].code, "ABC");
  assertThrows(() => p.transform([{ code: " AB" }]));
});

Deno.test("validate: ignores names inherited from Object.prototype", () => {
  const p = new DataProcessor({
    schema: { fields: { constructor: { type: "string" as const } } },
  });
  assertEquals(p.validate({}).valid, true);
  assertEquals(Object.hasOwn(p.transform([{}])[0], "constructor"), false);
});

Deno.test("constructor: rejects a required name missing from fields", () => {
  assertThrows(() =>
    new DataProcessor({ schema: { fields: {}, required: ["id"] } })
  );
});

Deno.test("transform: rejects a record that is not an object", () => {
  const lenient = new DataProcessor({ schema, strict: false });
  for (const bad of [null, 5, "str", []]) {
    assertThrows(
      () => lenient.transform([bad as unknown as Record<string, unknown>]),
      "is not an object",
    );
  }
});
