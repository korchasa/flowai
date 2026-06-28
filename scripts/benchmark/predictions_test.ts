import { assertEquals, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  appendPrediction,
  type Prediction,
  toJsonl,
  toPrediction,
} from "./predictions.ts";

const DIFF = `diff --git a/requests/models.py b/requests/models.py
--- a/requests/models.py
+++ b/requests/models.py
@@ -1 +1 @@
-old
+new
`;

Deno.test("diff_to_prediction_jsonl: builds a valid swebench record", () => {
  const p = toPrediction("psf__requests-1142", "flowai", DIFF);
  assertEquals(p.instance_id, "psf__requests-1142");
  assertEquals(p.model_name_or_path, "flowai");
  assertEquals(p.model_patch, DIFF);
});

Deno.test("diff_to_prediction_jsonl: empty diff yields empty patch (not an error)", () => {
  const p = toPrediction("psf__requests-1142", "baseline", "");
  assertEquals(p.model_patch, "");
});

Deno.test("diff_to_prediction_jsonl: rejects blank instance id or model", () => {
  assertThrows(() => toPrediction("", "flowai", DIFF));
  assertThrows(() => toPrediction("psf__requests-1142", "", DIFF));
});

Deno.test("appendPrediction: persists one record per call, creating the file, round-trips", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const p1 = toPrediction("psf__requests-1142", "flowai", DIFF);
    const p2 = toPrediction("pallets__flask-5014", "flowai", "");
    // First call creates the file (durability after instance 1).
    const path = await appendPrediction(dir, "flowai", p1);
    assertEquals(path, join(dir, "flowai.jsonl"));
    assertEquals(
      (await Deno.readTextFile(path)).trimEnd().split("\n").length,
      1,
    );
    // Second call appends (durability after instance 2).
    await appendPrediction(dir, "flowai", p2);
    const lines = (await Deno.readTextFile(path)).trimEnd().split("\n");
    assertEquals(lines.length, 2);
    assertEquals(JSON.parse(lines[0]), p1);
    assertEquals(JSON.parse(lines[1]), p2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("diff_to_prediction_jsonl: jsonl is newline-delimited and round-trips", () => {
  const preds: Prediction[] = [
    toPrediction("psf__requests-1142", "flowai", DIFF),
    toPrediction("pallets__flask-5014", "flowai", ""),
  ];
  const jsonl = toJsonl(preds);
  const lines = jsonl.trimEnd().split("\n");
  assertEquals(lines.length, 2);
  for (let i = 0; i < lines.length; i++) {
    assertEquals(JSON.parse(lines[i]), preds[i]);
  }
});
