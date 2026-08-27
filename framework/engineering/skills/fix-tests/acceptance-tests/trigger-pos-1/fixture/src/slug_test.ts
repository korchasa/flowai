import { assertEquals } from "@std/assert";
import { slugify } from "./slug.ts";

Deno.test("slugify lowercases and joins words with hyphens", () => {
  assertEquals(slugify("Hello World"), "hello-world");
});

Deno.test("slugify collapses runs of punctuation", () => {
  assertEquals(slugify("A -- B"), "a-b");
});

Deno.test("slugify does not leave a trailing hyphen", () => {
  assertEquals(slugify("Release notes!"), "release-notes");
});
