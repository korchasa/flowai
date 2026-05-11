import { expect } from "@std/expect";
import { extract } from "./extractor.ts";

Deno.test("extract", async (t) => {
  await t.step("basic functionality", async (t) => {
    await t.step("should extract title from HTML", async () => {
      const html = `<html><head><title>Test Title</title></head><body><p>Content</p></body></html>`;
      const result = await extract({ html });

      expect(result.title).toBe("Test Title");
      expect(result.text.length > 0).toBe(true);
      expect(typeof result.html).toBe("string");
    });

    await t.step("should extract content from HTML", async () => {
      const html = `<html><body><article><h1>Title</h1><p>Content here</p></article></body></html>`;
      const result = await extract({ html });

      expect(result.text.length > 0).toBe(true);
      expect(result.text).toContain("Content here");
      expect(typeof result.html).toBe("string");
    });

    await t.step("should handle empty HTML", async () => {
      const result = await extract({ html: "" });

      expect(result.text).toBe("");
      expect(result.html).toBe(null);
      expect(result.title).toBe(null);
    });
  });
});
