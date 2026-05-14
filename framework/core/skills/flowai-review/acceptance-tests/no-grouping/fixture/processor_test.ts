import { assertEquals, assertThrows } from "jsr:@std/assert";
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
  assertEquals(typeof results[0].joined, "string");
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

Deno.test("format: json output", () => {
  const json = processor.format([{ name: "Alice", age: 30 }], "json");
  const parsed = JSON.parse(json);
  assertEquals(parsed[0].name, "Alice");
});

Deno.test("format: csv output", () => {
  const csv = processor.format([{ name: "Alice", age: 30 }], "csv");
  const lines = csv.split("\n");
  assertEquals(lines[0], "name,age,email,active,joined");
});

Deno.test("format: xml output", () => {
  const xml = processor.format([{ name: "Alice" }], "xml");
  assertEquals(xml.startsWith("<?xml"), true);
  assertEquals(xml.includes("<name>Alice</name>"), true);
});

Deno.test("format: unsupported format throws", () => {
  assertThrows(() =>
    processor.format([], "yaml" as Parameters<typeof processor.format>[1])
  );
});
