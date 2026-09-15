/**
 * Populate the local ACP bridge store (FR-ACCEPT.BRIDGE-LOCAL).
 *
 * Installs every pinned npm bridge in `ACP_AGENTS` into `.acp-bridges/`, once
 * per `<package>@<version>`. Idempotent: a spec already present is skipped.
 * `AcpAgent` refuses to run without this — there is no npx fallback.
 */
import {
  bridgeStoreRoot,
  ensureBridgeInstalled,
  isBridgeInstalled,
} from "./acceptance-tests/lib/acp/bridge_store.ts";
import { ACP_AGENTS } from "./acceptance-tests/lib/acp/registry.ts";

if (import.meta.main) {
  const root = bridgeStoreRoot();
  for (const spec of Object.values(ACP_AGENTS)) {
    if (spec.launch.kind !== "npm") continue;
    const id = `${spec.launch.package}@${spec.launch.version}`;
    if (isBridgeInstalled(root, spec.launch)) {
      console.log(`[acp-bridges] ${spec.ide}: ${id} already installed`);
      continue;
    }
    console.log(`[acp-bridges] ${spec.ide}: installing ${id}`);
    await ensureBridgeInstalled(root, spec.launch);
    console.log(`[acp-bridges] ${spec.ide}: ${id} ready`);
  }
  console.log(`[acp-bridges] store: ${root}`);
}
