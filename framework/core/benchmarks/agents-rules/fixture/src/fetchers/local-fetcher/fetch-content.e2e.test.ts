import { expect } from "@std/expect";
import { fetch } from "./fetch-content.ts";
import type { FetchContentResult } from "../types.ts";

const fixturesRoot = "src/fetchers/local-fetcher/fixtures";

Deno.test("fetch-content E2E (acceptance)", async (t) => {
  const htmlFiles: string[] = [];
  for await (const entry of Deno.readDir(fixturesRoot)) {
    if (entry.isFile && entry.name.endsWith(".html")) {
      htmlFiles.push(entry.name);
    }
  }

  for (const htmlFile of htmlFiles) {
    await t.step(`should correctly extract content for: ${htmlFile}`, async () => {
      const htmlPath = `${fixturesRoot}/${htmlFile}`;
      const html = await Deno.readTextFile(htmlPath);

      const jsonPath = htmlPath.replace(".html", ".json");
      const expected = JSON.parse(await Deno.readTextFile(jsonPath));

      const result = await fetch({
        html,
        options: { url: expected.url, contentLimit: 10000 }
      });

      const actual = normalizeResult(result);

      const expectedMapped = { ...expected };
      if (expectedMapped.content !== undefined) {
        expectedMapped.text = expectedMapped.content;
        delete expectedMapped.content;
      }

      // Special handling for date in expected
      if (expectedMapped.date) {
        expectedMapped.date = "EXISTS";
      }

      expect(actual).toEqual(expectedMapped);
    });
  }
});

function normalizeResult(result: FetchContentResult): Record<string, string | null> {
  const normalize = (val: string | null) => val ? toAscii(val) : null;
  return {
    url: normalize(result.url),
    canonicalUrl: normalize(result.canonicalUrl),
    title: normalize(result.title),
    description: normalize(result.description),
    image: normalize(result.image),
    author: normalize(result.author),
    publisher: normalize(result.publisher),
    date: result.date ? "EXISTS" : null,
    lang: normalize(result.lang),
    logo: normalize(result.logo),
    audio: normalize(result.audio),
    video: normalize(result.video),
    text: toAscii(result.text),
  };
}

function toAscii(input: string): string {
  if (!input) return "";
  const replacements: Array<[RegExp, string]> = [
    [/\u00A0/g, " "],
    [/\u2010|\u2011|\u2012|\u2013|\u2014|\u2212/g, "-"],
    [/\u2018|\u2019|\u201A|\u201B/g, "'"],
    [/\u201C|\u201D|\u201E|\u201F/g, '"'],
    [/\u2026/g, "..."],
    [/\u00B7/g, "*"],
    [/\u00AE/g, "(R)"],
    [/\u2122/g, "(TM)"],
    [/\u00A9/g, "(C)"],
  ];
  let output = input;
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }
  // deno-lint-ignore no-control-regex
  output = output.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  return output.replace(/\s+/g, " ").trim();
}
