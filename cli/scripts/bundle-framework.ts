// [FR-DIST.BUNDLE](../../documents/requirements.md#fr-dist.bundle-bundled-source) — bundle framework into bundled.json
// [FR-PACKS.BUNDLE](../../documents/requirements.md#fr-packs.bundle-bundle-update) — scan framework/*/ pack structure
// Thin entry point: real work lives in bundle-framework-lib.ts so the same
// helpers can be reused by the external flowai-cli repo after the split.
import {
  bundleFrameworkDir,
  writeVersionFile,
} from "./bundle-framework-lib.ts";

const ROOT_DIR = new URL("../../", import.meta.url).pathname;
const FRAMEWORK_DIR = `${ROOT_DIR}framework`;
const OUTPUT_BUNDLE = new URL("../src/bundled.json", import.meta.url).pathname;
const OUTPUT_VERSION = new URL("../src/_version.ts", import.meta.url).pathname;

const denoConfig = JSON.parse(
  await Deno.readTextFile(`${ROOT_DIR}deno.json`),
) as { version: string };

const count = await bundleFrameworkDir(FRAMEWORK_DIR, OUTPUT_BUNDLE);
console.log(`Bundled ${count} files → cli/src/bundled.json`);

await writeVersionFile(denoConfig.version, OUTPUT_VERSION);
console.log(`Generated cli/src/_version.ts (${denoConfig.version})`);
