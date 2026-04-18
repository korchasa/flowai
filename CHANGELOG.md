# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.10.0](https://github.com/korchasa/flowai/compare/v0.9.0...v0.10.0) (2026-04-18)


### ⚠ BREAKING CHANGES

* **core:** make flowai-investigate autonomous

### Features

* **cli:** truthful sync output, --dry-run, global target-dirs preview ([45cf734](https://github.com/korchasa/flowai/commit/45cf734774f42a347089403b84fa3bcd43105f40))
* **core:** make flowai-investigate autonomous ([6e052f5](https://github.com/korchasa/flowai/commit/6e052f5ae0219430624a59c653ca0a98120f88cd))

## [0.9.0](https://github.com/korchasa/flowai/compare/v0.8.2...v0.9.0) (2026-04-17)


### ⚠ BREAKING CHANGES

* **core:** remove flowai-answer command

### Bug Fixes

* **ci:** bundle after version bump so _version.ts reflects release ([8f873f7](https://github.com/korchasa/flowai/commit/8f873f7dc9747d601d2c40c302910f696271a99a))


### Chores

* **core:** remove flowai-answer command ([5bee152](https://github.com/korchasa/flowai/commit/5bee15218f4c762c456b5ccf4b1263bf6a225095))

### [0.8.2](https://github.com/korchasa/flowai/compare/v0.8.1...v0.8.2) (2026-04-16)


### Features

* **core:** add --global sync mode for user-level framework install ([2ba4c2c](https://github.com/korchasa/flowai/commit/2ba4c2c068a2c933ebf61bbdc57da617f26bc477))
* **core:** extend check-srs-evidence to validate line-number refs ([dbd6d65](https://github.com/korchasa/flowai/commit/dbd6d65fda83893e15923cf4cfb088ee14760d1d))
* **core:** reflection follow-ups — SRS-evidence validator, InMemoryFs mkdir, authoring docs ([98f6b4e](https://github.com/korchasa/flowai/commit/98f6b4e376c4aa693720b5d0ade973b519ca3b19))
* **skills:** auto-invoke flowai-reflect on session complexity ([0c77749](https://github.com/korchasa/flowai/commit/0c77749d178adf2b0315b57212895168bf4e757d))


### Tests

* **core:** benchmark auto-invoke reflect, drop redundant step-7 divergence ([bb895f8](https://github.com/korchasa/flowai/commit/bb895f8168abbfcedf1629b0dcebd2b155f6e987))


### Chores

* ignore .claude/scheduled_tasks.lock ([8ab6401](https://github.com/korchasa/flowai/commit/8ab64015b6c69f0be158d9cc514b9f9553f17e96))

### [0.8.1](https://github.com/korchasa/flowai/compare/v0.8.0...v0.8.1) (2026-04-16)


### Features

* **core:** add streamlined commit-beta skills with targeted doc sync and benchmark A/B testing ([ff99b67](https://github.com/korchasa/flowai/commit/ff99b673366f2c43bcd9791d449b38457314dc12))
* **core:** auto-apply critique in flowai-plan instead of gating refinement on user input ([decf6e7](https://github.com/korchasa/flowai/commit/decf6e76fa4a8161cfb80b5e2c3244e04359ff30))
* **core:** replace terse Artifact/Fix/Evidence format with self-contained narrative sections in reflect skills ([869ab14](https://github.com/korchasa/flowai/commit/869ab1407c1ea4ef37902a25c002166ea35f81a8))
* **rules:** replace evidence-in-SRS with two-type traceability placement ([85f8003](https://github.com/korchasa/flowai/commit/85f800349f5a16a7e637579e0c0eba1dc70ec946))


### Code Refactoring

* **ci:** split pipeline into check + release jobs ([977c353](https://github.com/korchasa/flowai/commit/977c353cadbfe0c5687d2486784ad7c468585ef4))

## 0.8.0 (2026-04-12)


### ⚠ BREAKING CHANGES

* **framework:** framework/core/assets/ no longer ships
AGENTS.documents.template.md or AGENTS.scripts.template.md.
pack.yaml `assets:` map is now single-entry. Downstream
projects must run `/flowai-update` to collapse their legacy
three-file AGENTS.md layout; `flowai-update` detects the
legacy layout and guides a per-file confirmation merge.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
* All skill names changed from af-* to flow-*.
Commands like /af-commit are now /flow-commit.

Co-authored-by: Cursor <cursoragent@cursor.com>
* **rules:** Rule files moved from .mdc extension to RULE.md in directories.
Cursor IDE will automatically detect and load rules from new structure.

### Features

* add 'fail fast' strategy to AGENTS rules ([8557845](https://github.com/korchasa/flowai/commit/855784514d0a54f89cfa03ee9141a3ec263cedc1))
* add af-skill-generate-code and context-inefficiency benchmark scenario ([bcd1d50](https://github.com/korchasa/flowai/commit/bcd1d5062dc608217a35a8056c906dfb13d2dac6))
* add Cursor desktop and OpenCode guides to skills catalog ([ed5718e](https://github.com/korchasa/flowai/commit/ed5718eff822af1921085dfc0479fcc17571df05))
* add extract-claude-code-prompt skill for prompt reverse-engineering ([16466f2](https://github.com/korchasa/flowai/commit/16466f20d2c49777e1417d664b27452425574413))
* add flow-skill-playwright-cli and update requirements ([e1321c1](https://github.com/korchasa/flowai/commit/e1321c1a032451e2c11b316686e2d8196494e5d9))
* add how-to guide for writing DEP ([723de86](https://github.com/korchasa/flowai/commit/723de86a6d92ad7a6aeeb705ff7a44b4a9d6e414))
* add new commands and enhance existing development workflows ([0926ab2](https://github.com/korchasa/flowai/commit/0926ab25351fc036d8dee32dcb4fecf8f0d2919c))
* add QA command for task verification and cleanup ([73ce2d0](https://github.com/korchasa/flowai/commit/73ce2d0e30f462f8b5d7d67b3bfa7182bd58a8db))
* add reflect command ([27488f2](https://github.com/korchasa/flowai/commit/27488f2d26e8c576dbf4e6cd8736aafe06f91bf7))
* **af-engineer-skill:** add references and scripts ([576ec4d](https://github.com/korchasa/flowai/commit/576ec4dd92b77567d914af0cfc0d7f7e19d25687))
* **af-engineer-subagent:** add subagent engineering skill ([fad0b60](https://github.com/korchasa/flowai/commit/fad0b6070728ddf89eb75700ee195d2e1907a0ca))
* **af-init:** add component inventory and dev commands configuration ([aa42252](https://github.com/korchasa/flowai/commit/aa422520cee9383c5fd293b6d359b26e4ce93233))
* **af-init:** add standard interface commands to project template ([907de72](https://github.com/korchasa/flowai/commit/907de72a23c2a51e199542d77986b72ee8bba5f2))
* **af-init:** improve brownfield workflow and agent template ([70df9b3](https://github.com/korchasa/flowai/commit/70df9b38999f2a91f4ab26fc5acef3454f0851e5))
* **af-init:** move documentation generation from script to agent ([fa66a4b](https://github.com/korchasa/flowai/commit/fa66a4bae492ed1c047de9c6adf3337f4b21ad68))
* **af-init:** preserve PROJECT_RULES on AGENTS regeneration ([82d5968](https://github.com/korchasa/flowai/commit/82d5968912b58e210d96184646ba5a102fe794ec))
* **af-setup-code-style:** add Deno and strict TS setup skills ([e899178](https://github.com/korchasa/flowai/commit/e899178a2fd2d265c28cd7d639f9340fbf5f3d6e))
* **af-skill-ai-skel-ts:** add AI agent scaffold skill ([bc8ac83](https://github.com/korchasa/flowai/commit/bc8ac83faf5593a5d32c2a2f77d2b0beced4f962))
* **af-skill-configure-deno-commands:** add skill for standardizing deno dev commands ([41962cd](https://github.com/korchasa/flowai/commit/41962cd3c777636a839b4626fbf4497fc5c81d71))
* **af-skill-configure-strict-typescript:** add strict TypeScript configuration skill ([dd0f449](https://github.com/korchasa/flowai/commit/dd0f44910c4e4fb3275b521c9b656822a80f275f))
* **agents:** add flow-console-expert subagent ([36ea657](https://github.com/korchasa/flowai/commit/36ea657e5821c63f0d62f13115f0e29a2361b144))
* **agents:** add general-purpose executor agent ([e79843c](https://github.com/korchasa/flowai/commit/e79843cddc537cae605717ea15ed70e475b19d7f))
* **agents:** specify default models for prompt-engineer and skill-executor ([3a24d18](https://github.com/korchasa/flowai/commit/3a24d18aab7099de6def063f148291e66a4e72cf))
* **automation:** add automation pack with SDLC pipeline, role-specific subagents, and benchmarks ([f468374](https://github.com/korchasa/flowai/commit/f46837494f5e1e13f63935d063a52ce79dd52328))
* **bench:** add pack-level AGENTS.md rules benchmarks and relocate templates ([b23e623](https://github.com/korchasa/flowai/commit/b23e6231232739926367bde2d792936ab75c95d5))
* **bench:** implement secure dockerized execution for benchmarks ([#4](https://github.com/korchasa/flowai/issues/4)) ([ce1d4c1](https://github.com/korchasa/flowai/commit/ce1d4c15745c4f2ac6ec103724016fe6bef1a35a))
* **benchmarks:** add 25 new benchmark scenarios for framework skills ([facab36](https://github.com/korchasa/flowai/commit/facab368949df6ac82b06726c4cba5b2799ab902))
* **benchmarks:** add benchmark system for subagents ([782de3a](https://github.com/korchasa/flowai/commit/782de3a8ba7e2df542d1a6e117e2b910fecc903a))
* **benchmarks:** add multi-IDE support via adapter pattern ([#6](https://github.com/korchasa/flowai/issues/6)) ([97b19b8](https://github.com/korchasa/flowai/commit/97b19b88064f4fb943fa42e07c1fcf19aaa03537))
* **benchmarks:** add pack-scoped sandbox isolation and cross-pack reference validation ([9dda164](https://github.com/korchasa/flowai/commit/9dda1642accb09c6fe6f47d3561b5c53d03bc828))
* **benchmarks:** generate AGENTS.md from templates, add CLAUDE.md symlinks ([da51344](https://github.com/korchasa/flowai/commit/da5134431ea12c6d258276954d82354de2fc8595))
* **benchmarks:** migrate to stream-json, add NO_COLOR support, skip logic ([6cdb1b5](https://github.com/korchasa/flowai/commit/6cdb1b55056533b4fb8284f44bf51fe644683537))
* **benchmarks:** switch judge to Claude CLI, add parallel execution and explicit trace IDs ([c3c0741](https://github.com/korchasa/flowai/commit/c3c074116c82e595095ae26d35aaaaaf0f0ca8d1))
* **catalog:** add flow-commit agent for automated commit workflow ([e597da2](https://github.com/korchasa/flowai/commit/e597da2bf6dca338113394e6950c955edfd70f0b))
* **catalog:** add flow-convert-cursor-to-claude skill ([65bd29a](https://github.com/korchasa/flowai/commit/65bd29a60325e85d501a118e7c040c0ed7050f3f))
* **catalog:** add flow-execute and flow-plan agents ([24ad2ba](https://github.com/korchasa/flowai/commit/24ad2ba5e3bfdc95476095b553051b9a08af21cc))
* **catalog:** add flow-skill-deep-research skill and deep-research-worker agent ([43624a6](https://github.com/korchasa/flowai/commit/43624a61dddd0030760b91c2d6c780579a6e4387))
* **catalog:** disable model invocation for engineer and setup skills ([b4670b2](https://github.com/korchasa/flowai/commit/b4670b207af6ff6723dd888096669208c8bfdd08))
* **checks:** add naming prefix validator (NP-1: all primitives must use flowai- prefix) ([2491f33](https://github.com/korchasa/flowai/commit/2491f332eaadf74cb59faab622d0d05c74228db6))
* **cli:** --version checks for updates and shows update command ([d0e15a3](https://github.com/korchasa/flowai/commit/d0e15a3e89ca025ad8d0fb7b47a9d7e3d9c9ad83))
* **cli,framework:** add CLI update step to flow-update skill and version hint in IDE guard ([690fba7](https://github.com/korchasa/flowai/commit/690fba7f3ae313e14595fed57d92b3dcc5454dd9))
* **cli,update:** complete sync output for all primitive actions + frontmatter validation ([41e7578](https://github.com/korchasa/flowai/commit/41e75784d7e3586ca1a20a1dac9e0fb5fd5055db))
* **cli:** add --local sync mode; stop tracking .claude/ in git ([cd45ca6](https://github.com/korchasa/flowai/commit/cd45ca6b3b95d965db0a9ee2f09c9003090db478))
* **cli:** add `flowai loop` command for non-interactive Claude Code execution ([366e577](https://github.com/korchasa/flowai/commit/366e577fb8448064a783619bb8bc747ef0edff4e))
* **cli:** add `flowai update` self-update subcommand ([7b4d872](https://github.com/korchasa/flowai/commit/7b4d8721be23fcea2e9354d12c7b6fbe0d490cf5))
* **cli:** add migrate subcommand for one-way IDE primitives migration ([7d2962f](https://github.com/korchasa/flowai/commit/7d2962f4093bb9ca51ff783ca34108c98b548f21))
* **cli:** add non-interactive config generation for -y flag ([b8ddd72](https://github.com/korchasa/flowai/commit/b8ddd725f890c30985bc0a2500596cf557531bf4))
* **cli:** add OpenAI Codex IDE as a first-class target ([e1afa2c](https://github.com/korchasa/flowai/commit/e1afa2cb9a56d28c07df3b89ee6af1e916cd41a9))
* **cli:** add source override for installing from git branch or local path ([d210a08](https://github.com/korchasa/flowai/commit/d210a08590ed342c2012b6934632fe2bdba410a7))
* **cli:** decouple AGENTS.md templates from flowai-init scaffolds ([2fd635f](https://github.com/korchasa/flowai/commit/2fd635f3c48addbc9c49ba875311fc54200a01b3))
* **cli:** delete excluded framework resources during sync ([e16e64b](https://github.com/korchasa/flowai/commit/e16e64be9682345753a9e6c409c5aad244f2b575))
* **cli:** implement cross-IDE user resource sync (FR-10.8, FR-10.9) ([af2f709](https://github.com/korchasa/flowai/commit/af2f709f2e738e0e9835a03d86af1483f8233778))
* **cli:** interactive update prompt with deno.lock pinning fix ([5d869ec](https://github.com/korchasa/flowai/commit/5d869ecfa7e7ff3edc866952b63dacb6a3690aa2))
* **cli:** sync core assets to IDE config dirs ([a2e67e2](https://github.com/korchasa/flowai/commit/a2e67e27b6263c6e1c8e90a83352fab0a1a745a8))
* command to build CLAUDE.md file using .cursor/rules ([8a82ab1](https://github.com/korchasa/flowai/commit/8a82ab16ce2e3e02d51f618c2d78c851a9823c56))
* **commands:** add analysis and gap filling step to execution workflow ([887b344](https://github.com/korchasa/flowai/commit/887b34445bf03c6e02df566b97769d41ee681eba))
* **commands:** add docs-check command ([79ab673](https://github.com/korchasa/flowai/commit/79ab673123661979e6f9ac1dd23d133668c8f861))
* **commands:** add error analysis workflow ([3367e92](https://github.com/korchasa/flowai/commit/3367e9230dcef65473c32aa3d912db327d6d5407))
* **commands:** add maintenance command ([f24db45](https://github.com/korchasa/flowai/commit/f24db456efe3d8e291ca64b1548514bb97efbca4))
* **commands:** add task-build-claude-md command with implementation script ([4a48cfd](https://github.com/korchasa/flowai/commit/4a48cfd05d4c9e33bbc495e8de62fe9dd9a6a4b1))
* **commands:** automate commit workflow with atomic grouping ([1033c25](https://github.com/korchasa/flowai/commit/1033c25576efc4894942dab6a0b4823cecc04b8a))
* **commands:** enhance init command workflow ([6a4f8c7](https://github.com/korchasa/flowai/commit/6a4f8c7bb66fd199d4bf1e37ace56796bbc0611e))
* **commands:** implement GODS framework and chat-first reasoning in planning ([90aeb21](https://github.com/korchasa/flowai/commit/90aeb213364c631c0b5f2672496997de37e39e92))
* **commands:** reorganize tasks and add agent rules ([88faf75](https://github.com/korchasa/flowai/commit/88faf75ef04fbc271e5c179e204375fb61952417))
* **configure-deno-commands:** require parallel buffered check execution ([e52ad4d](https://github.com/korchasa/flowai/commit/e52ad4de85edc3c670f31f56f380f9e643989ad8))
* **core:** add flowai-reflect-by-history skill ([d5de1a8](https://github.com/korchasa/flowai/commit/d5de1a8b4aabcd6738fe62275b5852f3a1eaf1cd))
* **core:** add parallel execution to deno task check and review/commit skills ([8441c26](https://github.com/korchasa/flowai/commit/8441c2616359ea3585b4a1be0473196cedb0296e))
* **core:** integrate AskQuestion and SwitchMode tools for interactive clarification ([babd1fe](https://github.com/korchasa/flowai/commit/babd1feab62a47e706a073d6a34ef5e41372ae7e))
* **cursor:** add initial task docs, rule guidelines, and design docs; update README and .gitignore ([03857ee](https://github.com/korchasa/flowai/commit/03857ee3ee04cf567a9c8f62a15ae35d7e51eac9))
* **deno-cli:** add skill for managing Deno capabilities via CLI ([d3b627f](https://github.com/korchasa/flowai/commit/d3b627f496292ea8977b5f2d3298415c7d5b2c59))
* **deno-deploy:** add local debugging protocol and unstable APIs guide ([2e6cee9](https://github.com/korchasa/flowai/commit/2e6cee9be7c851b0f1131b2da3072e4a34c61e5e))
* **deno-deploy:** add skill for managing Deno Deploy cloud services ([e5d4b10](https://github.com/korchasa/flowai/commit/e5d4b1097ed25e2fbdaed8513dbc30758a074fac))
* **devcontainer:** add Claude Code auth forwarding from macOS Keychain ([99d3fa7](https://github.com/korchasa/flowai/commit/99d3fa771b609fe624ff54c89a8f66b3ee0236e4))
* **devcontainer:** add gh CLI auth and git credential helper to setup-container.sh ([e3c9f85](https://github.com/korchasa/flowai/commit/e3c9f85f2a7cb66a27dc303fb1ae5a8b103689e9))
* enforce IDE-agnostic language and update skills ([90fb207](https://github.com/korchasa/flowai/commit/90fb207000082335d74d9e837cdf85d3d96defc7))
* **engineer-rule:** update Claude Code rule semantics based on experimental verification ([b77f509](https://github.com/korchasa/flowai/commit/b77f5099295202cafc2ca33172e63969a8622119))
* **engineer:** add OpenCode IDE support to all engineer skills and docs ([1e50994](https://github.com/korchasa/flowai/commit/1e50994637e4c8beb7f37e20bda38798390e0ba1))
* **experiments:** add sweep subsystem and claude-md-length study ([1b51a1c](https://github.com/korchasa/flowai/commit/1b51a1c32be8116f121d1c53e238ec4c08187cfa))
* extend frontmatter for skills and agents with model tiers ([fd7d37a](https://github.com/korchasa/flowai/commit/fd7d37a5fd7a16c60664225639f510315e80262a))
* **flow-cli:** add self-update check against JSR registry ([8c63c5e](https://github.com/korchasa/flowai/commit/8c63c5e6bb1b10aa2a65db5e9a4f9fcd82cb202e))
* **flow-commit:** enforce consolidation-first commit grouping ([78acd15](https://github.com/korchasa/flowai/commit/78acd158961d70562c0b03fdf02145c3c6ddc022))
* **flow-init:** add 'no tables in chat' rule to AGENTS template ([e8a2d65](https://github.com/korchasa/flowai/commit/e8a2d65eaead9895502654c3cb0f492509f085f3))
* **flow-init:** add CLAUDE.md symlink step and fix evidence references (FR-19) ([cbde0d4](https://github.com/korchasa/flowai/commit/cbde0d43bedbed15abdbae22ba9e112c110dcf27))
* **flow-init:** add Deno tooling option to interview ([fbf5151](https://github.com/korchasa/flowai/commit/fbf515151e81b7d9b6d9ddd092f3b404c3d1892a))
* **flow-init:** split AGENTS.md into domain-scoped files with manifest-driven generation (FR-12) ([1a08122](https://github.com/korchasa/flowai/commit/1a0812217d6cef9722c453cbce4dc628f226c0d6))
* **flow-reflect:** add undocumented discoveries and automation opportunity analysis ([7071875](https://github.com/korchasa/flowai/commit/7071875ab0379cc917fd64cc2b9b26c631b6ba2c))
* **flow-skill-executor:** add introduce-yourself step to workflow ([3ad6d54](https://github.com/korchasa/flowai/commit/3ad6d5421294d0fb04875e1cd3b57475d89f0216))
* **flow-skill-setup-ai-ide-devcontainer:** add feature discovery step and catalog (FR-20.11) ([29fef36](https://github.com/korchasa/flowai/commit/29fef36147e8006087e72ca4a8ef8dd8f168f6e9))
* **flow-skill-setup-ai-ide-devcontainer:** complete FR-20 coverage gaps (SDS, benchmarks, multi-CLI) ([7d6e54d](https://github.com/korchasa/flowai/commit/7d6e54d4a329764fa241c6a2265b377079b1a44a))
* **flowai-plan:** improve variant selection flow and fix interactive benchmark infrastructure ([3b04cfc](https://github.com/korchasa/flowai/commit/3b04cfc4f26b08bd74ed090582814cd5e4d2fcbc))
* **framework,cli:** implement pack system — flowai-* renaming, hooks/scripts, rich sync output ([0cc3000](https://github.com/korchasa/flowai/commit/0cc300021887af082be6ce08b47f45f4ad5ad711))
* **framework:** add clarity review criterion and TS no-nested-ternary rule ([9b7203a](https://github.com/korchasa/flowai/commit/9b7203acfde2f60fb32055f9d72216a6c6271b49))
* **framework:** add explicit git diff commands to flow-update skill ([b946c27](https://github.com/korchasa/flowai/commit/b946c2759a9dd24ff04f8bc300a9a7a1826718ef))
* **framework:** add flow-update skill and CLI IDE context guard ([687effe](https://github.com/korchasa/flowai/commit/687effebf71ffc667c8bd262e45f6f1f337f9a8d))
* **framework:** add interactive-teaching-materials skill ([a141aea](https://github.com/korchasa/flowai/commit/a141aeae4b32d5ded229fa209b90650857c248fc))
* **framework:** add skill adaptation to flowai-update ([bed0c31](https://github.com/korchasa/flowai/commit/bed0c315b38176a91d7a6f00ace1844c0006b384))
* **framework:** enrich variant analysis with Risks and Trade-offs ([5bf9e1f](https://github.com/korchasa/flowai/commit/5bf9e1f1069b62906662f64680958a7b35aa4462))
* **framework:** mandatory Documentation Audit with gate and report template ([2076efb](https://github.com/korchasa/flowai/commit/2076efb06ff5af38270a8858ec35cf5bba077dd2))
* **framework:** migrate benchmarks and runner to pack structure ([28ea5d6](https://github.com/korchasa/flowai/commit/28ea5d6bd5c22c70eed2bddc825ff9fc1bf101d7))
* **framework:** migrate whiteboard from single file to per-session directory ([42316a6](https://github.com/korchasa/flowai/commit/42316a66a13ec3c88ebbfd630b64d68dc955e62d))
* **framework:** propagate FR-<ID> traceability rule to AGENTS template ([7afd092](https://github.com/korchasa/flowai/commit/7afd092f876ff800203bd5d1c5c9b07b33f78431))
* **hooks:** add flowai-session-init-docs SessionStart hook ([22ba4ab](https://github.com/korchasa/flowai/commit/22ba4ab1629fa56b86ebefcc5e2dce32a8aec3b6))
* **hooks:** add framework hooks with IDE-specific config generation ([b6a5ccb](https://github.com/korchasa/flowai/commit/b6a5ccbe14a9c10bcb69e7291616ed376c73071f))
* implement unified benchmark trace with dashboard and skill grouping ([5474dfb](https://github.com/korchasa/flowai/commit/5474dfbe9c23487c0dd47e48248e1b60f3e8c0b7))
* **install:** add --yes/-y flag for non-interactive execution ([af87bc2](https://github.com/korchasa/flowai/commit/af87bc2a72791b84ee2dc894773e9329beb11188))
* **install:** add global installer for per-IDE agent/skill symlinks (FR-10) ([94817b5](https://github.com/korchasa/flowai/commit/94817b5a2118a8b1eae9c2d88b2de6cef6c70ce2))
* **install:** add remote execution and shell bootstrap (FR-10.6) ([b6de621](https://github.com/korchasa/flowai/commit/b6de621cd0b5cd1cb7ffd77348b2655fc15963ee))
* integrate product vision into AGENTS.md and af-init ([#5](https://github.com/korchasa/flowai/issues/5)) ([2d786db](https://github.com/korchasa/flowai/commit/2d786db3aed034fe92afe8bcf852516f883b284a))
* introduce .dev/ SPOT directory with symlink-based multi-IDE support ([9ac2a13](https://github.com/korchasa/flowai/commit/9ac2a1318ddde135193dac725088cfab790cc880))
* **maintenance:** add deno task scripts and config ([1a14040](https://github.com/korchasa/flowai/commit/1a140403747efab3a485954007f71444b61caf82))
* **maintenance:** make flowai-maintenance interactive with two-phase flow ([3ea07b5](https://github.com/korchasa/flowai/commit/3ea07b5a7f089c1f99e45d89ebeb0df420f8f20c))
* **mcp:** add configuration for Cloudflare browser rendering server ([d7e202f](https://github.com/korchasa/flowai/commit/d7e202fbfc3a59eb6300790fdbc847dae06ffe3f))
* migrate framework Python scripts to Deno/TypeScript (FR-13) ([0a778c1](https://github.com/korchasa/flowai/commit/0a778c1fc7e37ce41135b52f91c9f25efbb1955e))
* **pipeline:** add compact SDLC pipeline with Design and Review agents ([d9c6876](https://github.com/korchasa/flowai/commit/d9c6876720b963e6bdd9a13565b397c3273403ca))
* **pipeline:** add flowai-pipeline-sdlc — local SDLC pipeline without GitHub ([565ec45](https://github.com/korchasa/flowai/commit/565ec45f1cc726d3230bda4225e837a74151069e))
* **planning:** add Plan Persistence rule to save plans to whiteboard.md ([e00c89f](https://github.com/korchasa/flowai/commit/e00c89fd8100c870a6ca6c4b91569b72cdedbfed))
* **reflect:** add self-criticism step to reflection skills ([b8104e2](https://github.com/korchasa/flowai/commit/b8104e28bbd3cb31091d82bff5530c95991a1c83))
* replace /check with iterative /check-and-fix command ([94f7627](https://github.com/korchasa/flowai/commit/94f762709f2a34571833eb455163aada3d825e5c))
* **rules:** add skill-creator guide and scripts ([f5961dc](https://github.com/korchasa/flowai/commit/f5961dcbb393643b00df2401d790eda051ced94f))
* **scripts:** auto-disable ANSI colors when running under Claude Code ([dedcba7](https://github.com/korchasa/flowai/commit/dedcba799f5a31790fa85a8520f8d51cf0773747))
* **settings:** update permissions and add additional directories for flow-review-and-commit ([5e81f60](https://github.com/korchasa/flowai/commit/5e81f60d8524b75c7cf0e5a60dbd0480c020cda5))
* **skills:** add flow-spec skill for phased feature specifications ([294a12c](https://github.com/korchasa/flowai/commit/294a12cc54e433909f773500344791e5cdabbbb9))
* **skills:** add flowai-adapt command for standalone primitive adaptation ([dc01c34](https://github.com/korchasa/flowai/commit/dc01c34d5e478f7147c048e25631e03a68c0c7b0))
* **skills:** add instruction coherence and tooling relevance checks to flowai-maintenance ([867d3ec](https://github.com/korchasa/flowai/commit/867d3ec9af3b50ee5d12688d37100297eb82c7b0))
* **skills:** add pre-flight project check to flowai-review ([fec5307](https://github.com/korchasa/flowai/commit/fec5307dbcd2e7cb3b6f188bd198e5fd80f040ef))
* **skills:** close FR-21.3–21.6 universal skill & script requirements ([fe11fad](https://github.com/korchasa/flowai/commit/fe11fad59d704d6b17630f6a0e8bf9646cf54426))
* **skills:** enforce FR-21.1 agentskills.io compliance with validation and fixes ([c7d1b36](https://github.com/korchasa/flowai/commit/c7d1b362aa22bc82abc4377c2afe7cb706f7c0cb))
* **skills:** enforce FR-21.2 cross-IDE script path resolution ([971f660](https://github.com/korchasa/flowai/commit/971f660d05c4b5bbebdc7c5c3dd126a55ac3d2c5))
* **skill:** update flow-skill-analyze-context to focus on total cost estimation ([fed8ba2](https://github.com/korchasa/flowai/commit/fed8ba2e59a7ca26659c6763ca8af704adc97d8b))
* **sync:** implement user commands synchronization across IDEs ([ef68ff7](https://github.com/korchasa/flowai/commit/ef68ff7d3fbed62221a1a73f1918b0fdd290fd2a))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([8bff86a](https://github.com/korchasa/flowai/commit/8bff86aa4b4d31cdb1605732a5c24fa69f8db1f8))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([88fb794](https://github.com/korchasa/flowai/commit/88fb794f075564548251f973e4ae54d2c1d26822))
* universal agent format + flow-cli distribution ([#7](https://github.com/korchasa/flowai/issues/7)) ([45ad03e](https://github.com/korchasa/flowai/commit/45ad03e200589c2a87644ef116ff35c4482ff41f))
* update /investigate command with iterative workflow ([99ee7f0](https://github.com/korchasa/flowai/commit/99ee7f01cbf1d103c41673fa73575e92a3d70abb))
* update commands ([a629309](https://github.com/korchasa/flowai/commit/a629309ce4d7f7bdd7c4f14b1217d26dbe240456))


### Bug Fixes

* **af-init:** align documentation generation with standard schema ([513960a](https://github.com/korchasa/flowai/commit/513960a3b8a392babcdd23b171f9ec3236cca1b3))
* **bench:** add pre-spawn skill mount check and short-output warning ([18fa0a5](https://github.com/korchasa/flowai/commit/18fa0a56e365e05df443837fe358be08b7f056b8))
* **bench:** copy framework commands/ into sandbox .{ide}/skills/ ([17066dc](https://github.com/korchasa/flowai/commit/17066dca852feb5a0bcf1981dffa63ccf5a3f9d0))
* **bench:** correct checklist items in flowai-update benchmarks ([45ee5d8](https://github.com/korchasa/flowai/commit/45ee5d8bd21cd2837de49456d52e4239cc3e3050))
* **benchmarks:** add interactive mode to review scenarios (P3) ([53f8ed3](https://github.com/korchasa/flowai/commit/53f8ed3a766942b7df2e668c80a7c5b30fd740f6))
* **benchmarks:** fix P5 strict checklists — skill fixes and interactive mode ([ca009f0](https://github.com/korchasa/flowai/commit/ca009f0e42130cf519dc069917ada3098ee7e86b))
* **benchmarks:** fix P6 deterministic failures in flow-commit scenarios ([22a2826](https://github.com/korchasa/flowai/commit/22a28267409c9577e48626f64892688546785529))
* **benchmarks:** handle dynamic exit_code_zero in score test ([576d9b1](https://github.com/korchasa/flowai/commit/576d9b14edbb9827289de52a68f1fdb68b873908))
* **benchmarks:** isolate sandbox with git init to prevent agent escaping to parent repo ([1c30746](https://github.com/korchasa/flowai/commit/1c30746ea4f4446a95b3e34425a5f8089c6ef2c9))
* **benchmarks:** overhaul benchmark infrastructure for reliability ([895d4f9](https://github.com/korchasa/flowai/commit/895d4f9fde59dc435c6662010ada9989a858ba68))
* **benchmarks:** pass judge evidence via file to avoid E2BIG crashes ([fac82f9](https://github.com/korchasa/flowai/commit/fac82f9e7ccd1122f0ef9dbb2db608563d15d0e7))
* **benchmarks:** switch engineer-skill/subagent scenarios to .cursor/ to avoid CLI write block ([5b1ce42](https://github.com/korchasa/flowai/commit/5b1ce4272b69af06e41e4c0a954e737393537904))
* **benchmarks:** update paths after pack migration, remove stale fixturePath overrides ([814c016](https://github.com/korchasa/flowai/commit/814c0166e88fc28cb241c500bdd21848a98881d3))
* **build:** add agent benchmarks to lint/test excludes, remove orphaned fixture ([3e7d2ac](https://github.com/korchasa/flowai/commit/3e7d2acf1f2dbdd6ce51bc449708d477f9a28a78))
* **ci:** exclude integration tests from check (API/env dependent) ([145a126](https://github.com/korchasa/flowai/commit/145a12672bbd3145b51c87308a4a832add522cf5))
* **ci:** fix release step — create tags properly, fail early on notes ([85cc9cc](https://github.com/korchasa/flowai/commit/85cc9cca28dbcfc0643f5bb371ecca13e7f0d480))
* **ci:** pass --config to deno install --global in verify-install job ([0a5a6b4](https://github.com/korchasa/flowai/commit/0a5a6b41c33668c161fde8da23b712cc494ae7ab))
* **ci:** resolve non-existent tag in release notes generation ([4fb9cfb](https://github.com/korchasa/flowai/commit/4fb9cfb6af9f9bea31e7d401afd2f67a269e2c30))
* **ci:** stop tracking generated flowai-hooks.json ([645df3e](https://github.com/korchasa/flowai/commit/645df3ec3882e1e0bd37ae1fd267a28e5209d448))
* cleanup ([b5ac8ae](https://github.com/korchasa/flowai/commit/b5ac8aebe45629f07b7603e481aaa525f8ec2433))
* **cli,framework:** clarify flowai sync subcommand in IDE context ([9f85a77](https://github.com/korchasa/flowai/commit/9f85a770ef857fbb7cb485a6803123d1d424dc10))
* **cli:** add explicit type annotation to cliffy action callbacks ([c489233](https://github.com/korchasa/flowai/commit/c489233779fe3b329ea997a5606d1f450236feca))
* **cli:** exclude benchmarks and test files from skill distribution ([76d2a7c](https://github.com/korchasa/flowai/commit/76d2a7c8569d95f876ab3f130a5fb0ffed5742ca))
* **cli:** resolve TS2345 in cliffy action callbacks, add deno check to task-check ([5c9b289](https://github.com/korchasa/flowai/commit/5c9b28965649277e738cd9f2bdb8a949e4e495e9))
* **cli:** run sync integration test in temp dir to avoid side effects ([d3a2053](https://github.com/korchasa/flowai/commit/d3a2053d77ec89c859c0a4739b558dd748a8bdb3))
* **config:** remove source reference from .flowai.yaml ([8946e15](https://github.com/korchasa/flowai/commit/8946e1538b18d4254bcfa38dc5c8b123a66ac530))
* correct deno fmt exclude config and sync flow-review whiteboard path ([ed4ab74](https://github.com/korchasa/flowai/commit/ed4ab74afdcdbd7a1c170e0e79fe1607c50accc7))
* **devcontainer:** fix OAuth auth, volume ownership, and error masking in templates ([9d256b3](https://github.com/korchasa/flowai/commit/9d256b379e8c3ca3a3d5ac1682dcb0345d68bd19))
* **devcontainer:** switch Claude Code install to official script, expand features catalog ([4954d73](https://github.com/korchasa/flowai/commit/4954d738dbe01c0aa70e2d1ea6d14a28c002371e))
* **devtools:** correct Claude Code rule format in engineer-rule skill ([2a56e3b](https://github.com/korchasa/flowai/commit/2a56e3bfad65e9d461e395abab34645c94e994e9))
* **docs:** correct spelling in plan.md instructions ([c83d897](https://github.com/korchasa/flowai/commit/c83d89718c7cf819634d0373afa5aea0b4263f45))
* **docs:** remove extraneous command from installation instructions in README ([4ab2137](https://github.com/korchasa/flowai/commit/4ab21379c4bee9fd01c629f9040faa94e33498de))
* **docs:** update AGENT.md references to AGENTS.md ([988d72e](https://github.com/korchasa/flowai/commit/988d72e5abd36a35878c7d213af3c2cf49074a0e))
* **docs:** update migration instructions in migrate-run-ts.md ([3f8c58a](https://github.com/korchasa/flowai/commit/3f8c58a58cbb2322c4831f32572a4c525b8b6752))
* **flowai-plan:** enable interactive mode in basic benchmark ([edc83bb](https://github.com/korchasa/flowai/commit/edc83bb56bfd76d4500c8986379969911ac54e9c))
* **flowai-review:** add deletion guard for entire directories ([2d8629f](https://github.com/korchasa/flowai/commit/2d8629f449ba42908ce1902b938d6cd50d7a396d))
* **flowai-review:** gate stack-specific checks on manifest detection ([88b81cb](https://github.com/korchasa/flowai/commit/88b81cbc091020259f350c26015d68a77c5e517d))
* **fmt:** format benchmark file that broke CI ([8a6bff0](https://github.com/korchasa/flowai/commit/8a6bff048a4106d1fc3a945e0696878f4a797f8d))
* **framework:** use system temp dir instead of _research_tmp in deep-research skill ([6e72a0f](https://github.com/korchasa/flowai/commit/6e72a0f965278bb8b7836b66adc920725013b8f1))
* **hook:** isGitCommit handles quoted strings, -c flags, and subshells ([b3c71d3](https://github.com/korchasa/flowai/commit/b3c71d3a9f7c43dc1450776a57976c890f9d1c35))
* **install:** use full jsr: specifier for remote execution compatibility ([0da4a94](https://github.com/korchasa/flowai/commit/0da4a94955c6716b80b2667d7fab040df97a4838))
* **plan:** make critique step automatic instead of asking permission ([216724f](https://github.com/korchasa/flowai/commit/216724f4fe944f1061010ce13c38e3125b11bd11))
* **publish:** un-exclude generated artifacts from JSR publish ([0bb79f3](https://github.com/korchasa/flowai/commit/0bb79f38d88db640d4643f596ac2ab241adf7021))
* **scripts:** use jsr: specifier in generate_agents.ts; close 10 FR-21 criteria ([7d14e0a](https://github.com/korchasa/flowai/commit/7d14e0aaf29fd4b26b7d34ab9e9ef07df9d43168))
* **security:** bump next from ^14.0.0 to ^15.5.10 in benchmark fixture ([ba4e081](https://github.com/korchasa/flowai/commit/ba4e0813868644f278182b909d4e308cb6365498))
* **skill:** make asset artifact verification unconditional in flowai-update ([cc66a64](https://github.com/korchasa/flowai/commit/cc66a64368bfcbbf3558728b3865fb5815c4a401))
* **skills:** correct script path in analyze-context and remove --headed flag from playwright-cli ([e6a4a5c](https://github.com/korchasa/flowai/commit/e6a4a5ca95affafd344b5042904a9726108ffeb1))
* **update:** handle invalid YAML in parseFrontmatter gracefully ([fd477bc](https://github.com/korchasa/flowai/commit/fd477bc2bfa3e9cfa4880aa2d32c878c25dd53a5))


### Continuous Integration

* **release:** merge CI jobs into single pipeline with standard-version automation ([acbfc03](https://github.com/korchasa/flowai/commit/acbfc03c4a94402b3244a66b25386884ecab6aaf))


### Build System

* add CI integrity checks and update judge model ([6fdc340](https://github.com/korchasa/flowai/commit/6fdc340b4e0eaedda3423ef8f58aeaab7793bc1c))
* **ci:** add custom release notes generation from conventional commits ([22d5b75](https://github.com/korchasa/flowai/commit/22d5b75c250000bca34610d170c138fb61798f18))
* **ci:** pin Deno to 2.7.11 to fix fmt mismatch ([0442c1d](https://github.com/korchasa/flowai/commit/0442c1de0aa8e0eacc146cde6d0b1eb55541c2dc))
* **ci:** pin Deno to 2.7.4 and revert HTML formatting ([01a7d3a](https://github.com/korchasa/flowai/commit/01a7d3a81f4f5d49dfd499f17caec91e3598a1d5))
* **ci:** pin Deno version to 2.7.11 ([165c70f](https://github.com/korchasa/flowai/commit/165c70f7da0f557f3b446a520441085bdc7041a4))
* exclude markdown files from formatting, cleanup worktrees.json ([2c2a2fe](https://github.com/korchasa/flowai/commit/2c2a2fea6466d91d720c6c4db5a4b9aa92e64918))
* pin GitHub Actions to SHA checksums ([e47d6ea](https://github.com/korchasa/flowai/commit/e47d6ea2e244b88f72d424571df9fd7a628b559a))
* update deno.lock ([ef9543f](https://github.com/korchasa/flowai/commit/ef9543f0193e226ce62bd719764b17a716fdd605))


### Agent Changes

* add Benchmark TDD flow to project instructions ([567d515](https://github.com/korchasa/flowai/commit/567d515b760b2fd3858192eefe9a8bcd345a6517))
* add evidence links to all acceptance criteria in SRS ([d819ee4](https://github.com/korchasa/flowai/commit/d819ee4bb77ee8d1349fbb9c2427a7f9cebd107c))
* add relative paths rule to AGENTS.md and template ([605e556](https://github.com/korchasa/flowai/commit/605e556454eb40bc1073dfc23f3e724d9bd6c86e))
* **AGENTS:** update guidelines to include post-session review and evidence provision ([f3927e3](https://github.com/korchasa/flowai/commit/f3927e3ede008971910de28047e84ed65c8dd157))
* **commit-review:** separate responsibilities between review and commit, add whiteboard cleanup ([00b8a73](https://github.com/korchasa/flowai/commit/00b8a73ce3e7be77170e58a3d4ab1324d09d65aa))
* **core:** add dynamic doc discovery, whiteboard context, and parallel delegation benchmarks ([7ea34e0](https://github.com/korchasa/flowai/commit/7ea34e0a5fd7681fa43d130adca542c01df78873))
* fix inconsistent punctuation in project rules ([9138896](https://github.com/korchasa/flowai/commit/91388969495ec3e4531fdf6fbc28709115399050))
* **flow-commit:** add agent: commit type for AI config changes (FR-11) ([f11dcbc](https://github.com/korchasa/flowai/commit/f11dcbce601d651801ef09b6e5c231cc9b2fb5d5))
* **flow-commit:** add suggest-reflect step after commit ([4e44b9c](https://github.com/korchasa/flowai/commit/4e44b9c70d6d7526f0e211eb9947d42da4fd8042))
* **flow-engineer-hook:** add cross-IDE hook docs and benchmarks (FR-14, FR-15, FR-16) ([202657e](https://github.com/korchasa/flowai/commit/202657e1dbbf5e1b479d2c0eb9e643605aa08f44))
* **flow-review-and-commit:** implement composite review+commit command (FR-18) ([5e512cf](https://github.com/korchasa/flowai/commit/5e512cf23b9ed58112c68b3321692ecb3933e545))
* **flow-review:** inline workflows in composite skill, add sync check and benchmarks ([f804d83](https://github.com/korchasa/flowai/commit/f804d8304d93fd72eb0eb678eb7774ac90884fa2))
* **flow-skill-setup-ai-ide-devcontainer:** add devcontainer skill, update FR-10/FR-20 requirements ([0408c38](https://github.com/korchasa/flowai/commit/0408c38dd0e8ba2395d8cd2cd9da00c16b472c43))
* **flowai-commit:** add missing CLAUDE.md symlink in dynamic-doc-list fixture ([bbd29a7](https://github.com/korchasa/flowai/commit/bbd29a755b9a81acc2bfe4ad7aa33f8163d9d117))
* **flowai-reflect:** add cross-session pattern analysis ([f11f432](https://github.com/korchasa/flowai/commit/f11f4324efa2a577596414a5586fffcb4585a9ab))
* maintenance — fix flow-* naming, improve skill instructions, add JSDoc ([de8e700](https://github.com/korchasa/flowai/commit/de8e70001c40474105cd9c456492d8447fefba82))
* replace bare @std/ specifiers with jsr: for standalone script independence ([be2839f](https://github.com/korchasa/flowai/commit/be2839f91cad7d3885a1a225e30d5ced36f09c98))
* replace flow-qa with flow-review combining QA and code review roles ([4149a7b](https://github.com/korchasa/flowai/commit/4149a7b8a2240362c1205e86cd16fc10c3e148b5))
* resolve IDE support scope to 3 IDEs (FR-17) ([5355740](https://github.com/korchasa/flowai/commit/5355740b4615d0e8da9ccaa13a6d6212a962ce7e))
* use portable <this-skill-dir> placeholder for bundled script paths ([07b005d](https://github.com/korchasa/flowai/commit/07b005d203a9764101131d41e99d502eb0bd0f67))


### Documentation

* add benchmark test-fitting and static mocks rules, clarify cross-pack ref checker ([7c6359b](https://github.com/korchasa/flowai/commit/7c6359be366579517e036c17eb150ddb6b5474cc))
* add CODE STYLE RULES for Go (Golang) ([e2f806d](https://github.com/korchasa/flowai/commit/e2f806df97fa9aa3c2992deec578b68d4cae44db))
* add code-style-typescript-deno.mdc with TS strict rules and Deno import guidance ([950352c](https://github.com/korchasa/flowai/commit/950352cdb1bf8b5c19a97f2177d1c56983695047))
* add deno-cli and deno-deploy to skill coverage matrix ([acd09fb](https://github.com/korchasa/flowai/commit/acd09fb1badc6734e412a7f56b7f45ecd1b5919b))
* add descriptions to command files for clarity and guidance ([89beca2](https://github.com/korchasa/flowai/commit/89beca27671472bfdbc3fe5a05e50cb22e89eec6))
* add flow-review-and-commit command and FR-18/FR-19 requirements ([60fb47b](https://github.com/korchasa/flowai/commit/60fb47bbf0531af7810516ad1c982f438abd340e))
* add guidelines for writing Product Requirements Documents (PRD) ([3548cf0](https://github.com/korchasa/flowai/commit/3548cf0858d667c6e07bf95c70ec5e3e7750c4d4))
* add IDE comparison and research documents ([dfa1821](https://github.com/korchasa/flowai/commit/dfa18214d9f8843e3e09f5141928d50e09445da8))
* add JSDoc to benchmark lib, rewrite scripts/AGENTS.md, clean up duplicates ([baf950e](https://github.com/korchasa/flowai/commit/baf950ee9546d07e45c4238146fa1cdb2d3c7411))
* add local check requirement for CI/CD edits ([49e3aa2](https://github.com/korchasa/flowai/commit/49e3aa27a7050876fba20efb512b99b976b59452))
* add logic-focused testing rule to AGENTS.md and template ([a7c8c16](https://github.com/korchasa/flowai/commit/a7c8c1657bedc7445a2ba1a150d736a60bb05902))
* add maintenance report to whiteboard ([7b0473d](https://github.com/korchasa/flowai/commit/7b0473dde820fb3f55982ead3f000d86ab185b35))
* add PoC rules and update task-answer command ([66faf13](https://github.com/korchasa/flowai/commit/66faf13e683d99fe9c17352076f7961285957162))
* add Product Vision Document creation command and guidelines ([3bb9386](https://github.com/korchasa/flowai/commit/3bb93865188bc512be250b00f3d11d810486ff3c))
* add Reference-First planning rule to AGENTS.md ([06a3ca7](https://github.com/korchasa/flowai/commit/06a3ca7bd895ae2b01c84a32981ddbd568c40c44))
* add task planning and Q&A session guidelines ([e8f8c61](https://github.com/korchasa/flowai/commit/e8f8c612b1a96a8f1db88616fac2777696965807))
* add task-create-rule.md for Cursor IDE rule development ([3d02338](https://github.com/korchasa/flowai/commit/3d02338019a8f580f03b120b5796647c913d8a35))
* add task-write-skill.md for IDE Skill file creation ([8c7229a](https://github.com/korchasa/flowai/commit/8c7229a4a84c7a7a78fac7b0a72d4204205b48cb))
* **af-do:** clarify skill overview description ([4ec5488](https://github.com/korchasa/flowai/commit/4ec5488cc5c08d0aff1d1e6ce7890ed42beac30e))
* **AGENTS.md:** add TypeScript LSP plugin caveat for export ordering ([832a36c](https://github.com/korchasa/flowai/commit/832a36c5294a6f900143edea77908c9ea1da623e))
* **agents:** clarify TDD RED step scope ([df881c4](https://github.com/korchasa/flowai/commit/df881c4bd82fcd6140c84c87719f7ba8a19321fb))
* **agents:** reformulate session-start doc reading rule ([5b21688](https://github.com/korchasa/flowai/commit/5b21688e38296628b8b40d279d1c5b0bbf5ac54d))
* **agents:** update whiteboard references to per-session whiteboards directory ([2153967](https://github.com/korchasa/flowai/commit/21539671e3757273f6e86bb82ea3df58574d2c6e))
* allow Russian in whiteboard.md ([8bde511](https://github.com/korchasa/flowai/commit/8bde511d10728ff15b72e150a59976ee2bfefc15))
* **bench:** enhance README with Docker isolation details and improved benchmark execution instructions ([be05f93](https://github.com/korchasa/flowai/commit/be05f937e77aa9a5e9983c68561d357e3b76b848))
* capture priming lessons from flowai-maintenance output-contract rework ([5971f0f](https://github.com/korchasa/flowai/commit/5971f0f3d00ecd5670fbf164b3315ab66551698c))
* clarify documentation language requirements in RULE.md ([11520d5](https://github.com/korchasa/flowai/commit/11520d57412fe4ab5522a94605940aea7bbd05a7))
* clarify GIT_PAGER usage in task-commit.md ([f260fbf](https://github.com/korchasa/flowai/commit/f260fbfa73dd8c2bcbc01c065b6560feadcb3948))
* clean whiteboard — only remaining TODO items ([1a222f3](https://github.com/korchasa/flowai/commit/1a222f363611b002e158785c43fe902c445e4143))
* cleanup docs and tighten commit workflow guidelines ([33e1305](https://github.com/korchasa/flowai/commit/33e13057b104524068b44bd14a962daae87cb9ea))
* clear whiteboard after session ([cfd1531](https://github.com/korchasa/flowai/commit/cfd153154a3f6887f3c33f5a92e448e372423dae))
* **commands:** clarify commit and planning workflows ([7c1b725](https://github.com/korchasa/flowai/commit/7c1b725e86e111ab1fe582c7db2c3aa27bb2eb61))
* **commands:** sync task plan and do checklist ([2a5ff04](https://github.com/korchasa/flowai/commit/2a5ff04f215ff095507b76701e5a892df8a766c4))
* **cursor-desktop-guide:** add readonly field to subagent frontmatter schema ([8236012](https://github.com/korchasa/flowai/commit/8236012de0c2e81670710a3aae28445eea41e9cd))
* **cursor:** add task workflow docs and code style guidelines; remove legacy rules file ([217a4b1](https://github.com/korchasa/flowai/commit/217a4b1029da30eb92da10c5ce54254698d33ae2))
* delete CLAUDE.md ([0f4af28](https://github.com/korchasa/flowai/commit/0f4af283041a32cdbd7d96837a8f8256b22b13a8))
* enhance ides-difference documentation with dedicated AI ignore files and migration options for Claude Code ([3bf995e](https://github.com/korchasa/flowai/commit/3bf995e107c1e94ad97e00a1dd0a120d0634fb09))
* enhance README and AGENTS.md with developer workflow and agent reference ([b8b2333](https://github.com/korchasa/flowai/commit/b8b23338c44223623a1e4ad8ba43af5fbaf3a448))
* enhance README with comprehensive component lists and fixes ([231f8dc](https://github.com/korchasa/flowai/commit/231f8dcad37590d3ac52a86818e05de7dcd2f85b))
* enhance task planning guidelines in task-plan-with-qa.md ([2e01804](https://github.com/korchasa/flowai/commit/2e01804ae23c5f85c1764b35abecdd66875098da))
* enhance task-execute.md for improved clarity and consistency ([c5ef2ab](https://github.com/korchasa/flowai/commit/c5ef2ab06e207c05d49a15593e5d053c75159f72))
* expand documentation philosophy in README and update SRS ([1fbd6f9](https://github.com/korchasa/flowai/commit/1fbd6f994d705127bcb12d5ef42f33422ddb376b))
* expand GIT_PAGER examples in RULE.md ([e0ce7f5](https://github.com/korchasa/flowai/commit/e0ce7f5c98d439bccd650700f37652eb3e2de6c1))
* expand IDE hooks comparison and add contributor dev setup to README ([6794600](https://github.com/korchasa/flowai/commit/67946003e46c2af679417c2b2d87d06b20c87448))
* **framework:** add automation pack to AGENTS.md packs list ([5b0a964](https://github.com/korchasa/flowai/commit/5b0a9644ea64cbcc7a594cfbb319ae3ee107a32a))
* **ides-difference:** add OpenAI Codex CLI data across all comparison sections ([b24e05c](https://github.com/korchasa/flowai/commit/b24e05ce5ab8c8b80771399572ab1828be7a75c0))
* **ides:** add session/conversation history storage comparison ([c2e4522](https://github.com/korchasa/flowai/commit/c2e4522ded24ed692e48267229b6de2fcdd5e5fb))
* **maintenance:** fix typo in todo_write tool name ([ca64313](https://github.com/korchasa/flowai/commit/ca64313dfae1f50a09737dac18b71247b8ede4bb))
* **maintenance:** remove explicit whiteboard.md filename references ([3296c6a](https://github.com/korchasa/flowai/commit/3296c6abb56fc6b73c9c392ef321acf4e8e0cc15))
* mark af-reflect as benchmarked in SRS ([0fa6b03](https://github.com/korchasa/flowai/commit/0fa6b03ad50890107e236e599ba4bacc475e294f))
* mark FR-14/15/16 criteria as done with evidence, clean up settings.json ([a7d60f4](https://github.com/korchasa/flowai/commit/a7d60f4ca3d83e89680dea72555414b38664e9b3))
* merge RND control primitives data into ides-difference.md and remove source ([569a2d4](https://github.com/korchasa/flowai/commit/569a2d4d29fbae5f73a8527376dbba8a5d71bc15))
* overhaul prompt engineering guides for instant and reasoning models ([a964437](https://github.com/korchasa/flowai/commit/a96443724975ecc646754372b8b8ce6fed8d6728))
* **readme:** simplify README description to refer to Cursor rules ([9bcb414](https://github.com/korchasa/flowai/commit/9bcb4146569de680d4fdb8e0a0a86ed6460c28f1))
* refine control primitives comparison documentation ([52025d5](https://github.com/korchasa/flowai/commit/52025d5615a7c4fe7fb644ffbf38194f6c94c1b8))
* refine task planning guidelines in task-plan-with-qa.md ([cc20c10](https://github.com/korchasa/flowai/commit/cc20c10fce285e6d029d04910db02ccb8a043e81))
* refresh IDE differences with footnotes and new sections ([a3dcb29](https://github.com/korchasa/flowai/commit/a3dcb2936eb493e8c9704f5ec35f49b187db7d10))
* reinforce GIT_PAGER usage in RULE.md ([62b134d](https://github.com/korchasa/flowai/commit/62b134d53dcf0db182f3d1c145e57d48f7c7842f))
* remove duplicate build-in-ide-tools.md (data already in ides-difference.md) ([5f55dff](https://github.com/korchasa/flowai/commit/5f55dff9f74e5fd9f417835dedf7208a728ec3a6))
* remove interactive clarification requirement and AskQuestion tool references ([0c3acf1](https://github.com/korchasa/flowai/commit/0c3acf11bbfc9987a7a92655cc9e175435cff805))
* remove obsolete RnD documents ([10f68e2](https://github.com/korchasa/flowai/commit/10f68e238b090eede02dba3754a8e883c14d75ef))
* remove outdated task planning guidelines from task-plan-with-qa.md ([3c89134](https://github.com/korchasa/flowai/commit/3c89134477f73086425b9d7b9b17d5fbc1202783))
* remove Russian language requirement from howto-write-in-informational-style and adjust task-review guidance to drop language constraint and revise negative-aspects wording ([45495aa](https://github.com/korchasa/flowai/commit/45495aa12ca575df3d60ca818d3be7f0ad960b2a))
* rename "Steps" section to "Todo List" in all command docs ([905b24d](https://github.com/korchasa/flowai/commit/905b24d6cae20a217c10893b32f65f7b906ad2ec))
* rename FR IDs from numeric to mnemonic format across codebase ([cbb2a7e](https://github.com/korchasa/flowai/commit/cbb2a7ed5564ef90fc1b478bc15631c5bdf9a508))
* rename FR IDs from numeric to mnemonic format across codebase ([3d7a30d](https://github.com/korchasa/flowai/commit/3d7a30d1d9c697fa3a2b17fc16f1cd9b95b4897c))
* reorganize R&D documents and add new research notes ([3caad71](https://github.com/korchasa/flowai/commit/3caad71727ddb078fa4767acf25adba0481a863f))
* **requirements:** add FR-8 af-init, update FR-3/FR-6 status ([d16a22a](https://github.com/korchasa/flowai/commit/d16a22a0dc518bc4a1f8ec0b71c7622ac33f6081))
* **requirements:** mark FR-20.1–FR-20.11 as completed with evidence ([43048b2](https://github.com/korchasa/flowai/commit/43048b2a1d45e5f8f686c51bcd8090b4469c8085))
* resolve 7 contradictions across SRS, SDS, and AGENTS.md ([02b2116](https://github.com/korchasa/flowai/commit/02b2116dcc929da8850c897d381fc64e04e64d02))
* revise task-create-command documentation for clarity and structure ([82d1653](https://github.com/korchasa/flowai/commit/82d1653349d19d991031a16ac45c113bfc96b2ee))
* rewrite README with Assisted Engineering paradigm and multi-IDE focus ([54c9fcf](https://github.com/korchasa/flowai/commit/54c9fcf595bda4875eee701e24b9f2df9c8275ef))
* **rnd:** add Claude Code CLI feature analysis ([fd1e919](https://github.com/korchasa/flowai/commit/fd1e91973619ed20098da4f3bc3b1fac5924ff56))
* **rnd:** add Cursor subagent path to Custom Agents comparison ([7c795de](https://github.com/korchasa/flowai/commit/7c795debc928e06ad0b68e72601fa34ac45f3e13))
* **rnd:** add Hyperagents paper practical conclusions with evidence ([7f5d04e](https://github.com/korchasa/flowai/commit/7f5d04ee858f61f2abe07e2a793ab0f8c0b47946))
* **rnd:** add superpowers plugin analysis ([afa38f3](https://github.com/korchasa/flowai/commit/afa38f35de0b782055335a37dea41b8a85adcd5f))
* **rnd:** drop outdated rnd notes ([f311142](https://github.com/korchasa/flowai/commit/f311142162bef0f0d45e1e86429d06a7f1f1d2fb))
* simplify CODE STYLE RULES for TypeScript ([c21dcc7](https://github.com/korchasa/flowai/commit/c21dcc7b1f45d4d75e6e0715be7e6c09b79281b1))
* **spec:** add draft spec for skill versioning feature ([31b2a8d](https://github.com/korchasa/flowai/commit/31b2a8d8ad4e71f95a92a55ba435a7f9d0a115f7))
* **spec:** add skill versioning specification ([f7d9489](https://github.com/korchasa/flowai/commit/f7d9489db0560de88c25d2a6b95d3f1b646cdbcd))
* standardize Key Principles bullets in README with renamed categories (Stages, Rules, Documentation, Project Maintenance, Howto) ([e5405a6](https://github.com/korchasa/flowai/commit/e5405a6a9a83891558347075eaff0e80b4675ac3))
* sync documentation with current command set and workflows ([892eb45](https://github.com/korchasa/flowai/commit/892eb45e53772b52843e9698b404ba58a8bb1d3e))
* sync documentation with new commands ([0c0d4c7](https://github.com/korchasa/flowai/commit/0c0d4c76c6907a6fd8b95afbc53c96b2eb9b620a))
* **task-build-claude-md:** add manual execution restrictions and checklist to CLAUDE.md build guidance ([22b3db2](https://github.com/korchasa/flowai/commit/22b3db283d42c178ce383ba1d56ec33a211fbd37))
* **task-plan:** improve task planning workflow ([034f6e5](https://github.com/korchasa/flowai/commit/034f6e5cb812e51a1b80f36a00b35b10ccade8f8))
* update AGENTS.md generation instructions and checklist ([6b77f2f](https://github.com/korchasa/flowai/commit/6b77f2f3d7520d40441805474a4c0d25057bf366))
* update AGENTS.md with planning rules and dev commands ([b0fff37](https://github.com/korchasa/flowai/commit/b0fff37995b485e9f935f86b89498194cedec9f9))
* update available skills and commands in README ([39d7688](https://github.com/korchasa/flowai/commit/39d7688c9920cb8d9e81cabbb2587c1edc6335cc))
* update command list and count in project documentation ([4c4991d](https://github.com/korchasa/flowai/commit/4c4991dccb4890a23fef27b98453196215b81ec6))
* update command listings and remove references to non-existent run.ts ([0208b38](https://github.com/korchasa/flowai/commit/0208b38fb6e9772231b48deb566eafa5ed019f5b))
* update command references in design and README ([ce3597c](https://github.com/korchasa/flowai/commit/ce3597cebcc02aa0009dbc50c6614f92e8ccfa59))
* update control primitives comparison for cursor rules ([e0087fb](https://github.com/korchasa/flowai/commit/e0087fb25d9871b3c4455717e150d73e122e5b1e))
* update documentation guidelines in RULE.md ([81ec4b4](https://github.com/korchasa/flowai/commit/81ec4b4f95440231dfbfd2469c3e1a896db97f71))
* update FR-8, FR-10.8, FR-15.3, FR-16.3 statuses based on implementation audit ([9a16bda](https://github.com/korchasa/flowai/commit/9a16bda55a181b16a0d6b61f9b1bdf61a28249e4))
* update guide counts in requirements and design ([ce49029](https://github.com/korchasa/flowai/commit/ce49029722eb89d85d2674ba5b6d8ae1a43826cf))
* update IDE comparison — add plugin systems, remove Codex/Antigravity ([86a0fe7](https://github.com/korchasa/flowai/commit/86a0fe72aeb2f39d453fbc1129eecbdc74d0b0db))
* update IDE differences with Cursor Agent CLI findings and Claude Code details ([59fa77e](https://github.com/korchasa/flowai/commit/59fa77ed08f5ca5fdcd0f6f184712c4b089bb6e8))
* update ides-difference and whiteboard ([f1d7e4d](https://github.com/korchasa/flowai/commit/f1d7e4d95587cd92373338eb5f0aa0048d090624))
* update planning commands and related documentation ([b53989c](https://github.com/korchasa/flowai/commit/b53989c3411c1ac6b4b75151bee7a5ecee2d6cf9))
* update project rules and readme ([dec2feb](https://github.com/korchasa/flowai/commit/dec2feb6fa47ec05bd715304a88ec8cc791abc83))
* update README and requirements for post-0.3.2 changes ([a863f87](https://github.com/korchasa/flowai/commit/a863f874a233e0bfa6ec2c5fda65546ac22741c0))
* update README for monorepo structure ([0c42c67](https://github.com/korchasa/flowai/commit/0c42c67fb96a095d3e65eb9f18db46ec8a413aee))
* update README to reflect pack system, add to doc hierarchy ([3ba6e01](https://github.com/korchasa/flowai/commit/3ba6e01113eb6ea8a370412c1ba231b66a3ad2e2))
* update RULE.md to allow user language for notes ([5f9064b](https://github.com/korchasa/flowai/commit/5f9064b0e1618e054e5ed98d98a7477d76cd785c))
* update RULE.md to enforce GIT_PAGER usage ([2a8a563](https://github.com/korchasa/flowai/commit/2a8a563315da9271a93ce113b03fd2e627672ac2))
* update SDS with traceability model and agent name corrections ([60c2cb0](https://github.com/korchasa/flowai/commit/60c2cb0c5703a8a0011b5f4b25dd64006a7976ce))
* update SDS with traceability model and agent name corrections ([41bc9b5](https://github.com/korchasa/flowai/commit/41bc9b5f23f83affbe644ac2cb7e24dae2ebc23a))
* update SRS and SDS for af-init and dev commands configuration ([82e31fc](https://github.com/korchasa/flowai/commit/82e31fc2c8d7901bc609ad13c56378112a14a977))
* update SRS format with requirement numbering and acceptance criteria structure ([ec77a57](https://github.com/korchasa/flowai/commit/ec77a57822ea14fdd73e0cf38b0c0adfea096dd4))
* update SRS/SDS and add product vision ([b464e81](https://github.com/korchasa/flowai/commit/b464e81f9be6e52c8aa19ee2fa50b553ac5f9917))
* update SRS/SDS for single AGENTS.md architecture ([e766eb6](https://github.com/korchasa/flowai/commit/e766eb6868550131b4f7cf4fecc7801ea606ab8e))
* update task planning guidelines in task-plan.md ([c7b7772](https://github.com/korchasa/flowai/commit/c7b7772554426e5b79d10eb5b5909ddddd636614))
* update task-answer documentation for clarity and response handling ([0f63f49](https://github.com/korchasa/flowai/commit/0f63f49555c60ca4a5872d3c85f6a90a06762b24))
* update task-check-analyze and task-generate-agents command documentation ([ed35c23](https://github.com/korchasa/flowai/commit/ed35c236fd621cadd657dc0c825dde66fa36771a))
* update task-commit.md to enforce GIT_PAGER usage ([3684c1f](https://github.com/korchasa/flowai/commit/3684c1f921edad9f99e27bdbb0a4b5c2d5f4fa34))
* update task-execute.md to clarify documentation requirements ([76a5171](https://github.com/korchasa/flowai/commit/76a51713399f7ff54aca5af5db1c3c411a8686da))
* update TS strict code style rules to emphasize pure functions and immutability ([18f5710](https://github.com/korchasa/flowai/commit/18f57108fa80f2050512a299d67a176c6e463d1a))
* update whiteboard — ai-skel-ts removed from framework ([e5c3c66](https://github.com/korchasa/flowai/commit/e5c3c662d4eff73180a62c9e369f17e8176c3ec2))
* update whiteboard — P4 resolved ([9982df6](https://github.com/korchasa/flowai/commit/9982df6a5ed3605c728acc1cec0f52570168fb57))
* update whiteboard — P5 resolved ([428200c](https://github.com/korchasa/flowai/commit/428200c6f07b591b62a58ed9479ca38ac3b0c71d))
* update whiteboard — P6 partially resolved ([efbb5fd](https://github.com/korchasa/flowai/commit/efbb5fd0256631ee769f5efb338c1ff47207f08a))
* update whiteboard with deep research skill redesign plan ([d08fa20](https://github.com/korchasa/flowai/commit/d08fa200edc7ccb9165085721af5042e65eb089d))
* update whiteboard with packs plan, add plugin bundles comparison, remove stale spec ([6dcc931](https://github.com/korchasa/flowai/commit/6dcc9311698a2f7fa1ed925581fbe412b3242ce5))
* **versioning:** add draft spec for per-skill semantic versioning ([f0c33fa](https://github.com/korchasa/flowai/commit/f0c33fa1334a7ac52e4a4487f1b46041bb833462))


### Tests

* **af-init:** add idempotency benchmark scenario ([f24edaf](https://github.com/korchasa/flowai/commit/f24edaf687c71c41261e6548725fec5661061a63))
* **bench:** add adapt-all benchmark for full primitive adaptation ([fdcf66c](https://github.com/korchasa/flowai/commit/fdcf66cee10d791e3636a66dec69eb9a098cc278))
* **bench:** add af-init benchmarks and fix runner ([fc90452](https://github.com/korchasa/flowai/commit/fc90452b388a2196e71b3866fa64081257ba6fe1))
* **benchmarks:** add auto-docs scenarios and .flowai.yaml config ([5c98036](https://github.com/korchasa/flowai/commit/5c98036a269d173010c3a282d95a50cc86c03b85))
* **cli:** add commands field to FlowConfig fixtures in main_test ([76fc2bc](https://github.com/korchasa/flowai/commit/76fc2bc332637e4886ae0758fb663af072c6663a))
* **flow-review-and-commit:** add suggest-reflect benchmark scenarios ([bb9010a](https://github.com/korchasa/flowai/commit/bb9010a251c8c27d1f58294c9a45db2a56d38b8f))
* migrate benchmarks and skills to single AGENTS.md ([f2122c4](https://github.com/korchasa/flowai/commit/f2122c481a1a5eae36fec4a96001a3a29771003b))


### Code Refactoring

* adapt trace generator to tasks.guru style and colors ([8590369](https://github.com/korchasa/flowai/commit/85903695892c7c1e733e8411da3dd8a4626f1dd8))
* add flowai- prefix to all framework hooks and agents ([582914e](https://github.com/korchasa/flowai/commit/582914e744e19245f3196e20a47c4c28a32f7257))
* **af-commit:** simplify atomic commit rules for logical grouping ([bee11e6](https://github.com/korchasa/flowai/commit/bee11e6a08c86747139e0702e2bd35446e33c275))
* **af-commit:** update commit rules and instructions ([410140e](https://github.com/korchasa/flowai/commit/410140e5238b96a78e89b26c70b2940c93935655))
* **af-plan:** deduplicate planning rules, reference AGENTS.md ([cc5cabd](https://github.com/korchasa/flowai/commit/cc5cabde74de02552bd696e506cd87fd9a70d011))
* **agent:** restrict flowai-skill-adapter to Bash-only tools ([6516bb5](https://github.com/korchasa/flowai/commit/6516bb56abd134a3e9d29af14d07c512b18c05c5))
* **agents:** remove explicit model declarations from agent frontmatter ([db909cc](https://github.com/korchasa/flowai/commit/db909ccfd114540f36c57d3425dcf2ac4db2cb47))
* **agents:** restructure to per-IDE subdirs with frontmatter validation ([8684dbb](https://github.com/korchasa/flowai/commit/8684dbb71f71d9d450b8540332fc8da27fd14894))
* **agents:** update flow-skill-executor ([8f15742](https://github.com/korchasa/flowai/commit/8f15742a5d591f657227b6d89794f4da83bd0ade))
* **benchmarks:** expand benchmark coverage and compress docs to reference benchmarks ([455c6a2](https://github.com/korchasa/flowai/commit/455c6a237fea82a1cad87c095105e47c39c674f1))
* **benchmarks:** improve judge evidence, fix score calculation, add safety ([5cccd5b](https://github.com/korchasa/flowai/commit/5cccd5b32101ccf6e4ccf9f1d4df01c2329df8e8))
* **benchmarks:** migrate to @bench/ import map and clean up checklist types ([aee77db](https://github.com/korchasa/flowai/commit/aee77db8b73241fccb153909960ed9a41cd999f0))
* **benchmarks:** require agentsTemplateVars, remove legacy agentsMarkdown ([4668f65](https://github.com/korchasa/flowai/commit/4668f656d6e8fed074499afe857795e11ecf8f84))
* **benchmarks:** split trace.ts into modular architecture ([83107ea](https://github.com/korchasa/flowai/commit/83107ea1c00c811671cfbf51e3d606247f4fec6d))
* **catalog:** remove flow-execute and flow-plan agents ([8162464](https://github.com/korchasa/flowai/commit/8162464265cb46c0ebc6b29263394c345027e10d))
* **catalog:** remove flow-skill-debug-by-playwright ([c2d338d](https://github.com/korchasa/flowai/commit/c2d338dbcc43360e7530e411aef137df21799150))
* **catalog:** update flow-do, flow-engineer-subagent, flow-execute, flow-auto skills ([a8599b5](https://github.com/korchasa/flowai/commit/a8599b5ca9a0d24216a44b767c482571a933f081))
* **catalog:** update flow-init skill and AGENTS template ([e583524](https://github.com/korchasa/flowai/commit/e583524296d121f4d822c91dd1d760b2b5829e43))
* **catalog:** update flow-maintenance and flow-reflect skills ([765eba9](https://github.com/korchasa/flowai/commit/765eba96b3cc223d6818622130c4dfb117715de9))
* **catalog:** update flow-skill guides ([7fd2976](https://github.com/korchasa/flowai/commit/7fd2976ae6dcc11adc20629ab6377923c47ccab1))
* **cli:** extract local sync into standalone deno task ([2e4965d](https://github.com/korchasa/flowai/commit/2e4965d52a505f9a8413aaab7be7ef49b7ae9317))
* **cli:** split sync.ts god object into focused modules, fix docs ([832d1aa](https://github.com/korchasa/flowai/commit/832d1aafda87cf589228b572fd6ab09606e40ac7))
* co-locate benchmarks with skills (FR-7.1) ([0927be7](https://github.com/korchasa/flowai/commit/0927be72625539de01a27622496b910dc510893b))
* **commands:** consolidate planning workflows and enhance GODS framework ([14a4afa](https://github.com/korchasa/flowai/commit/14a4afabaddc66226163d529d529ab208891f0b5))
* **commands:** drop task prefix from command files ([8ca231b](https://github.com/korchasa/flowai/commit/8ca231b9c35c736c3c2a6f705e497aa09b447613))
* **commands:** integrate BED-LLM algorithm details into workflow steps ([e9664e0](https://github.com/korchasa/flowai/commit/e9664e0c464896522e821b1dbd2fe6424b6fce50))
* **commands:** remove AskQuestion tool references ([730f2c4](https://github.com/korchasa/flowai/commit/730f2c4c56b7d56da062bbb2feca6a4499f9e1d9))
* **commands:** remove plan-and-execute command ([4c7b591](https://github.com/korchasa/flowai/commit/4c7b5914569bebf6e3eee4e07479af2fe83020a6))
* **commands:** remove unused command files and update documentation ([7285577](https://github.com/korchasa/flowai/commit/72855774b208b163700dc83e0a81c6924aec4fc2))
* **commands:** rename alpha-task-build-claude-md to task-build-agents-md ([3407e1a](https://github.com/korchasa/flowai/commit/3407e1a8ecb41a38c8c368ed113f5d2732855284))
* **commands:** rename validation checklist to verification ([8e55e48](https://github.com/korchasa/flowai/commit/8e55e4872fd53fec8d7f5bbeec8e7ebe48f1d182))
* **commands:** reorganize investigation and analysis workflows ([7238aab](https://github.com/korchasa/flowai/commit/7238aab0f07ed6db9e50ed4225ffe128746da229))
* **core:** remove flowai-skill-executor agent ([6d2a96b](https://github.com/korchasa/flowai/commit/6d2a96bf15dda71d2ddf06a2e9748eadb08d425e))
* **cursor:** convert GODS rule to how-to guide ([673c88d](https://github.com/korchasa/flowai/commit/673c88d3698c24a5c1574ee8f89846ca53fda824))
* **devcontainer-skill:** replace Keychain auth-forwarding with fully manual auth policy ([28f5f42](https://github.com/korchasa/flowai/commit/28f5f42ddc8eb17e0144bf1761e6de0796766bb0))
* **devcontainer:** align project config with new Auth Policy and SKILL.md rules ([df70091](https://github.com/korchasa/flowai/commit/df70091f3f3df3673d22c6981890e0c443a2e69e))
* **docs:** remove standalone vision.md, consolidate into AGENTS.md ([c1e2dfc](https://github.com/korchasa/flowai/commit/c1e2dfcaa4fa1124cbf8f99ce26e57a57fff661f))
* extract experiments subsystem to flowai-experiments repo ([32ece08](https://github.com/korchasa/flowai/commit/32ece080e25c4c5ba315512b376b8fda67a1e272))
* **extract-claude-code-prompt:** support JS bundles and add helper scripts ([0cc6ac4](https://github.com/korchasa/flowai/commit/0cc6ac40dc6bc114924ca6a2a76361a0d3b5ffdd))
* **flow-init:** make TDD commands in AGENTS.template generic ([8e9ab34](https://github.com/korchasa/flowai/commit/8e9ab34e089b002acb79faed1c3e99c7b2b8c004))
* **flow-init:** merge analyze/inventory/verify into single script output ([f77ea17](https://github.com/korchasa/flowai/commit/f77ea1723bbc53c8f6700d57210511cef3decda2))
* **flow-init:** replace manifest-driven generation with agent-native approach ([f7f6a07](https://github.com/korchasa/flowai/commit/f7f6a079305407a4eaf618ed6140b3ab897ed4e3))
* **flowai-maintenance:** deliver findings inline instead of saving to task file ([81f9f1b](https://github.com/korchasa/flowai/commit/81f9f1be4450b22d22d48e333eedb86796d96e93))
* **framework:** merge three AGENTS.md templates into one ([d0d31bb](https://github.com/korchasa/flowai/commit/d0d31bbac9fc45a4fc0a36716d628a2992c6bbb6))
* **framework:** remove adapted frontmatter field ([ba887ff](https://github.com/korchasa/flowai/commit/ba887ff416ab4554ee6cc14bfb3b8ce167f4b20f))
* **framework:** remove flow-skill-ai-skel-ts (moved to ai-skel-ts library) ([5e6a304](https://github.com/korchasa/flowai/commit/5e6a304aab9d960b9b3388d68996c03b297f79cd))
* **framework:** split commands from skills into sibling dirs ([fa8beb2](https://github.com/korchasa/flowai/commit/fa8beb21a06987825ef30c3c5a9c8cf3f951b1da))
* **install:** remove shell bootstrap and fix process hang on exit ([8cad430](https://github.com/korchasa/flowai/commit/8cad430f7d8a999c6874f6db0a15a95bd7193288))
* merge flow-cli submodule into monorepo ([eb6d983](https://github.com/korchasa/flowai/commit/eb6d9836023e7e10b837136fa202726e4a34bbe1))
* **pipeline:** add flowai- prefix to all pipeline pack primitives ([bd5ef53](https://github.com/korchasa/flowai/commit/bd5ef537fa8c3d05f2ce3cf6b2b10f4142b95d80))
* **pipeline:** rename .flow/ to .flowai/ and move engineer-pipeline skill ([19cb55b](https://github.com/korchasa/flowai/commit/19cb55b2ddeab8cec9debbd0db60637862a1bd20))
* **pipeline:** rename automation→pipeline pack, inline PM into orchestrator, fix test-fitting in benchmarks ([97a3639](https://github.com/korchasa/flowai/commit/97a3639cf1d03d1a0adc8eb4732d2ab3340d8706))
* **project:** reorganize file structure into .cursor/ directories ([8b46177](https://github.com/korchasa/flowai/commit/8b46177de97a71f3a7690b2b1174a53837993a24))
* reclassify skill types — engineer→skill, setup→setup-agent ([ff1b347](https://github.com/korchasa/flowai/commit/ff1b347c79f9e6fef07df744478cd2687b034cd5))
* remove flowai-session-init-docs hook and sessionDocs config ([74b4b70](https://github.com/korchasa/flowai/commit/74b4b70eac8275c45000eb52f9c2e717e743bd43))
* remove flowai-session-init-docs hook and sessionDocs config ([f2f6455](https://github.com/korchasa/flowai/commit/f2f64555eef871d27b7fbc709d7458a785d9c6a6))
* remove lint-on-write and test-before-commit from framework hooks ([ae26c5a](https://github.com/korchasa/flowai/commit/ae26c5ac69e212f995c703dbcb382a71c84eede8))
* remove lint-on-write and test-before-commit from framework hooks ([47d39fa](https://github.com/korchasa/flowai/commit/47d39fa1fb521b6f4322c8bd6537a16ebfe947ad))
* remove pipeline pack and all references ([bb1a1d1](https://github.com/korchasa/flowai/commit/bb1a1d1b907a445f3d52c617b023e9ae034465bb))
* remove settings.json to simplify configuration ([311a8b9](https://github.com/korchasa/flowai/commit/311a8b935dbe5f8a2df77e7ef1e8a0017f2c2bb8))
* rename af-* prefix to flow-* ([da1e32b](https://github.com/korchasa/flowai/commit/da1e32b2ab7e84a6fba9e470fc5071e9f14058dd))
* rename agents to flow-* convention and update references ([91023e2](https://github.com/korchasa/flowai/commit/91023e2799d3619061e95fd2069fb810c255eb21))
* rename AssistFlow to flowai across the project ([b1b42eb](https://github.com/korchasa/flowai/commit/b1b42eb4adb05ee50980f97034a2f3ea7a5112fc))
* rename catalog/ to framework/ ([f6ab187](https://github.com/korchasa/flowai/commit/f6ab1876a070aa6391acaf3433cdf878a2970963))
* rename create-deno-scripts command to create-scripts ([649ccd4](https://github.com/korchasa/flowai/commit/649ccd4f089aa1909cdf5b780a85aa6a5f0e7da5))
* rename Deno skills to follow flow-skill-* convention ([01d8ca8](https://github.com/korchasa/flowai/commit/01d8ca8161ec64998b3a9e517ef309ec078cb0d9))
* rename flow-cli → flowai ([218bdc5](https://github.com/korchasa/flowai/commit/218bdc5f2c21a50b9ea0579a8f7acc622348e1d6))
* rename test files to Deno _test.ts convention ([b41b97b](https://github.com/korchasa/flowai/commit/b41b97b34a8f79500ae480bc3159330c20f64420))
* rename whiteboards to tasks, flowai-spec to flowai-epic ([58739e8](https://github.com/korchasa/flowai/commit/58739e8d67a311e9e4ce258166483a81a0736c06))
* replace flow-skill-configure-strict-typescript with setup-code-style ([7938015](https://github.com/korchasa/flowai/commit/7938015af66ee825781f95bf21dd998f3a1a30f9))
* replace session-start doc reading with per-skill lazy SRS/SDS instructions ([06fa516](https://github.com/korchasa/flowai/commit/06fa516608b9bb677e39eb8e23d50072ad6fb0b2))
* **rules:** migrate .mdc files to directory-based RULE.md structure ([be73683](https://github.com/korchasa/flowai/commit/be73683abbd9aa3a44fab4d251ae35b7d1c4d261))
* **rules:** remove iOS-specific requirements from main-example rule ([b901ab4](https://github.com/korchasa/flowai/commit/b901ab45d0d2137738f88c36a276ca1b3fbcaabf))
* **scripts/benchmarks:** remove three-template runner branches ([fbc06d0](https://github.com/korchasa/flowai/commit/fbc06d0b60b9782d14de834155d14893b5180b91))
* simplify .gitignore by consolidating .claude entries ([ef5b62b](https://github.com/korchasa/flowai/commit/ef5b62bd0816be3ba404a919e84edf64a9923855))
* **skill:** make extract-claude-code-prompt binary-only and external ([24e6339](https://github.com/korchasa/flowai/commit/24e63396bfbde2168d722645930694e5b8b1c76a))
* **skills:** generalize task management tool description ([1754223](https://github.com/korchasa/flowai/commit/17542235b7639056f451f667d6644129b765f9be))
* **skills:** make flowai-init/flowai-update stack-agnostic for command configuration ([716c4e5](https://github.com/korchasa/flowai/commit/716c4e55a2e1c75bd983b40808bdc1b2ecbe7517))
* **skills:** remove flow-do and flow-execute, superseded by AGENTS.md rules ([c8fde03](https://github.com/korchasa/flowai/commit/c8fde033a67f5b1f6e01abdd5c25587e6481bfd5))
* **skills:** remove obsolete flow-auto and flow-convert-cursor-to-claude skills ([d55f608](https://github.com/korchasa/flowai/commit/d55f60894401c769e8074efb59a5e99358232de3))
* **skills:** rename flow-skill-manage-github-tickets-by-mcp → flow-skill-manage-github-tickets ([cc1bad0](https://github.com/korchasa/flowai/commit/cc1bad029c0d5b4e3779e78b5f5b7078240b6d95))
* **skills:** rename flow-skill-playwright-cli → flow-skill-browser-automation ([bd310b8](https://github.com/korchasa/flowai/commit/bd310b869f3ebb735c7d8d8d9cbb69db0a03a585))
* streamline task-create-command.md for clarity and structure ([c806078](https://github.com/korchasa/flowai/commit/c806078f49f42ffaf2d67afb95c3c2b1af53d62a))
* **task-link:** create per-item symlinks from .dev/ and framework/ into IDE dirs ([b3e7c66](https://github.com/korchasa/flowai/commit/b3e7c66981fcb860512702b422eabdf243f2e8a0))
* update do command steps for clarity and verification ([cf48c4c](https://github.com/korchasa/flowai/commit/cf48c4c3bb2edf29a62a6cc7b20e34e42ca2a914))
* update fix attempt rules to use 5-why analysis ([7ce1578](https://github.com/korchasa/flowai/commit/7ce15785f937abc39c87f6406ac4f0a1ebe36d8a))


### Styles

* **agents:** normalize markdown formatting in agent definitions ([b1bc8d1](https://github.com/korchasa/flowai/commit/b1bc8d1ece5b9a489ed20b1f0866063e8e31c720))
* apply deno fmt formatting ([14a4480](https://github.com/korchasa/flowai/commit/14a448056591c749b0af7105200f6f4bf489bf6f))
* **benchmarks:** apply deno fmt formatting ([5e4d78d](https://github.com/korchasa/flowai/commit/5e4d78ddfb317936c46d11f70a98842b1d05406c))
* **benchmarks:** fix quote consistency in consolidate scenario ([3b8d006](https://github.com/korchasa/flowai/commit/3b8d006f800ecf9a387451aca5d134dd780589f0))
* **cli:** apply deno fmt to hooks.ts and migrate.ts ([37802db](https://github.com/korchasa/flowai/commit/37802dbe06e25a896a49eb8b3031336ced561945))
* **cli:** fix formatting after merge conflict resolution ([5b5384a](https://github.com/korchasa/flowai/commit/5b5384aff06e5916a8823ee47b7e364050d5273e))
* **cursor:** add dependency injection rules for TypeScript classes ([e388495](https://github.com/korchasa/flowai/commit/e38849505fd91190b351563d48cc247882500d64))
* **cursor:** unify headings and formatting in rules and commands ([f6eedc5](https://github.com/korchasa/flowai/commit/f6eedc5be477f69ecc409f9fc061ffb3d2189c01))
* fix trailing whitespace in deno-cli skill ([b1ba46c](https://github.com/korchasa/flowai/commit/b1ba46c6ceff064af92e8bd01fa59266bc1b07bf))
* format benchmark code ([0136679](https://github.com/korchasa/flowai/commit/0136679876e3bc161e21ebafb9fb25685f578faa))
* format cursor skills and agents documentation ([8dc8693](https://github.com/korchasa/flowai/commit/8dc869338c0b2c0dcbea1620028d1d14db63b3d4))
* reformat HTML assets for current Deno fmt rules ([b1739a3](https://github.com/korchasa/flowai/commit/b1739a3634739b72a54bc31b0f1791b280bd1093))
* reformat HTML assets for Deno 2.7.11 fmt rules ([446e2ed](https://github.com/korchasa/flowai/commit/446e2ed220c3bec2eeb56a2e445a49fdbace13e4))
* remove backticks from todo_write in SKILL.md files ([4e62f0d](https://github.com/korchasa/flowai/commit/4e62f0d908ecdfce3857640d4209755400ebe4cb))
* remove emojis from benchmark writing skill ([f72e456](https://github.com/korchasa/flowai/commit/f72e4563ac51d753f85fdf0fc6228a0e8ac90404))
* sync .claude/ from framework and apply formatting fixes ([bec1efb](https://github.com/korchasa/flowai/commit/bec1efbcde39f19cbb59549447fc19b5268d7cc9))


### Chores

* add dev agents/skills, cleanup stale hook references ([7387202](https://github.com/korchasa/flowai/commit/73872022a74b1a40750ef8a4f9278c33ba1933ab))
* add session-init-docs hook config, format memory files ([8f5909d](https://github.com/korchasa/flowai/commit/8f5909d44617f542f244da26b8b719c018b3da4b))
* add worktrees configuration ([985a756](https://github.com/korchasa/flowai/commit/985a75672783c4022109a1c161d4616a7d084400))
* **benchmarks:** tune scenario timeouts, interactive mode, and params ([9eab6b3](https://github.com/korchasa/flowai/commit/9eab6b31ef71424cfb60fb55f5d34073efc4e81f))
* cleanup obsolete rules and update task command instructions ([6034fca](https://github.com/korchasa/flowai/commit/6034fca04ca56796ac5349f842468025e3e8649e))
* **commands:** move build CLAUDE to alpha draft ([107cdfe](https://github.com/korchasa/flowai/commit/107cdfec04029fdb868d0e6fe7652caf9e4dfbb7))
* configure sessionDocs for session-init-docs hook ([767b75f](https://github.com/korchasa/flowai/commit/767b75ff77c2634173fad535372a8e57b9bbb139))
* configure sessionDocs for session-init-docs hook ([c2ab3ec](https://github.com/korchasa/flowai/commit/c2ab3ec3d58af1d791fe8d7ccc37470323d89419))
* **cursor:** update commands and add Dockerfile rules ([773c1d1](https://github.com/korchasa/flowai/commit/773c1d18be321c504786a8769690dfbebaccc46b))
* **framework:** update flowai framework ([85785f0](https://github.com/korchasa/flowai/commit/85785f0291b32a411f0592f9a4a77477fbca2376))
* **framework:** update flowai framework ([a36e2d1](https://github.com/korchasa/flowai/commit/a36e2d184bef37f1e6b5e491677ee2a5aaa06459))
* **framework:** update flowai framework ([1c76d18](https://github.com/korchasa/flowai/commit/1c76d18db893ced8cd08c057acdf97ac42523c3d))
* **framework:** update flowai framework ([f1eb946](https://github.com/korchasa/flowai/commit/f1eb946660ef312029053835ebb915030f9824b1))
* **framework:** update flowai framework to 0.4.18 ([7ea38d0](https://github.com/korchasa/flowai/commit/7ea38d011fa27e37a59c50dcc3f7d654844f23fa))
* gitignore pipeline runs and update flowai config ([5de6f90](https://github.com/korchasa/flowai/commit/5de6f90d1b3e9a27668024f005fe4ac9b4510245))
* maintenance sweep — refactor trace.ts, fix design.md, add AGENTS.md and JSDoc ([db8f09c](https://github.com/korchasa/flowai/commit/db8f09cf917098faab49bb086fabdd269eaea734))
* **release:** 0.3.0 ([c30b32d](https://github.com/korchasa/flowai/commit/c30b32d76d2bcebbe3f8334836ae05cb4f3b0033))
* **release:** 0.3.1 ([969cf65](https://github.com/korchasa/flowai/commit/969cf656251ba70cef1141584b009bacb95fa253))
* **release:** 0.3.2 ([8708735](https://github.com/korchasa/flowai/commit/8708735f2c05181e54103ad805f1f281b7e4a802))
* **release:** 0.3.3 ([80fa147](https://github.com/korchasa/flowai/commit/80fa1470eed7b4dbdc962b0e6b55351c9b353503))
* **release:** 0.3.4 ([3718677](https://github.com/korchasa/flowai/commit/371867786107c0ccef134e1562599cbe6faa74cc))
* **release:** 0.3.5 ([57c9c6d](https://github.com/korchasa/flowai/commit/57c9c6df5884fd210141d04aa65f1ff2a3688426))
* **release:** 0.3.6 ([39500cd](https://github.com/korchasa/flowai/commit/39500cdf263bf086b2b54d961fd5e74b65c2642e))
* **release:** 0.3.7 ([0071ef2](https://github.com/korchasa/flowai/commit/0071ef24f98627ae7d5294bf3d0012e17557ec00))
* **release:** 0.3.8 ([4a0ff3f](https://github.com/korchasa/flowai/commit/4a0ff3f231be94e23f89c89d44fb22a670827d5d))
* **release:** 0.3.9 ([9def3c1](https://github.com/korchasa/flowai/commit/9def3c1db450aaa72d4aa986a6aa283a048039f6))
* **release:** 0.4.0 ([9b2d943](https://github.com/korchasa/flowai/commit/9b2d94387ebed6adcece9c30f315056e79aa596c))
* **release:** 0.4.1 ([75b8299](https://github.com/korchasa/flowai/commit/75b8299d835dc569e0c59f26850fc1a13bd328e6))
* **release:** 0.4.10 ([eb97966](https://github.com/korchasa/flowai/commit/eb9796696fb8669875a32b657a76bb4d922e07e7))
* **release:** 0.4.11 ([69ea503](https://github.com/korchasa/flowai/commit/69ea503d600b2d4b6f65de8626907937c040c7ab))
* **release:** 0.4.12 ([74d2f3b](https://github.com/korchasa/flowai/commit/74d2f3bb8f8bbfaca6bf5ba24d5070a3caecd65c))
* **release:** 0.4.13 ([8799598](https://github.com/korchasa/flowai/commit/87995987f52c9e4e6f3eaaa1a6d7c0d6f7c80abf))
* **release:** 0.4.14 ([c90d432](https://github.com/korchasa/flowai/commit/c90d432a4b20e4cb14fb804a93b010bce508db6d))
* **release:** 0.4.15 ([019a943](https://github.com/korchasa/flowai/commit/019a9430b63a58ab08ccb4fe5216ea43099e5e3a))
* **release:** 0.4.16 ([2003f0f](https://github.com/korchasa/flowai/commit/2003f0f325d229baeaf03a405188809e7b2a4599))
* **release:** 0.4.17 ([26d00e6](https://github.com/korchasa/flowai/commit/26d00e6dd8428f8a1a56d5fffd4acef3904bf109))
* **release:** 0.4.18 ([b2613e5](https://github.com/korchasa/flowai/commit/b2613e541d6020353edd5166ecde060332835dd6))
* **release:** 0.4.19 ([18f8d25](https://github.com/korchasa/flowai/commit/18f8d25c2430841b5afd9d429684cc7fb3b05b16))
* **release:** 0.4.2 ([cecef7c](https://github.com/korchasa/flowai/commit/cecef7c7feb2ef531bbde6fd5af965b724ea8141))
* **release:** 0.4.20 ([e3f287f](https://github.com/korchasa/flowai/commit/e3f287ffc3bb4b730731cc828ec54a294b782eee))
* **release:** 0.4.3 ([d1b5e62](https://github.com/korchasa/flowai/commit/d1b5e6295bcec192989ed03f3f0d320ae244589a))
* **release:** 0.4.4 ([27435d0](https://github.com/korchasa/flowai/commit/27435d0bc1e9aa63904b172f2f014a197b954d71))
* **release:** 0.4.5 ([4629ce9](https://github.com/korchasa/flowai/commit/4629ce96d7c23f1e290b7f5789d7639f47fb3e82))
* **release:** 0.4.6 ([239e908](https://github.com/korchasa/flowai/commit/239e90877d85ff130acd832f7bef5fe16fb1adb8))
* **release:** 0.4.7 ([db68a26](https://github.com/korchasa/flowai/commit/db68a2669309d8a1379e2df32ac0676795f63bbe))
* **release:** 0.4.8 ([c5538be](https://github.com/korchasa/flowai/commit/c5538beaa727911ce74cb30005d8dada2561c3b0))
* **release:** 0.4.9 ([f920c42](https://github.com/korchasa/flowai/commit/f920c423ddc0f72e80db57be9230d3104c4ef0e6))
* **release:** 0.5.0 ([1d4c4df](https://github.com/korchasa/flowai/commit/1d4c4dfb0d4c237f6d00542de5a23a99d81a0422))
* **release:** 0.6.0 ([f0a9b2a](https://github.com/korchasa/flowai/commit/f0a9b2a316c82ca13dd36079439cfaab55d0f6af))
* **release:** 0.7.0 ([d66574b](https://github.com/korchasa/flowai/commit/d66574b85567ed81eaa8d86617d066faef198394))
* remove .claude/ from tracking and add to .gitignore ([41b7a20](https://github.com/korchasa/flowai/commit/41b7a207712b9378e1a5d37245ef4fb338010394))
* remove .flowai/runs/ from tracking ([c476da3](https://github.com/korchasa/flowai/commit/c476da35a88647de3d1e826ece78fb3e41adb928))
* remove deprecated commands and rules ([d35ff91](https://github.com/korchasa/flowai/commit/d35ff9159dd3ab3a1aad1d920f31f9185330023d))
* remove deprecated settings.json and whiteboard.md files ([099dec0](https://github.com/korchasa/flowai/commit/099dec056c3e366f9a1da06cb335f3fa3b12b7b9))
* remove flowai-skill-example and prevent re-creation ([e900e3e](https://github.com/korchasa/flowai/commit/e900e3e74ee5fdede74bad6f2fec25bfbfbf4d6e))
* remove obsolete R&D tasks format documentation ([96bb277](https://github.com/korchasa/flowai/commit/96bb27799fc03f5cf2908594fc60acc257235652))
* remove write-skill command ([c099095](https://github.com/korchasa/flowai/commit/c099095c935357ec322262b508143f071f2adc90))
* **repo:** collapse legacy three-file AGENTS.md layout ([28a4970](https://github.com/korchasa/flowai/commit/28a4970e752c6e5c1b29ee1453d0112f922e2b1a))
* **scripts:** add IDE environment detection utility script ([6261118](https://github.com/korchasa/flowai/commit/62611187972ba799669d4fcc2fd3cee77196e90f))
* sync framework skills/agents via flow-cli ([2a6db9a](https://github.com/korchasa/flowai/commit/2a6db9a070f47c0b15cdfbb7571856a393e56e7b))
* update .gitignore and add .cursorignore ([800f44a](https://github.com/korchasa/flowai/commit/800f44a1c90cba60be40b2eb276b975bc197d8d9))
* update .gitignore and enhance README with new command descriptions ([8ec97a5](https://github.com/korchasa/flowai/commit/8ec97a5e846b701f2281f0b3bf3fd1a0158f7e66))
* update .gitignore to ignore .vscode ([553c382](https://github.com/korchasa/flowai/commit/553c382ca7bccc677a06bb090e1ef063719fbde3))
* update .gitignore to ignore documents directory ([5a4ee0b](https://github.com/korchasa/flowai/commit/5a4ee0b277047079e8adbfd1568aec1a9acf0a16))
* update flow-cli submodule (PATH docs) ([70671e8](https://github.com/korchasa/flowai/commit/70671e8a28ced0714b03de75ec9b1672bb5c9cdd))
* Update project files and add README.md ([1cb69ba](https://github.com/korchasa/flowai/commit/1cb69baace274ed8c00a131309d265363257540b))
* update repo scaffolding and cleanup ([324ce4e](https://github.com/korchasa/flowai/commit/324ce4e59a416475269a60151340184a93f0d25b))
* update repo URL korchasa/flow → korchasa/flowai ([6b348ac](https://github.com/korchasa/flowai/commit/6b348acb1c1ac10603e671a1075e9cb4d5ae7c15))
* **vscode:** remove .vscode/settings.json ([5fedb82](https://github.com/korchasa/flowai/commit/5fedb82e652d8bedebe20b949679520c79d28e48))

## 0.7.0 (2026-04-12)


### ⚠ BREAKING CHANGES

* **framework:** framework/core/assets/ no longer ships
AGENTS.documents.template.md or AGENTS.scripts.template.md.
pack.yaml `assets:` map is now single-entry. Downstream
projects must run `/flowai-update` to collapse their legacy
three-file AGENTS.md layout; `flowai-update` detects the
legacy layout and guides a per-file confirmation merge.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
* All skill names changed from af-* to flow-*.
Commands like /af-commit are now /flow-commit.

Co-authored-by: Cursor <cursoragent@cursor.com>
* **rules:** Rule files moved from .mdc extension to RULE.md in directories.
Cursor IDE will automatically detect and load rules from new structure.

### Features

* add 'fail fast' strategy to AGENTS rules ([8557845](https://github.com/korchasa/flowai/commit/855784514d0a54f89cfa03ee9141a3ec263cedc1))
* add af-skill-generate-code and context-inefficiency benchmark scenario ([bcd1d50](https://github.com/korchasa/flowai/commit/bcd1d5062dc608217a35a8056c906dfb13d2dac6))
* add Cursor desktop and OpenCode guides to skills catalog ([ed5718e](https://github.com/korchasa/flowai/commit/ed5718eff822af1921085dfc0479fcc17571df05))
* add extract-claude-code-prompt skill for prompt reverse-engineering ([16466f2](https://github.com/korchasa/flowai/commit/16466f20d2c49777e1417d664b27452425574413))
* add flow-skill-playwright-cli and update requirements ([e1321c1](https://github.com/korchasa/flowai/commit/e1321c1a032451e2c11b316686e2d8196494e5d9))
* add how-to guide for writing DEP ([723de86](https://github.com/korchasa/flowai/commit/723de86a6d92ad7a6aeeb705ff7a44b4a9d6e414))
* add new commands and enhance existing development workflows ([0926ab2](https://github.com/korchasa/flowai/commit/0926ab25351fc036d8dee32dcb4fecf8f0d2919c))
* add QA command for task verification and cleanup ([73ce2d0](https://github.com/korchasa/flowai/commit/73ce2d0e30f462f8b5d7d67b3bfa7182bd58a8db))
* add reflect command ([27488f2](https://github.com/korchasa/flowai/commit/27488f2d26e8c576dbf4e6cd8736aafe06f91bf7))
* **af-engineer-skill:** add references and scripts ([576ec4d](https://github.com/korchasa/flowai/commit/576ec4dd92b77567d914af0cfc0d7f7e19d25687))
* **af-engineer-subagent:** add subagent engineering skill ([fad0b60](https://github.com/korchasa/flowai/commit/fad0b6070728ddf89eb75700ee195d2e1907a0ca))
* **af-init:** add component inventory and dev commands configuration ([aa42252](https://github.com/korchasa/flowai/commit/aa422520cee9383c5fd293b6d359b26e4ce93233))
* **af-init:** add standard interface commands to project template ([907de72](https://github.com/korchasa/flowai/commit/907de72a23c2a51e199542d77986b72ee8bba5f2))
* **af-init:** improve brownfield workflow and agent template ([70df9b3](https://github.com/korchasa/flowai/commit/70df9b38999f2a91f4ab26fc5acef3454f0851e5))
* **af-init:** move documentation generation from script to agent ([fa66a4b](https://github.com/korchasa/flowai/commit/fa66a4bae492ed1c047de9c6adf3337f4b21ad68))
* **af-init:** preserve PROJECT_RULES on AGENTS regeneration ([82d5968](https://github.com/korchasa/flowai/commit/82d5968912b58e210d96184646ba5a102fe794ec))
* **af-setup-code-style:** add Deno and strict TS setup skills ([e899178](https://github.com/korchasa/flowai/commit/e899178a2fd2d265c28cd7d639f9340fbf5f3d6e))
* **af-skill-ai-skel-ts:** add AI agent scaffold skill ([bc8ac83](https://github.com/korchasa/flowai/commit/bc8ac83faf5593a5d32c2a2f77d2b0beced4f962))
* **af-skill-configure-deno-commands:** add skill for standardizing deno dev commands ([41962cd](https://github.com/korchasa/flowai/commit/41962cd3c777636a839b4626fbf4497fc5c81d71))
* **af-skill-configure-strict-typescript:** add strict TypeScript configuration skill ([dd0f449](https://github.com/korchasa/flowai/commit/dd0f44910c4e4fb3275b521c9b656822a80f275f))
* **agents:** add flow-console-expert subagent ([36ea657](https://github.com/korchasa/flowai/commit/36ea657e5821c63f0d62f13115f0e29a2361b144))
* **agents:** add general-purpose executor agent ([e79843c](https://github.com/korchasa/flowai/commit/e79843cddc537cae605717ea15ed70e475b19d7f))
* **agents:** specify default models for prompt-engineer and skill-executor ([3a24d18](https://github.com/korchasa/flowai/commit/3a24d18aab7099de6def063f148291e66a4e72cf))
* **automation:** add automation pack with SDLC pipeline, role-specific subagents, and benchmarks ([f468374](https://github.com/korchasa/flowai/commit/f46837494f5e1e13f63935d063a52ce79dd52328))
* **bench:** add pack-level AGENTS.md rules benchmarks and relocate templates ([b23e623](https://github.com/korchasa/flowai/commit/b23e6231232739926367bde2d792936ab75c95d5))
* **bench:** implement secure dockerized execution for benchmarks ([#4](https://github.com/korchasa/flowai/issues/4)) ([ce1d4c1](https://github.com/korchasa/flowai/commit/ce1d4c15745c4f2ac6ec103724016fe6bef1a35a))
* **benchmarks:** add 25 new benchmark scenarios for framework skills ([facab36](https://github.com/korchasa/flowai/commit/facab368949df6ac82b06726c4cba5b2799ab902))
* **benchmarks:** add benchmark system for subagents ([782de3a](https://github.com/korchasa/flowai/commit/782de3a8ba7e2df542d1a6e117e2b910fecc903a))
* **benchmarks:** add multi-IDE support via adapter pattern ([#6](https://github.com/korchasa/flowai/issues/6)) ([97b19b8](https://github.com/korchasa/flowai/commit/97b19b88064f4fb943fa42e07c1fcf19aaa03537))
* **benchmarks:** add pack-scoped sandbox isolation and cross-pack reference validation ([9dda164](https://github.com/korchasa/flowai/commit/9dda1642accb09c6fe6f47d3561b5c53d03bc828))
* **benchmarks:** generate AGENTS.md from templates, add CLAUDE.md symlinks ([da51344](https://github.com/korchasa/flowai/commit/da5134431ea12c6d258276954d82354de2fc8595))
* **benchmarks:** migrate to stream-json, add NO_COLOR support, skip logic ([6cdb1b5](https://github.com/korchasa/flowai/commit/6cdb1b55056533b4fb8284f44bf51fe644683537))
* **benchmarks:** switch judge to Claude CLI, add parallel execution and explicit trace IDs ([c3c0741](https://github.com/korchasa/flowai/commit/c3c074116c82e595095ae26d35aaaaaf0f0ca8d1))
* **catalog:** add flow-commit agent for automated commit workflow ([e597da2](https://github.com/korchasa/flowai/commit/e597da2bf6dca338113394e6950c955edfd70f0b))
* **catalog:** add flow-convert-cursor-to-claude skill ([65bd29a](https://github.com/korchasa/flowai/commit/65bd29a60325e85d501a118e7c040c0ed7050f3f))
* **catalog:** add flow-execute and flow-plan agents ([24ad2ba](https://github.com/korchasa/flowai/commit/24ad2ba5e3bfdc95476095b553051b9a08af21cc))
* **catalog:** add flow-skill-deep-research skill and deep-research-worker agent ([43624a6](https://github.com/korchasa/flowai/commit/43624a61dddd0030760b91c2d6c780579a6e4387))
* **catalog:** disable model invocation for engineer and setup skills ([b4670b2](https://github.com/korchasa/flowai/commit/b4670b207af6ff6723dd888096669208c8bfdd08))
* **checks:** add naming prefix validator (NP-1: all primitives must use flowai- prefix) ([2491f33](https://github.com/korchasa/flowai/commit/2491f332eaadf74cb59faab622d0d05c74228db6))
* **cli:** --version checks for updates and shows update command ([d0e15a3](https://github.com/korchasa/flowai/commit/d0e15a3e89ca025ad8d0fb7b47a9d7e3d9c9ad83))
* **cli,framework:** add CLI update step to flow-update skill and version hint in IDE guard ([690fba7](https://github.com/korchasa/flowai/commit/690fba7f3ae313e14595fed57d92b3dcc5454dd9))
* **cli,update:** complete sync output for all primitive actions + frontmatter validation ([41e7578](https://github.com/korchasa/flowai/commit/41e75784d7e3586ca1a20a1dac9e0fb5fd5055db))
* **cli:** add --local sync mode; stop tracking .claude/ in git ([cd45ca6](https://github.com/korchasa/flowai/commit/cd45ca6b3b95d965db0a9ee2f09c9003090db478))
* **cli:** add `flowai loop` command for non-interactive Claude Code execution ([366e577](https://github.com/korchasa/flowai/commit/366e577fb8448064a783619bb8bc747ef0edff4e))
* **cli:** add `flowai update` self-update subcommand ([7b4d872](https://github.com/korchasa/flowai/commit/7b4d8721be23fcea2e9354d12c7b6fbe0d490cf5))
* **cli:** add migrate subcommand for one-way IDE primitives migration ([7d2962f](https://github.com/korchasa/flowai/commit/7d2962f4093bb9ca51ff783ca34108c98b548f21))
* **cli:** add non-interactive config generation for -y flag ([b8ddd72](https://github.com/korchasa/flowai/commit/b8ddd725f890c30985bc0a2500596cf557531bf4))
* **cli:** add OpenAI Codex IDE as a first-class target ([e1afa2c](https://github.com/korchasa/flowai/commit/e1afa2cb9a56d28c07df3b89ee6af1e916cd41a9))
* **cli:** add source override for installing from git branch or local path ([d210a08](https://github.com/korchasa/flowai/commit/d210a08590ed342c2012b6934632fe2bdba410a7))
* **cli:** decouple AGENTS.md templates from flowai-init scaffolds ([2fd635f](https://github.com/korchasa/flowai/commit/2fd635f3c48addbc9c49ba875311fc54200a01b3))
* **cli:** delete excluded framework resources during sync ([e16e64b](https://github.com/korchasa/flowai/commit/e16e64be9682345753a9e6c409c5aad244f2b575))
* **cli:** implement cross-IDE user resource sync (FR-10.8, FR-10.9) ([af2f709](https://github.com/korchasa/flowai/commit/af2f709f2e738e0e9835a03d86af1483f8233778))
* **cli:** interactive update prompt with deno.lock pinning fix ([5d869ec](https://github.com/korchasa/flowai/commit/5d869ecfa7e7ff3edc866952b63dacb6a3690aa2))
* **cli:** sync core assets to IDE config dirs ([a2e67e2](https://github.com/korchasa/flowai/commit/a2e67e27b6263c6e1c8e90a83352fab0a1a745a8))
* command to build CLAUDE.md file using .cursor/rules ([8a82ab1](https://github.com/korchasa/flowai/commit/8a82ab16ce2e3e02d51f618c2d78c851a9823c56))
* **commands:** add analysis and gap filling step to execution workflow ([887b344](https://github.com/korchasa/flowai/commit/887b34445bf03c6e02df566b97769d41ee681eba))
* **commands:** add docs-check command ([79ab673](https://github.com/korchasa/flowai/commit/79ab673123661979e6f9ac1dd23d133668c8f861))
* **commands:** add error analysis workflow ([3367e92](https://github.com/korchasa/flowai/commit/3367e9230dcef65473c32aa3d912db327d6d5407))
* **commands:** add maintenance command ([f24db45](https://github.com/korchasa/flowai/commit/f24db456efe3d8e291ca64b1548514bb97efbca4))
* **commands:** add task-build-claude-md command with implementation script ([4a48cfd](https://github.com/korchasa/flowai/commit/4a48cfd05d4c9e33bbc495e8de62fe9dd9a6a4b1))
* **commands:** automate commit workflow with atomic grouping ([1033c25](https://github.com/korchasa/flowai/commit/1033c25576efc4894942dab6a0b4823cecc04b8a))
* **commands:** enhance init command workflow ([6a4f8c7](https://github.com/korchasa/flowai/commit/6a4f8c7bb66fd199d4bf1e37ace56796bbc0611e))
* **commands:** implement GODS framework and chat-first reasoning in planning ([90aeb21](https://github.com/korchasa/flowai/commit/90aeb213364c631c0b5f2672496997de37e39e92))
* **commands:** reorganize tasks and add agent rules ([88faf75](https://github.com/korchasa/flowai/commit/88faf75ef04fbc271e5c179e204375fb61952417))
* **configure-deno-commands:** require parallel buffered check execution ([e52ad4d](https://github.com/korchasa/flowai/commit/e52ad4de85edc3c670f31f56f380f9e643989ad8))
* **core:** add flowai-reflect-by-history skill ([d5de1a8](https://github.com/korchasa/flowai/commit/d5de1a8b4aabcd6738fe62275b5852f3a1eaf1cd))
* **core:** add parallel execution to deno task check and review/commit skills ([8441c26](https://github.com/korchasa/flowai/commit/8441c2616359ea3585b4a1be0473196cedb0296e))
* **core:** integrate AskQuestion and SwitchMode tools for interactive clarification ([babd1fe](https://github.com/korchasa/flowai/commit/babd1feab62a47e706a073d6a34ef5e41372ae7e))
* **cursor:** add initial task docs, rule guidelines, and design docs; update README and .gitignore ([03857ee](https://github.com/korchasa/flowai/commit/03857ee3ee04cf567a9c8f62a15ae35d7e51eac9))
* **deno-cli:** add skill for managing Deno capabilities via CLI ([d3b627f](https://github.com/korchasa/flowai/commit/d3b627f496292ea8977b5f2d3298415c7d5b2c59))
* **deno-deploy:** add local debugging protocol and unstable APIs guide ([2e6cee9](https://github.com/korchasa/flowai/commit/2e6cee9be7c851b0f1131b2da3072e4a34c61e5e))
* **deno-deploy:** add skill for managing Deno Deploy cloud services ([e5d4b10](https://github.com/korchasa/flowai/commit/e5d4b1097ed25e2fbdaed8513dbc30758a074fac))
* **devcontainer:** add Claude Code auth forwarding from macOS Keychain ([99d3fa7](https://github.com/korchasa/flowai/commit/99d3fa771b609fe624ff54c89a8f66b3ee0236e4))
* **devcontainer:** add gh CLI auth and git credential helper to setup-container.sh ([e3c9f85](https://github.com/korchasa/flowai/commit/e3c9f85f2a7cb66a27dc303fb1ae5a8b103689e9))
* enforce IDE-agnostic language and update skills ([90fb207](https://github.com/korchasa/flowai/commit/90fb207000082335d74d9e837cdf85d3d96defc7))
* **engineer-rule:** update Claude Code rule semantics based on experimental verification ([b77f509](https://github.com/korchasa/flowai/commit/b77f5099295202cafc2ca33172e63969a8622119))
* **engineer:** add OpenCode IDE support to all engineer skills and docs ([1e50994](https://github.com/korchasa/flowai/commit/1e50994637e4c8beb7f37e20bda38798390e0ba1))
* **experiments:** add sweep subsystem and claude-md-length study ([1b51a1c](https://github.com/korchasa/flowai/commit/1b51a1c32be8116f121d1c53e238ec4c08187cfa))
* extend frontmatter for skills and agents with model tiers ([fd7d37a](https://github.com/korchasa/flowai/commit/fd7d37a5fd7a16c60664225639f510315e80262a))
* **flow-cli:** add self-update check against JSR registry ([8c63c5e](https://github.com/korchasa/flowai/commit/8c63c5e6bb1b10aa2a65db5e9a4f9fcd82cb202e))
* **flow-commit:** enforce consolidation-first commit grouping ([78acd15](https://github.com/korchasa/flowai/commit/78acd158961d70562c0b03fdf02145c3c6ddc022))
* **flow-init:** add 'no tables in chat' rule to AGENTS template ([e8a2d65](https://github.com/korchasa/flowai/commit/e8a2d65eaead9895502654c3cb0f492509f085f3))
* **flow-init:** add CLAUDE.md symlink step and fix evidence references (FR-19) ([cbde0d4](https://github.com/korchasa/flowai/commit/cbde0d43bedbed15abdbae22ba9e112c110dcf27))
* **flow-init:** add Deno tooling option to interview ([fbf5151](https://github.com/korchasa/flowai/commit/fbf515151e81b7d9b6d9ddd092f3b404c3d1892a))
* **flow-init:** split AGENTS.md into domain-scoped files with manifest-driven generation (FR-12) ([1a08122](https://github.com/korchasa/flowai/commit/1a0812217d6cef9722c453cbce4dc628f226c0d6))
* **flow-reflect:** add undocumented discoveries and automation opportunity analysis ([7071875](https://github.com/korchasa/flowai/commit/7071875ab0379cc917fd64cc2b9b26c631b6ba2c))
* **flow-skill-executor:** add introduce-yourself step to workflow ([3ad6d54](https://github.com/korchasa/flowai/commit/3ad6d5421294d0fb04875e1cd3b57475d89f0216))
* **flow-skill-setup-ai-ide-devcontainer:** add feature discovery step and catalog (FR-20.11) ([29fef36](https://github.com/korchasa/flowai/commit/29fef36147e8006087e72ca4a8ef8dd8f168f6e9))
* **flow-skill-setup-ai-ide-devcontainer:** complete FR-20 coverage gaps (SDS, benchmarks, multi-CLI) ([7d6e54d](https://github.com/korchasa/flowai/commit/7d6e54d4a329764fa241c6a2265b377079b1a44a))
* **flowai-plan:** improve variant selection flow and fix interactive benchmark infrastructure ([3b04cfc](https://github.com/korchasa/flowai/commit/3b04cfc4f26b08bd74ed090582814cd5e4d2fcbc))
* **framework,cli:** implement pack system — flowai-* renaming, hooks/scripts, rich sync output ([0cc3000](https://github.com/korchasa/flowai/commit/0cc300021887af082be6ce08b47f45f4ad5ad711))
* **framework:** add clarity review criterion and TS no-nested-ternary rule ([9b7203a](https://github.com/korchasa/flowai/commit/9b7203acfde2f60fb32055f9d72216a6c6271b49))
* **framework:** add explicit git diff commands to flow-update skill ([b946c27](https://github.com/korchasa/flowai/commit/b946c2759a9dd24ff04f8bc300a9a7a1826718ef))
* **framework:** add flow-update skill and CLI IDE context guard ([687effe](https://github.com/korchasa/flowai/commit/687effebf71ffc667c8bd262e45f6f1f337f9a8d))
* **framework:** add interactive-teaching-materials skill ([a141aea](https://github.com/korchasa/flowai/commit/a141aeae4b32d5ded229fa209b90650857c248fc))
* **framework:** add skill adaptation to flowai-update ([bed0c31](https://github.com/korchasa/flowai/commit/bed0c315b38176a91d7a6f00ace1844c0006b384))
* **framework:** enrich variant analysis with Risks and Trade-offs ([5bf9e1f](https://github.com/korchasa/flowai/commit/5bf9e1f1069b62906662f64680958a7b35aa4462))
* **framework:** mandatory Documentation Audit with gate and report template ([2076efb](https://github.com/korchasa/flowai/commit/2076efb06ff5af38270a8858ec35cf5bba077dd2))
* **framework:** migrate benchmarks and runner to pack structure ([28ea5d6](https://github.com/korchasa/flowai/commit/28ea5d6bd5c22c70eed2bddc825ff9fc1bf101d7))
* **framework:** migrate whiteboard from single file to per-session directory ([42316a6](https://github.com/korchasa/flowai/commit/42316a66a13ec3c88ebbfd630b64d68dc955e62d))
* **framework:** propagate FR-<ID> traceability rule to AGENTS template ([7afd092](https://github.com/korchasa/flowai/commit/7afd092f876ff800203bd5d1c5c9b07b33f78431))
* **hooks:** add flowai-session-init-docs SessionStart hook ([22ba4ab](https://github.com/korchasa/flowai/commit/22ba4ab1629fa56b86ebefcc5e2dce32a8aec3b6))
* **hooks:** add framework hooks with IDE-specific config generation ([b6a5ccb](https://github.com/korchasa/flowai/commit/b6a5ccbe14a9c10bcb69e7291616ed376c73071f))
* implement unified benchmark trace with dashboard and skill grouping ([5474dfb](https://github.com/korchasa/flowai/commit/5474dfbe9c23487c0dd47e48248e1b60f3e8c0b7))
* **install:** add --yes/-y flag for non-interactive execution ([af87bc2](https://github.com/korchasa/flowai/commit/af87bc2a72791b84ee2dc894773e9329beb11188))
* **install:** add global installer for per-IDE agent/skill symlinks (FR-10) ([94817b5](https://github.com/korchasa/flowai/commit/94817b5a2118a8b1eae9c2d88b2de6cef6c70ce2))
* **install:** add remote execution and shell bootstrap (FR-10.6) ([b6de621](https://github.com/korchasa/flowai/commit/b6de621cd0b5cd1cb7ffd77348b2655fc15963ee))
* integrate product vision into AGENTS.md and af-init ([#5](https://github.com/korchasa/flowai/issues/5)) ([2d786db](https://github.com/korchasa/flowai/commit/2d786db3aed034fe92afe8bcf852516f883b284a))
* introduce .dev/ SPOT directory with symlink-based multi-IDE support ([9ac2a13](https://github.com/korchasa/flowai/commit/9ac2a1318ddde135193dac725088cfab790cc880))
* **maintenance:** add deno task scripts and config ([1a14040](https://github.com/korchasa/flowai/commit/1a140403747efab3a485954007f71444b61caf82))
* **maintenance:** make flowai-maintenance interactive with two-phase flow ([3ea07b5](https://github.com/korchasa/flowai/commit/3ea07b5a7f089c1f99e45d89ebeb0df420f8f20c))
* **mcp:** add configuration for Cloudflare browser rendering server ([d7e202f](https://github.com/korchasa/flowai/commit/d7e202fbfc3a59eb6300790fdbc847dae06ffe3f))
* migrate framework Python scripts to Deno/TypeScript (FR-13) ([0a778c1](https://github.com/korchasa/flowai/commit/0a778c1fc7e37ce41135b52f91c9f25efbb1955e))
* **pipeline:** add compact SDLC pipeline with Design and Review agents ([d9c6876](https://github.com/korchasa/flowai/commit/d9c6876720b963e6bdd9a13565b397c3273403ca))
* **pipeline:** add flowai-pipeline-sdlc — local SDLC pipeline without GitHub ([565ec45](https://github.com/korchasa/flowai/commit/565ec45f1cc726d3230bda4225e837a74151069e))
* **planning:** add Plan Persistence rule to save plans to whiteboard.md ([e00c89f](https://github.com/korchasa/flowai/commit/e00c89fd8100c870a6ca6c4b91569b72cdedbfed))
* **reflect:** add self-criticism step to reflection skills ([b8104e2](https://github.com/korchasa/flowai/commit/b8104e28bbd3cb31091d82bff5530c95991a1c83))
* replace /check with iterative /check-and-fix command ([94f7627](https://github.com/korchasa/flowai/commit/94f762709f2a34571833eb455163aada3d825e5c))
* **rules:** add skill-creator guide and scripts ([f5961dc](https://github.com/korchasa/flowai/commit/f5961dcbb393643b00df2401d790eda051ced94f))
* **scripts:** auto-disable ANSI colors when running under Claude Code ([dedcba7](https://github.com/korchasa/flowai/commit/dedcba799f5a31790fa85a8520f8d51cf0773747))
* **settings:** update permissions and add additional directories for flow-review-and-commit ([5e81f60](https://github.com/korchasa/flowai/commit/5e81f60d8524b75c7cf0e5a60dbd0480c020cda5))
* **skills:** add flow-spec skill for phased feature specifications ([294a12c](https://github.com/korchasa/flowai/commit/294a12cc54e433909f773500344791e5cdabbbb9))
* **skills:** add flowai-adapt command for standalone primitive adaptation ([dc01c34](https://github.com/korchasa/flowai/commit/dc01c34d5e478f7147c048e25631e03a68c0c7b0))
* **skills:** add instruction coherence and tooling relevance checks to flowai-maintenance ([867d3ec](https://github.com/korchasa/flowai/commit/867d3ec9af3b50ee5d12688d37100297eb82c7b0))
* **skills:** add pre-flight project check to flowai-review ([fec5307](https://github.com/korchasa/flowai/commit/fec5307dbcd2e7cb3b6f188bd198e5fd80f040ef))
* **skills:** close FR-21.3–21.6 universal skill & script requirements ([fe11fad](https://github.com/korchasa/flowai/commit/fe11fad59d704d6b17630f6a0e8bf9646cf54426))
* **skills:** enforce FR-21.1 agentskills.io compliance with validation and fixes ([c7d1b36](https://github.com/korchasa/flowai/commit/c7d1b362aa22bc82abc4377c2afe7cb706f7c0cb))
* **skills:** enforce FR-21.2 cross-IDE script path resolution ([971f660](https://github.com/korchasa/flowai/commit/971f660d05c4b5bbebdc7c5c3dd126a55ac3d2c5))
* **skill:** update flow-skill-analyze-context to focus on total cost estimation ([fed8ba2](https://github.com/korchasa/flowai/commit/fed8ba2e59a7ca26659c6763ca8af704adc97d8b))
* **sync:** implement user commands synchronization across IDEs ([ef68ff7](https://github.com/korchasa/flowai/commit/ef68ff7d3fbed62221a1a73f1918b0fdd290fd2a))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([8bff86a](https://github.com/korchasa/flowai/commit/8bff86aa4b4d31cdb1605732a5c24fa69f8db1f8))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([88fb794](https://github.com/korchasa/flowai/commit/88fb794f075564548251f973e4ae54d2c1d26822))
* universal agent format + flow-cli distribution ([#7](https://github.com/korchasa/flowai/issues/7)) ([45ad03e](https://github.com/korchasa/flowai/commit/45ad03e200589c2a87644ef116ff35c4482ff41f))
* update /investigate command with iterative workflow ([99ee7f0](https://github.com/korchasa/flowai/commit/99ee7f01cbf1d103c41673fa73575e92a3d70abb))
* update commands ([a629309](https://github.com/korchasa/flowai/commit/a629309ce4d7f7bdd7c4f14b1217d26dbe240456))


### Bug Fixes

* **af-init:** align documentation generation with standard schema ([513960a](https://github.com/korchasa/flowai/commit/513960a3b8a392babcdd23b171f9ec3236cca1b3))
* **bench:** add pre-spawn skill mount check and short-output warning ([18fa0a5](https://github.com/korchasa/flowai/commit/18fa0a56e365e05df443837fe358be08b7f056b8))
* **bench:** copy framework commands/ into sandbox .{ide}/skills/ ([17066dc](https://github.com/korchasa/flowai/commit/17066dca852feb5a0bcf1981dffa63ccf5a3f9d0))
* **bench:** correct checklist items in flowai-update benchmarks ([45ee5d8](https://github.com/korchasa/flowai/commit/45ee5d8bd21cd2837de49456d52e4239cc3e3050))
* **benchmarks:** add interactive mode to review scenarios (P3) ([53f8ed3](https://github.com/korchasa/flowai/commit/53f8ed3a766942b7df2e668c80a7c5b30fd740f6))
* **benchmarks:** fix P5 strict checklists — skill fixes and interactive mode ([ca009f0](https://github.com/korchasa/flowai/commit/ca009f0e42130cf519dc069917ada3098ee7e86b))
* **benchmarks:** fix P6 deterministic failures in flow-commit scenarios ([22a2826](https://github.com/korchasa/flowai/commit/22a28267409c9577e48626f64892688546785529))
* **benchmarks:** handle dynamic exit_code_zero in score test ([576d9b1](https://github.com/korchasa/flowai/commit/576d9b14edbb9827289de52a68f1fdb68b873908))
* **benchmarks:** isolate sandbox with git init to prevent agent escaping to parent repo ([1c30746](https://github.com/korchasa/flowai/commit/1c30746ea4f4446a95b3e34425a5f8089c6ef2c9))
* **benchmarks:** overhaul benchmark infrastructure for reliability ([895d4f9](https://github.com/korchasa/flowai/commit/895d4f9fde59dc435c6662010ada9989a858ba68))
* **benchmarks:** pass judge evidence via file to avoid E2BIG crashes ([fac82f9](https://github.com/korchasa/flowai/commit/fac82f9e7ccd1122f0ef9dbb2db608563d15d0e7))
* **benchmarks:** switch engineer-skill/subagent scenarios to .cursor/ to avoid CLI write block ([5b1ce42](https://github.com/korchasa/flowai/commit/5b1ce4272b69af06e41e4c0a954e737393537904))
* **benchmarks:** update paths after pack migration, remove stale fixturePath overrides ([814c016](https://github.com/korchasa/flowai/commit/814c0166e88fc28cb241c500bdd21848a98881d3))
* **build:** add agent benchmarks to lint/test excludes, remove orphaned fixture ([3e7d2ac](https://github.com/korchasa/flowai/commit/3e7d2acf1f2dbdd6ce51bc449708d477f9a28a78))
* **ci:** exclude integration tests from check (API/env dependent) ([145a126](https://github.com/korchasa/flowai/commit/145a12672bbd3145b51c87308a4a832add522cf5))
* **ci:** pass --config to deno install --global in verify-install job ([0a5a6b4](https://github.com/korchasa/flowai/commit/0a5a6b41c33668c161fde8da23b712cc494ae7ab))
* **ci:** resolve non-existent tag in release notes generation ([4fb9cfb](https://github.com/korchasa/flowai/commit/4fb9cfb6af9f9bea31e7d401afd2f67a269e2c30))
* **ci:** stop tracking generated flowai-hooks.json ([645df3e](https://github.com/korchasa/flowai/commit/645df3ec3882e1e0bd37ae1fd267a28e5209d448))
* cleanup ([b5ac8ae](https://github.com/korchasa/flowai/commit/b5ac8aebe45629f07b7603e481aaa525f8ec2433))
* **cli,framework:** clarify flowai sync subcommand in IDE context ([9f85a77](https://github.com/korchasa/flowai/commit/9f85a770ef857fbb7cb485a6803123d1d424dc10))
* **cli:** add explicit type annotation to cliffy action callbacks ([c489233](https://github.com/korchasa/flowai/commit/c489233779fe3b329ea997a5606d1f450236feca))
* **cli:** exclude benchmarks and test files from skill distribution ([76d2a7c](https://github.com/korchasa/flowai/commit/76d2a7c8569d95f876ab3f130a5fb0ffed5742ca))
* **cli:** resolve TS2345 in cliffy action callbacks, add deno check to task-check ([5c9b289](https://github.com/korchasa/flowai/commit/5c9b28965649277e738cd9f2bdb8a949e4e495e9))
* **cli:** run sync integration test in temp dir to avoid side effects ([d3a2053](https://github.com/korchasa/flowai/commit/d3a2053d77ec89c859c0a4739b558dd748a8bdb3))
* **config:** remove source reference from .flowai.yaml ([8946e15](https://github.com/korchasa/flowai/commit/8946e1538b18d4254bcfa38dc5c8b123a66ac530))
* correct deno fmt exclude config and sync flow-review whiteboard path ([ed4ab74](https://github.com/korchasa/flowai/commit/ed4ab74afdcdbd7a1c170e0e79fe1607c50accc7))
* **devcontainer:** fix OAuth auth, volume ownership, and error masking in templates ([9d256b3](https://github.com/korchasa/flowai/commit/9d256b379e8c3ca3a3d5ac1682dcb0345d68bd19))
* **devcontainer:** switch Claude Code install to official script, expand features catalog ([4954d73](https://github.com/korchasa/flowai/commit/4954d738dbe01c0aa70e2d1ea6d14a28c002371e))
* **devtools:** correct Claude Code rule format in engineer-rule skill ([2a56e3b](https://github.com/korchasa/flowai/commit/2a56e3bfad65e9d461e395abab34645c94e994e9))
* **docs:** correct spelling in plan.md instructions ([c83d897](https://github.com/korchasa/flowai/commit/c83d89718c7cf819634d0373afa5aea0b4263f45))
* **docs:** remove extraneous command from installation instructions in README ([4ab2137](https://github.com/korchasa/flowai/commit/4ab21379c4bee9fd01c629f9040faa94e33498de))
* **docs:** update AGENT.md references to AGENTS.md ([988d72e](https://github.com/korchasa/flowai/commit/988d72e5abd36a35878c7d213af3c2cf49074a0e))
* **docs:** update migration instructions in migrate-run-ts.md ([3f8c58a](https://github.com/korchasa/flowai/commit/3f8c58a58cbb2322c4831f32572a4c525b8b6752))
* **flowai-plan:** enable interactive mode in basic benchmark ([edc83bb](https://github.com/korchasa/flowai/commit/edc83bb56bfd76d4500c8986379969911ac54e9c))
* **flowai-review:** add deletion guard for entire directories ([2d8629f](https://github.com/korchasa/flowai/commit/2d8629f449ba42908ce1902b938d6cd50d7a396d))
* **flowai-review:** gate stack-specific checks on manifest detection ([88b81cb](https://github.com/korchasa/flowai/commit/88b81cbc091020259f350c26015d68a77c5e517d))
* **fmt:** format benchmark file that broke CI ([8a6bff0](https://github.com/korchasa/flowai/commit/8a6bff048a4106d1fc3a945e0696878f4a797f8d))
* **framework:** use system temp dir instead of _research_tmp in deep-research skill ([6e72a0f](https://github.com/korchasa/flowai/commit/6e72a0f965278bb8b7836b66adc920725013b8f1))
* **hook:** isGitCommit handles quoted strings, -c flags, and subshells ([b3c71d3](https://github.com/korchasa/flowai/commit/b3c71d3a9f7c43dc1450776a57976c890f9d1c35))
* **install:** use full jsr: specifier for remote execution compatibility ([0da4a94](https://github.com/korchasa/flowai/commit/0da4a94955c6716b80b2667d7fab040df97a4838))
* **plan:** make critique step automatic instead of asking permission ([216724f](https://github.com/korchasa/flowai/commit/216724f4fe944f1061010ce13c38e3125b11bd11))
* **publish:** un-exclude generated artifacts from JSR publish ([0bb79f3](https://github.com/korchasa/flowai/commit/0bb79f38d88db640d4643f596ac2ab241adf7021))
* **scripts:** use jsr: specifier in generate_agents.ts; close 10 FR-21 criteria ([7d14e0a](https://github.com/korchasa/flowai/commit/7d14e0aaf29fd4b26b7d34ab9e9ef07df9d43168))
* **security:** bump next from ^14.0.0 to ^15.5.10 in benchmark fixture ([ba4e081](https://github.com/korchasa/flowai/commit/ba4e0813868644f278182b909d4e308cb6365498))
* **skill:** make asset artifact verification unconditional in flowai-update ([cc66a64](https://github.com/korchasa/flowai/commit/cc66a64368bfcbbf3558728b3865fb5815c4a401))
* **skills:** correct script path in analyze-context and remove --headed flag from playwright-cli ([e6a4a5c](https://github.com/korchasa/flowai/commit/e6a4a5ca95affafd344b5042904a9726108ffeb1))
* **update:** handle invalid YAML in parseFrontmatter gracefully ([fd477bc](https://github.com/korchasa/flowai/commit/fd477bc2bfa3e9cfa4880aa2d32c878c25dd53a5))


### Continuous Integration

* **release:** merge CI jobs into single pipeline with standard-version automation ([acbfc03](https://github.com/korchasa/flowai/commit/acbfc03c4a94402b3244a66b25386884ecab6aaf))


### Build System

* add CI integrity checks and update judge model ([6fdc340](https://github.com/korchasa/flowai/commit/6fdc340b4e0eaedda3423ef8f58aeaab7793bc1c))
* **ci:** add custom release notes generation from conventional commits ([22d5b75](https://github.com/korchasa/flowai/commit/22d5b75c250000bca34610d170c138fb61798f18))
* **ci:** pin Deno to 2.7.11 to fix fmt mismatch ([0442c1d](https://github.com/korchasa/flowai/commit/0442c1de0aa8e0eacc146cde6d0b1eb55541c2dc))
* **ci:** pin Deno to 2.7.4 and revert HTML formatting ([01a7d3a](https://github.com/korchasa/flowai/commit/01a7d3a81f4f5d49dfd499f17caec91e3598a1d5))
* **ci:** pin Deno version to 2.7.11 ([165c70f](https://github.com/korchasa/flowai/commit/165c70f7da0f557f3b446a520441085bdc7041a4))
* exclude markdown files from formatting, cleanup worktrees.json ([2c2a2fe](https://github.com/korchasa/flowai/commit/2c2a2fea6466d91d720c6c4db5a4b9aa92e64918))
* pin GitHub Actions to SHA checksums ([e47d6ea](https://github.com/korchasa/flowai/commit/e47d6ea2e244b88f72d424571df9fd7a628b559a))
* update deno.lock ([ef9543f](https://github.com/korchasa/flowai/commit/ef9543f0193e226ce62bd719764b17a716fdd605))


### Agent Changes

* add Benchmark TDD flow to project instructions ([567d515](https://github.com/korchasa/flowai/commit/567d515b760b2fd3858192eefe9a8bcd345a6517))
* add evidence links to all acceptance criteria in SRS ([d819ee4](https://github.com/korchasa/flowai/commit/d819ee4bb77ee8d1349fbb9c2427a7f9cebd107c))
* add relative paths rule to AGENTS.md and template ([605e556](https://github.com/korchasa/flowai/commit/605e556454eb40bc1073dfc23f3e724d9bd6c86e))
* **AGENTS:** update guidelines to include post-session review and evidence provision ([f3927e3](https://github.com/korchasa/flowai/commit/f3927e3ede008971910de28047e84ed65c8dd157))
* **commit-review:** separate responsibilities between review and commit, add whiteboard cleanup ([00b8a73](https://github.com/korchasa/flowai/commit/00b8a73ce3e7be77170e58a3d4ab1324d09d65aa))
* **core:** add dynamic doc discovery, whiteboard context, and parallel delegation benchmarks ([7ea34e0](https://github.com/korchasa/flowai/commit/7ea34e0a5fd7681fa43d130adca542c01df78873))
* fix inconsistent punctuation in project rules ([9138896](https://github.com/korchasa/flowai/commit/91388969495ec3e4531fdf6fbc28709115399050))
* **flow-commit:** add agent: commit type for AI config changes (FR-11) ([f11dcbc](https://github.com/korchasa/flowai/commit/f11dcbce601d651801ef09b6e5c231cc9b2fb5d5))
* **flow-commit:** add suggest-reflect step after commit ([4e44b9c](https://github.com/korchasa/flowai/commit/4e44b9c70d6d7526f0e211eb9947d42da4fd8042))
* **flow-engineer-hook:** add cross-IDE hook docs and benchmarks (FR-14, FR-15, FR-16) ([202657e](https://github.com/korchasa/flowai/commit/202657e1dbbf5e1b479d2c0eb9e643605aa08f44))
* **flow-review-and-commit:** implement composite review+commit command (FR-18) ([5e512cf](https://github.com/korchasa/flowai/commit/5e512cf23b9ed58112c68b3321692ecb3933e545))
* **flow-review:** inline workflows in composite skill, add sync check and benchmarks ([f804d83](https://github.com/korchasa/flowai/commit/f804d8304d93fd72eb0eb678eb7774ac90884fa2))
* **flow-skill-setup-ai-ide-devcontainer:** add devcontainer skill, update FR-10/FR-20 requirements ([0408c38](https://github.com/korchasa/flowai/commit/0408c38dd0e8ba2395d8cd2cd9da00c16b472c43))
* **flowai-commit:** add missing CLAUDE.md symlink in dynamic-doc-list fixture ([bbd29a7](https://github.com/korchasa/flowai/commit/bbd29a755b9a81acc2bfe4ad7aa33f8163d9d117))
* **flowai-reflect:** add cross-session pattern analysis ([f11f432](https://github.com/korchasa/flowai/commit/f11f4324efa2a577596414a5586fffcb4585a9ab))
* maintenance — fix flow-* naming, improve skill instructions, add JSDoc ([de8e700](https://github.com/korchasa/flowai/commit/de8e70001c40474105cd9c456492d8447fefba82))
* replace bare @std/ specifiers with jsr: for standalone script independence ([be2839f](https://github.com/korchasa/flowai/commit/be2839f91cad7d3885a1a225e30d5ced36f09c98))
* replace flow-qa with flow-review combining QA and code review roles ([4149a7b](https://github.com/korchasa/flowai/commit/4149a7b8a2240362c1205e86cd16fc10c3e148b5))
* resolve IDE support scope to 3 IDEs (FR-17) ([5355740](https://github.com/korchasa/flowai/commit/5355740b4615d0e8da9ccaa13a6d6212a962ce7e))
* use portable <this-skill-dir> placeholder for bundled script paths ([07b005d](https://github.com/korchasa/flowai/commit/07b005d203a9764101131d41e99d502eb0bd0f67))


### Documentation

* add benchmark test-fitting and static mocks rules, clarify cross-pack ref checker ([7c6359b](https://github.com/korchasa/flowai/commit/7c6359be366579517e036c17eb150ddb6b5474cc))
* add CODE STYLE RULES for Go (Golang) ([e2f806d](https://github.com/korchasa/flowai/commit/e2f806df97fa9aa3c2992deec578b68d4cae44db))
* add code-style-typescript-deno.mdc with TS strict rules and Deno import guidance ([950352c](https://github.com/korchasa/flowai/commit/950352cdb1bf8b5c19a97f2177d1c56983695047))
* add deno-cli and deno-deploy to skill coverage matrix ([acd09fb](https://github.com/korchasa/flowai/commit/acd09fb1badc6734e412a7f56b7f45ecd1b5919b))
* add descriptions to command files for clarity and guidance ([89beca2](https://github.com/korchasa/flowai/commit/89beca27671472bfdbc3fe5a05e50cb22e89eec6))
* add flow-review-and-commit command and FR-18/FR-19 requirements ([60fb47b](https://github.com/korchasa/flowai/commit/60fb47bbf0531af7810516ad1c982f438abd340e))
* add guidelines for writing Product Requirements Documents (PRD) ([3548cf0](https://github.com/korchasa/flowai/commit/3548cf0858d667c6e07bf95c70ec5e3e7750c4d4))
* add IDE comparison and research documents ([dfa1821](https://github.com/korchasa/flowai/commit/dfa18214d9f8843e3e09f5141928d50e09445da8))
* add JSDoc to benchmark lib, rewrite scripts/AGENTS.md, clean up duplicates ([baf950e](https://github.com/korchasa/flowai/commit/baf950ee9546d07e45c4238146fa1cdb2d3c7411))
* add local check requirement for CI/CD edits ([49e3aa2](https://github.com/korchasa/flowai/commit/49e3aa27a7050876fba20efb512b99b976b59452))
* add logic-focused testing rule to AGENTS.md and template ([a7c8c16](https://github.com/korchasa/flowai/commit/a7c8c1657bedc7445a2ba1a150d736a60bb05902))
* add maintenance report to whiteboard ([7b0473d](https://github.com/korchasa/flowai/commit/7b0473dde820fb3f55982ead3f000d86ab185b35))
* add PoC rules and update task-answer command ([66faf13](https://github.com/korchasa/flowai/commit/66faf13e683d99fe9c17352076f7961285957162))
* add Product Vision Document creation command and guidelines ([3bb9386](https://github.com/korchasa/flowai/commit/3bb93865188bc512be250b00f3d11d810486ff3c))
* add Reference-First planning rule to AGENTS.md ([06a3ca7](https://github.com/korchasa/flowai/commit/06a3ca7bd895ae2b01c84a32981ddbd568c40c44))
* add task planning and Q&A session guidelines ([e8f8c61](https://github.com/korchasa/flowai/commit/e8f8c612b1a96a8f1db88616fac2777696965807))
* add task-create-rule.md for Cursor IDE rule development ([3d02338](https://github.com/korchasa/flowai/commit/3d02338019a8f580f03b120b5796647c913d8a35))
* add task-write-skill.md for IDE Skill file creation ([8c7229a](https://github.com/korchasa/flowai/commit/8c7229a4a84c7a7a78fac7b0a72d4204205b48cb))
* **af-do:** clarify skill overview description ([4ec5488](https://github.com/korchasa/flowai/commit/4ec5488cc5c08d0aff1d1e6ce7890ed42beac30e))
* **AGENTS.md:** add TypeScript LSP plugin caveat for export ordering ([832a36c](https://github.com/korchasa/flowai/commit/832a36c5294a6f900143edea77908c9ea1da623e))
* **agents:** clarify TDD RED step scope ([df881c4](https://github.com/korchasa/flowai/commit/df881c4bd82fcd6140c84c87719f7ba8a19321fb))
* **agents:** reformulate session-start doc reading rule ([5b21688](https://github.com/korchasa/flowai/commit/5b21688e38296628b8b40d279d1c5b0bbf5ac54d))
* **agents:** update whiteboard references to per-session whiteboards directory ([2153967](https://github.com/korchasa/flowai/commit/21539671e3757273f6e86bb82ea3df58574d2c6e))
* allow Russian in whiteboard.md ([8bde511](https://github.com/korchasa/flowai/commit/8bde511d10728ff15b72e150a59976ee2bfefc15))
* **bench:** enhance README with Docker isolation details and improved benchmark execution instructions ([be05f93](https://github.com/korchasa/flowai/commit/be05f937e77aa9a5e9983c68561d357e3b76b848))
* capture priming lessons from flowai-maintenance output-contract rework ([5971f0f](https://github.com/korchasa/flowai/commit/5971f0f3d00ecd5670fbf164b3315ab66551698c))
* clarify documentation language requirements in RULE.md ([11520d5](https://github.com/korchasa/flowai/commit/11520d57412fe4ab5522a94605940aea7bbd05a7))
* clarify GIT_PAGER usage in task-commit.md ([f260fbf](https://github.com/korchasa/flowai/commit/f260fbfa73dd8c2bcbc01c065b6560feadcb3948))
* clean whiteboard — only remaining TODO items ([1a222f3](https://github.com/korchasa/flowai/commit/1a222f363611b002e158785c43fe902c445e4143))
* cleanup docs and tighten commit workflow guidelines ([33e1305](https://github.com/korchasa/flowai/commit/33e13057b104524068b44bd14a962daae87cb9ea))
* clear whiteboard after session ([cfd1531](https://github.com/korchasa/flowai/commit/cfd153154a3f6887f3c33f5a92e448e372423dae))
* **commands:** clarify commit and planning workflows ([7c1b725](https://github.com/korchasa/flowai/commit/7c1b725e86e111ab1fe582c7db2c3aa27bb2eb61))
* **commands:** sync task plan and do checklist ([2a5ff04](https://github.com/korchasa/flowai/commit/2a5ff04f215ff095507b76701e5a892df8a766c4))
* **cursor-desktop-guide:** add readonly field to subagent frontmatter schema ([8236012](https://github.com/korchasa/flowai/commit/8236012de0c2e81670710a3aae28445eea41e9cd))
* **cursor:** add task workflow docs and code style guidelines; remove legacy rules file ([217a4b1](https://github.com/korchasa/flowai/commit/217a4b1029da30eb92da10c5ce54254698d33ae2))
* delete CLAUDE.md ([0f4af28](https://github.com/korchasa/flowai/commit/0f4af283041a32cdbd7d96837a8f8256b22b13a8))
* enhance ides-difference documentation with dedicated AI ignore files and migration options for Claude Code ([3bf995e](https://github.com/korchasa/flowai/commit/3bf995e107c1e94ad97e00a1dd0a120d0634fb09))
* enhance README and AGENTS.md with developer workflow and agent reference ([b8b2333](https://github.com/korchasa/flowai/commit/b8b23338c44223623a1e4ad8ba43af5fbaf3a448))
* enhance README with comprehensive component lists and fixes ([231f8dc](https://github.com/korchasa/flowai/commit/231f8dcad37590d3ac52a86818e05de7dcd2f85b))
* enhance task planning guidelines in task-plan-with-qa.md ([2e01804](https://github.com/korchasa/flowai/commit/2e01804ae23c5f85c1764b35abecdd66875098da))
* enhance task-execute.md for improved clarity and consistency ([c5ef2ab](https://github.com/korchasa/flowai/commit/c5ef2ab06e207c05d49a15593e5d053c75159f72))
* expand documentation philosophy in README and update SRS ([1fbd6f9](https://github.com/korchasa/flowai/commit/1fbd6f994d705127bcb12d5ef42f33422ddb376b))
* expand GIT_PAGER examples in RULE.md ([e0ce7f5](https://github.com/korchasa/flowai/commit/e0ce7f5c98d439bccd650700f37652eb3e2de6c1))
* expand IDE hooks comparison and add contributor dev setup to README ([6794600](https://github.com/korchasa/flowai/commit/67946003e46c2af679417c2b2d87d06b20c87448))
* **framework:** add automation pack to AGENTS.md packs list ([5b0a964](https://github.com/korchasa/flowai/commit/5b0a9644ea64cbcc7a594cfbb319ae3ee107a32a))
* **ides-difference:** add OpenAI Codex CLI data across all comparison sections ([b24e05c](https://github.com/korchasa/flowai/commit/b24e05ce5ab8c8b80771399572ab1828be7a75c0))
* **ides:** add session/conversation history storage comparison ([c2e4522](https://github.com/korchasa/flowai/commit/c2e4522ded24ed692e48267229b6de2fcdd5e5fb))
* **maintenance:** fix typo in todo_write tool name ([ca64313](https://github.com/korchasa/flowai/commit/ca64313dfae1f50a09737dac18b71247b8ede4bb))
* **maintenance:** remove explicit whiteboard.md filename references ([3296c6a](https://github.com/korchasa/flowai/commit/3296c6abb56fc6b73c9c392ef321acf4e8e0cc15))
* mark af-reflect as benchmarked in SRS ([0fa6b03](https://github.com/korchasa/flowai/commit/0fa6b03ad50890107e236e599ba4bacc475e294f))
* mark FR-14/15/16 criteria as done with evidence, clean up settings.json ([a7d60f4](https://github.com/korchasa/flowai/commit/a7d60f4ca3d83e89680dea72555414b38664e9b3))
* merge RND control primitives data into ides-difference.md and remove source ([569a2d4](https://github.com/korchasa/flowai/commit/569a2d4d29fbae5f73a8527376dbba8a5d71bc15))
* overhaul prompt engineering guides for instant and reasoning models ([a964437](https://github.com/korchasa/flowai/commit/a96443724975ecc646754372b8b8ce6fed8d6728))
* **readme:** simplify README description to refer to Cursor rules ([9bcb414](https://github.com/korchasa/flowai/commit/9bcb4146569de680d4fdb8e0a0a86ed6460c28f1))
* refine control primitives comparison documentation ([52025d5](https://github.com/korchasa/flowai/commit/52025d5615a7c4fe7fb644ffbf38194f6c94c1b8))
* refine task planning guidelines in task-plan-with-qa.md ([cc20c10](https://github.com/korchasa/flowai/commit/cc20c10fce285e6d029d04910db02ccb8a043e81))
* refresh IDE differences with footnotes and new sections ([a3dcb29](https://github.com/korchasa/flowai/commit/a3dcb2936eb493e8c9704f5ec35f49b187db7d10))
* reinforce GIT_PAGER usage in RULE.md ([62b134d](https://github.com/korchasa/flowai/commit/62b134d53dcf0db182f3d1c145e57d48f7c7842f))
* remove duplicate build-in-ide-tools.md (data already in ides-difference.md) ([5f55dff](https://github.com/korchasa/flowai/commit/5f55dff9f74e5fd9f417835dedf7208a728ec3a6))
* remove interactive clarification requirement and AskQuestion tool references ([0c3acf1](https://github.com/korchasa/flowai/commit/0c3acf11bbfc9987a7a92655cc9e175435cff805))
* remove obsolete RnD documents ([10f68e2](https://github.com/korchasa/flowai/commit/10f68e238b090eede02dba3754a8e883c14d75ef))
* remove outdated task planning guidelines from task-plan-with-qa.md ([3c89134](https://github.com/korchasa/flowai/commit/3c89134477f73086425b9d7b9b17d5fbc1202783))
* remove Russian language requirement from howto-write-in-informational-style and adjust task-review guidance to drop language constraint and revise negative-aspects wording ([45495aa](https://github.com/korchasa/flowai/commit/45495aa12ca575df3d60ca818d3be7f0ad960b2a))
* rename "Steps" section to "Todo List" in all command docs ([905b24d](https://github.com/korchasa/flowai/commit/905b24d6cae20a217c10893b32f65f7b906ad2ec))
* rename FR IDs from numeric to mnemonic format across codebase ([cbb2a7e](https://github.com/korchasa/flowai/commit/cbb2a7ed5564ef90fc1b478bc15631c5bdf9a508))
* rename FR IDs from numeric to mnemonic format across codebase ([3d7a30d](https://github.com/korchasa/flowai/commit/3d7a30d1d9c697fa3a2b17fc16f1cd9b95b4897c))
* reorganize R&D documents and add new research notes ([3caad71](https://github.com/korchasa/flowai/commit/3caad71727ddb078fa4767acf25adba0481a863f))
* **requirements:** add FR-8 af-init, update FR-3/FR-6 status ([d16a22a](https://github.com/korchasa/flowai/commit/d16a22a0dc518bc4a1f8ec0b71c7622ac33f6081))
* **requirements:** mark FR-20.1–FR-20.11 as completed with evidence ([43048b2](https://github.com/korchasa/flowai/commit/43048b2a1d45e5f8f686c51bcd8090b4469c8085))
* resolve 7 contradictions across SRS, SDS, and AGENTS.md ([02b2116](https://github.com/korchasa/flowai/commit/02b2116dcc929da8850c897d381fc64e04e64d02))
* revise task-create-command documentation for clarity and structure ([82d1653](https://github.com/korchasa/flowai/commit/82d1653349d19d991031a16ac45c113bfc96b2ee))
* rewrite README with Assisted Engineering paradigm and multi-IDE focus ([54c9fcf](https://github.com/korchasa/flowai/commit/54c9fcf595bda4875eee701e24b9f2df9c8275ef))
* **rnd:** add Claude Code CLI feature analysis ([fd1e919](https://github.com/korchasa/flowai/commit/fd1e91973619ed20098da4f3bc3b1fac5924ff56))
* **rnd:** add Cursor subagent path to Custom Agents comparison ([7c795de](https://github.com/korchasa/flowai/commit/7c795debc928e06ad0b68e72601fa34ac45f3e13))
* **rnd:** add Hyperagents paper practical conclusions with evidence ([7f5d04e](https://github.com/korchasa/flowai/commit/7f5d04ee858f61f2abe07e2a793ab0f8c0b47946))
* **rnd:** add superpowers plugin analysis ([afa38f3](https://github.com/korchasa/flowai/commit/afa38f35de0b782055335a37dea41b8a85adcd5f))
* **rnd:** drop outdated rnd notes ([f311142](https://github.com/korchasa/flowai/commit/f311142162bef0f0d45e1e86429d06a7f1f1d2fb))
* simplify CODE STYLE RULES for TypeScript ([c21dcc7](https://github.com/korchasa/flowai/commit/c21dcc7b1f45d4d75e6e0715be7e6c09b79281b1))
* **spec:** add draft spec for skill versioning feature ([31b2a8d](https://github.com/korchasa/flowai/commit/31b2a8d8ad4e71f95a92a55ba435a7f9d0a115f7))
* **spec:** add skill versioning specification ([f7d9489](https://github.com/korchasa/flowai/commit/f7d9489db0560de88c25d2a6b95d3f1b646cdbcd))
* standardize Key Principles bullets in README with renamed categories (Stages, Rules, Documentation, Project Maintenance, Howto) ([e5405a6](https://github.com/korchasa/flowai/commit/e5405a6a9a83891558347075eaff0e80b4675ac3))
* sync documentation with current command set and workflows ([892eb45](https://github.com/korchasa/flowai/commit/892eb45e53772b52843e9698b404ba58a8bb1d3e))
* sync documentation with new commands ([0c0d4c7](https://github.com/korchasa/flowai/commit/0c0d4c76c6907a6fd8b95afbc53c96b2eb9b620a))
* **task-build-claude-md:** add manual execution restrictions and checklist to CLAUDE.md build guidance ([22b3db2](https://github.com/korchasa/flowai/commit/22b3db283d42c178ce383ba1d56ec33a211fbd37))
* **task-plan:** improve task planning workflow ([034f6e5](https://github.com/korchasa/flowai/commit/034f6e5cb812e51a1b80f36a00b35b10ccade8f8))
* update AGENTS.md generation instructions and checklist ([6b77f2f](https://github.com/korchasa/flowai/commit/6b77f2f3d7520d40441805474a4c0d25057bf366))
* update AGENTS.md with planning rules and dev commands ([b0fff37](https://github.com/korchasa/flowai/commit/b0fff37995b485e9f935f86b89498194cedec9f9))
* update available skills and commands in README ([39d7688](https://github.com/korchasa/flowai/commit/39d7688c9920cb8d9e81cabbb2587c1edc6335cc))
* update command list and count in project documentation ([4c4991d](https://github.com/korchasa/flowai/commit/4c4991dccb4890a23fef27b98453196215b81ec6))
* update command listings and remove references to non-existent run.ts ([0208b38](https://github.com/korchasa/flowai/commit/0208b38fb6e9772231b48deb566eafa5ed019f5b))
* update command references in design and README ([ce3597c](https://github.com/korchasa/flowai/commit/ce3597cebcc02aa0009dbc50c6614f92e8ccfa59))
* update control primitives comparison for cursor rules ([e0087fb](https://github.com/korchasa/flowai/commit/e0087fb25d9871b3c4455717e150d73e122e5b1e))
* update documentation guidelines in RULE.md ([81ec4b4](https://github.com/korchasa/flowai/commit/81ec4b4f95440231dfbfd2469c3e1a896db97f71))
* update FR-8, FR-10.8, FR-15.3, FR-16.3 statuses based on implementation audit ([9a16bda](https://github.com/korchasa/flowai/commit/9a16bda55a181b16a0d6b61f9b1bdf61a28249e4))
* update guide counts in requirements and design ([ce49029](https://github.com/korchasa/flowai/commit/ce49029722eb89d85d2674ba5b6d8ae1a43826cf))
* update IDE comparison — add plugin systems, remove Codex/Antigravity ([86a0fe7](https://github.com/korchasa/flowai/commit/86a0fe72aeb2f39d453fbc1129eecbdc74d0b0db))
* update IDE differences with Cursor Agent CLI findings and Claude Code details ([59fa77e](https://github.com/korchasa/flowai/commit/59fa77ed08f5ca5fdcd0f6f184712c4b089bb6e8))
* update ides-difference and whiteboard ([f1d7e4d](https://github.com/korchasa/flowai/commit/f1d7e4d95587cd92373338eb5f0aa0048d090624))
* update planning commands and related documentation ([b53989c](https://github.com/korchasa/flowai/commit/b53989c3411c1ac6b4b75151bee7a5ecee2d6cf9))
* update project rules and readme ([dec2feb](https://github.com/korchasa/flowai/commit/dec2feb6fa47ec05bd715304a88ec8cc791abc83))
* update README and requirements for post-0.3.2 changes ([a863f87](https://github.com/korchasa/flowai/commit/a863f874a233e0bfa6ec2c5fda65546ac22741c0))
* update README for monorepo structure ([0c42c67](https://github.com/korchasa/flowai/commit/0c42c67fb96a095d3e65eb9f18db46ec8a413aee))
* update README to reflect pack system, add to doc hierarchy ([3ba6e01](https://github.com/korchasa/flowai/commit/3ba6e01113eb6ea8a370412c1ba231b66a3ad2e2))
* update RULE.md to allow user language for notes ([5f9064b](https://github.com/korchasa/flowai/commit/5f9064b0e1618e054e5ed98d98a7477d76cd785c))
* update RULE.md to enforce GIT_PAGER usage ([2a8a563](https://github.com/korchasa/flowai/commit/2a8a563315da9271a93ce113b03fd2e627672ac2))
* update SDS with traceability model and agent name corrections ([60c2cb0](https://github.com/korchasa/flowai/commit/60c2cb0c5703a8a0011b5f4b25dd64006a7976ce))
* update SDS with traceability model and agent name corrections ([41bc9b5](https://github.com/korchasa/flowai/commit/41bc9b5f23f83affbe644ac2cb7e24dae2ebc23a))
* update SRS and SDS for af-init and dev commands configuration ([82e31fc](https://github.com/korchasa/flowai/commit/82e31fc2c8d7901bc609ad13c56378112a14a977))
* update SRS format with requirement numbering and acceptance criteria structure ([ec77a57](https://github.com/korchasa/flowai/commit/ec77a57822ea14fdd73e0cf38b0c0adfea096dd4))
* update SRS/SDS and add product vision ([b464e81](https://github.com/korchasa/flowai/commit/b464e81f9be6e52c8aa19ee2fa50b553ac5f9917))
* update SRS/SDS for single AGENTS.md architecture ([e766eb6](https://github.com/korchasa/flowai/commit/e766eb6868550131b4f7cf4fecc7801ea606ab8e))
* update task planning guidelines in task-plan.md ([c7b7772](https://github.com/korchasa/flowai/commit/c7b7772554426e5b79d10eb5b5909ddddd636614))
* update task-answer documentation for clarity and response handling ([0f63f49](https://github.com/korchasa/flowai/commit/0f63f49555c60ca4a5872d3c85f6a90a06762b24))
* update task-check-analyze and task-generate-agents command documentation ([ed35c23](https://github.com/korchasa/flowai/commit/ed35c236fd621cadd657dc0c825dde66fa36771a))
* update task-commit.md to enforce GIT_PAGER usage ([3684c1f](https://github.com/korchasa/flowai/commit/3684c1f921edad9f99e27bdbb0a4b5c2d5f4fa34))
* update task-execute.md to clarify documentation requirements ([76a5171](https://github.com/korchasa/flowai/commit/76a51713399f7ff54aca5af5db1c3c411a8686da))
* update TS strict code style rules to emphasize pure functions and immutability ([18f5710](https://github.com/korchasa/flowai/commit/18f57108fa80f2050512a299d67a176c6e463d1a))
* update whiteboard — ai-skel-ts removed from framework ([e5c3c66](https://github.com/korchasa/flowai/commit/e5c3c662d4eff73180a62c9e369f17e8176c3ec2))
* update whiteboard — P4 resolved ([9982df6](https://github.com/korchasa/flowai/commit/9982df6a5ed3605c728acc1cec0f52570168fb57))
* update whiteboard — P5 resolved ([428200c](https://github.com/korchasa/flowai/commit/428200c6f07b591b62a58ed9479ca38ac3b0c71d))
* update whiteboard — P6 partially resolved ([efbb5fd](https://github.com/korchasa/flowai/commit/efbb5fd0256631ee769f5efb338c1ff47207f08a))
* update whiteboard with deep research skill redesign plan ([d08fa20](https://github.com/korchasa/flowai/commit/d08fa200edc7ccb9165085721af5042e65eb089d))
* update whiteboard with packs plan, add plugin bundles comparison, remove stale spec ([6dcc931](https://github.com/korchasa/flowai/commit/6dcc9311698a2f7fa1ed925581fbe412b3242ce5))
* **versioning:** add draft spec for per-skill semantic versioning ([f0c33fa](https://github.com/korchasa/flowai/commit/f0c33fa1334a7ac52e4a4487f1b46041bb833462))


### Tests

* **af-init:** add idempotency benchmark scenario ([f24edaf](https://github.com/korchasa/flowai/commit/f24edaf687c71c41261e6548725fec5661061a63))
* **bench:** add adapt-all benchmark for full primitive adaptation ([fdcf66c](https://github.com/korchasa/flowai/commit/fdcf66cee10d791e3636a66dec69eb9a098cc278))
* **bench:** add af-init benchmarks and fix runner ([fc90452](https://github.com/korchasa/flowai/commit/fc90452b388a2196e71b3866fa64081257ba6fe1))
* **benchmarks:** add auto-docs scenarios and .flowai.yaml config ([5c98036](https://github.com/korchasa/flowai/commit/5c98036a269d173010c3a282d95a50cc86c03b85))
* **cli:** add commands field to FlowConfig fixtures in main_test ([76fc2bc](https://github.com/korchasa/flowai/commit/76fc2bc332637e4886ae0758fb663af072c6663a))
* **flow-review-and-commit:** add suggest-reflect benchmark scenarios ([bb9010a](https://github.com/korchasa/flowai/commit/bb9010a251c8c27d1f58294c9a45db2a56d38b8f))
* migrate benchmarks and skills to single AGENTS.md ([f2122c4](https://github.com/korchasa/flowai/commit/f2122c481a1a5eae36fec4a96001a3a29771003b))


### Chores

* add dev agents/skills, cleanup stale hook references ([7387202](https://github.com/korchasa/flowai/commit/73872022a74b1a40750ef8a4f9278c33ba1933ab))
* add session-init-docs hook config, format memory files ([8f5909d](https://github.com/korchasa/flowai/commit/8f5909d44617f542f244da26b8b719c018b3da4b))
* add worktrees configuration ([985a756](https://github.com/korchasa/flowai/commit/985a75672783c4022109a1c161d4616a7d084400))
* **benchmarks:** tune scenario timeouts, interactive mode, and params ([9eab6b3](https://github.com/korchasa/flowai/commit/9eab6b31ef71424cfb60fb55f5d34073efc4e81f))
* cleanup obsolete rules and update task command instructions ([6034fca](https://github.com/korchasa/flowai/commit/6034fca04ca56796ac5349f842468025e3e8649e))
* **commands:** move build CLAUDE to alpha draft ([107cdfe](https://github.com/korchasa/flowai/commit/107cdfec04029fdb868d0e6fe7652caf9e4dfbb7))
* configure sessionDocs for session-init-docs hook ([767b75f](https://github.com/korchasa/flowai/commit/767b75ff77c2634173fad535372a8e57b9bbb139))
* configure sessionDocs for session-init-docs hook ([c2ab3ec](https://github.com/korchasa/flowai/commit/c2ab3ec3d58af1d791fe8d7ccc37470323d89419))
* **cursor:** update commands and add Dockerfile rules ([773c1d1](https://github.com/korchasa/flowai/commit/773c1d18be321c504786a8769690dfbebaccc46b))
* **framework:** update flowai framework ([85785f0](https://github.com/korchasa/flowai/commit/85785f0291b32a411f0592f9a4a77477fbca2376))
* **framework:** update flowai framework ([a36e2d1](https://github.com/korchasa/flowai/commit/a36e2d184bef37f1e6b5e491677ee2a5aaa06459))
* **framework:** update flowai framework ([1c76d18](https://github.com/korchasa/flowai/commit/1c76d18db893ced8cd08c057acdf97ac42523c3d))
* **framework:** update flowai framework ([f1eb946](https://github.com/korchasa/flowai/commit/f1eb946660ef312029053835ebb915030f9824b1))
* **framework:** update flowai framework to 0.4.18 ([7ea38d0](https://github.com/korchasa/flowai/commit/7ea38d011fa27e37a59c50dcc3f7d654844f23fa))
* gitignore pipeline runs and update flowai config ([5de6f90](https://github.com/korchasa/flowai/commit/5de6f90d1b3e9a27668024f005fe4ac9b4510245))
* maintenance sweep — refactor trace.ts, fix design.md, add AGENTS.md and JSDoc ([db8f09c](https://github.com/korchasa/flowai/commit/db8f09cf917098faab49bb086fabdd269eaea734))
* **release:** 0.3.0 ([c30b32d](https://github.com/korchasa/flowai/commit/c30b32d76d2bcebbe3f8334836ae05cb4f3b0033))
* **release:** 0.3.1 ([969cf65](https://github.com/korchasa/flowai/commit/969cf656251ba70cef1141584b009bacb95fa253))
* **release:** 0.3.2 ([8708735](https://github.com/korchasa/flowai/commit/8708735f2c05181e54103ad805f1f281b7e4a802))
* **release:** 0.3.3 ([80fa147](https://github.com/korchasa/flowai/commit/80fa1470eed7b4dbdc962b0e6b55351c9b353503))
* **release:** 0.3.4 ([3718677](https://github.com/korchasa/flowai/commit/371867786107c0ccef134e1562599cbe6faa74cc))
* **release:** 0.3.5 ([57c9c6d](https://github.com/korchasa/flowai/commit/57c9c6df5884fd210141d04aa65f1ff2a3688426))
* **release:** 0.3.6 ([39500cd](https://github.com/korchasa/flowai/commit/39500cdf263bf086b2b54d961fd5e74b65c2642e))
* **release:** 0.3.7 ([0071ef2](https://github.com/korchasa/flowai/commit/0071ef24f98627ae7d5294bf3d0012e17557ec00))
* **release:** 0.3.8 ([4a0ff3f](https://github.com/korchasa/flowai/commit/4a0ff3f231be94e23f89c89d44fb22a670827d5d))
* **release:** 0.3.9 ([9def3c1](https://github.com/korchasa/flowai/commit/9def3c1db450aaa72d4aa986a6aa283a048039f6))
* **release:** 0.4.0 ([9b2d943](https://github.com/korchasa/flowai/commit/9b2d94387ebed6adcece9c30f315056e79aa596c))
* **release:** 0.4.1 ([75b8299](https://github.com/korchasa/flowai/commit/75b8299d835dc569e0c59f26850fc1a13bd328e6))
* **release:** 0.4.10 ([eb97966](https://github.com/korchasa/flowai/commit/eb9796696fb8669875a32b657a76bb4d922e07e7))
* **release:** 0.4.11 ([69ea503](https://github.com/korchasa/flowai/commit/69ea503d600b2d4b6f65de8626907937c040c7ab))
* **release:** 0.4.12 ([74d2f3b](https://github.com/korchasa/flowai/commit/74d2f3bb8f8bbfaca6bf5ba24d5070a3caecd65c))
* **release:** 0.4.13 ([8799598](https://github.com/korchasa/flowai/commit/87995987f52c9e4e6f3eaaa1a6d7c0d6f7c80abf))
* **release:** 0.4.14 ([c90d432](https://github.com/korchasa/flowai/commit/c90d432a4b20e4cb14fb804a93b010bce508db6d))
* **release:** 0.4.15 ([019a943](https://github.com/korchasa/flowai/commit/019a9430b63a58ab08ccb4fe5216ea43099e5e3a))
* **release:** 0.4.16 ([2003f0f](https://github.com/korchasa/flowai/commit/2003f0f325d229baeaf03a405188809e7b2a4599))
* **release:** 0.4.17 ([26d00e6](https://github.com/korchasa/flowai/commit/26d00e6dd8428f8a1a56d5fffd4acef3904bf109))
* **release:** 0.4.18 ([b2613e5](https://github.com/korchasa/flowai/commit/b2613e541d6020353edd5166ecde060332835dd6))
* **release:** 0.4.19 ([18f8d25](https://github.com/korchasa/flowai/commit/18f8d25c2430841b5afd9d429684cc7fb3b05b16))
* **release:** 0.4.2 ([cecef7c](https://github.com/korchasa/flowai/commit/cecef7c7feb2ef531bbde6fd5af965b724ea8141))
* **release:** 0.4.20 ([e3f287f](https://github.com/korchasa/flowai/commit/e3f287ffc3bb4b730731cc828ec54a294b782eee))
* **release:** 0.4.3 ([d1b5e62](https://github.com/korchasa/flowai/commit/d1b5e6295bcec192989ed03f3f0d320ae244589a))
* **release:** 0.4.4 ([27435d0](https://github.com/korchasa/flowai/commit/27435d0bc1e9aa63904b172f2f014a197b954d71))
* **release:** 0.4.5 ([4629ce9](https://github.com/korchasa/flowai/commit/4629ce96d7c23f1e290b7f5789d7639f47fb3e82))
* **release:** 0.4.6 ([239e908](https://github.com/korchasa/flowai/commit/239e90877d85ff130acd832f7bef5fe16fb1adb8))
* **release:** 0.4.7 ([db68a26](https://github.com/korchasa/flowai/commit/db68a2669309d8a1379e2df32ac0676795f63bbe))
* **release:** 0.4.8 ([c5538be](https://github.com/korchasa/flowai/commit/c5538beaa727911ce74cb30005d8dada2561c3b0))
* **release:** 0.4.9 ([f920c42](https://github.com/korchasa/flowai/commit/f920c423ddc0f72e80db57be9230d3104c4ef0e6))
* **release:** 0.5.0 ([1d4c4df](https://github.com/korchasa/flowai/commit/1d4c4dfb0d4c237f6d00542de5a23a99d81a0422))
* **release:** 0.6.0 ([f0a9b2a](https://github.com/korchasa/flowai/commit/f0a9b2a316c82ca13dd36079439cfaab55d0f6af))
* remove .claude/ from tracking and add to .gitignore ([41b7a20](https://github.com/korchasa/flowai/commit/41b7a207712b9378e1a5d37245ef4fb338010394))
* remove .flowai/runs/ from tracking ([c476da3](https://github.com/korchasa/flowai/commit/c476da35a88647de3d1e826ece78fb3e41adb928))
* remove deprecated commands and rules ([d35ff91](https://github.com/korchasa/flowai/commit/d35ff9159dd3ab3a1aad1d920f31f9185330023d))
* remove deprecated settings.json and whiteboard.md files ([099dec0](https://github.com/korchasa/flowai/commit/099dec056c3e366f9a1da06cb335f3fa3b12b7b9))
* remove flowai-skill-example and prevent re-creation ([e900e3e](https://github.com/korchasa/flowai/commit/e900e3e74ee5fdede74bad6f2fec25bfbfbf4d6e))
* remove obsolete R&D tasks format documentation ([96bb277](https://github.com/korchasa/flowai/commit/96bb27799fc03f5cf2908594fc60acc257235652))
* remove write-skill command ([c099095](https://github.com/korchasa/flowai/commit/c099095c935357ec322262b508143f071f2adc90))
* **repo:** collapse legacy three-file AGENTS.md layout ([28a4970](https://github.com/korchasa/flowai/commit/28a4970e752c6e5c1b29ee1453d0112f922e2b1a))
* **scripts:** add IDE environment detection utility script ([6261118](https://github.com/korchasa/flowai/commit/62611187972ba799669d4fcc2fd3cee77196e90f))
* sync framework skills/agents via flow-cli ([2a6db9a](https://github.com/korchasa/flowai/commit/2a6db9a070f47c0b15cdfbb7571856a393e56e7b))
* update .gitignore and add .cursorignore ([800f44a](https://github.com/korchasa/flowai/commit/800f44a1c90cba60be40b2eb276b975bc197d8d9))
* update .gitignore and enhance README with new command descriptions ([8ec97a5](https://github.com/korchasa/flowai/commit/8ec97a5e846b701f2281f0b3bf3fd1a0158f7e66))
* update .gitignore to ignore .vscode ([553c382](https://github.com/korchasa/flowai/commit/553c382ca7bccc677a06bb090e1ef063719fbde3))
* update .gitignore to ignore documents directory ([5a4ee0b](https://github.com/korchasa/flowai/commit/5a4ee0b277047079e8adbfd1568aec1a9acf0a16))
* update flow-cli submodule (PATH docs) ([70671e8](https://github.com/korchasa/flowai/commit/70671e8a28ced0714b03de75ec9b1672bb5c9cdd))
* Update project files and add README.md ([1cb69ba](https://github.com/korchasa/flowai/commit/1cb69baace274ed8c00a131309d265363257540b))
* update repo scaffolding and cleanup ([324ce4e](https://github.com/korchasa/flowai/commit/324ce4e59a416475269a60151340184a93f0d25b))
* update repo URL korchasa/flow → korchasa/flowai ([6b348ac](https://github.com/korchasa/flowai/commit/6b348acb1c1ac10603e671a1075e9cb4d5ae7c15))
* **vscode:** remove .vscode/settings.json ([5fedb82](https://github.com/korchasa/flowai/commit/5fedb82e652d8bedebe20b949679520c79d28e48))


### Code Refactoring

* adapt trace generator to tasks.guru style and colors ([8590369](https://github.com/korchasa/flowai/commit/85903695892c7c1e733e8411da3dd8a4626f1dd8))
* add flowai- prefix to all framework hooks and agents ([582914e](https://github.com/korchasa/flowai/commit/582914e744e19245f3196e20a47c4c28a32f7257))
* **af-commit:** simplify atomic commit rules for logical grouping ([bee11e6](https://github.com/korchasa/flowai/commit/bee11e6a08c86747139e0702e2bd35446e33c275))
* **af-commit:** update commit rules and instructions ([410140e](https://github.com/korchasa/flowai/commit/410140e5238b96a78e89b26c70b2940c93935655))
* **af-plan:** deduplicate planning rules, reference AGENTS.md ([cc5cabd](https://github.com/korchasa/flowai/commit/cc5cabde74de02552bd696e506cd87fd9a70d011))
* **agent:** restrict flowai-skill-adapter to Bash-only tools ([6516bb5](https://github.com/korchasa/flowai/commit/6516bb56abd134a3e9d29af14d07c512b18c05c5))
* **agents:** remove explicit model declarations from agent frontmatter ([db909cc](https://github.com/korchasa/flowai/commit/db909ccfd114540f36c57d3425dcf2ac4db2cb47))
* **agents:** restructure to per-IDE subdirs with frontmatter validation ([8684dbb](https://github.com/korchasa/flowai/commit/8684dbb71f71d9d450b8540332fc8da27fd14894))
* **agents:** update flow-skill-executor ([8f15742](https://github.com/korchasa/flowai/commit/8f15742a5d591f657227b6d89794f4da83bd0ade))
* **benchmarks:** expand benchmark coverage and compress docs to reference benchmarks ([455c6a2](https://github.com/korchasa/flowai/commit/455c6a237fea82a1cad87c095105e47c39c674f1))
* **benchmarks:** improve judge evidence, fix score calculation, add safety ([5cccd5b](https://github.com/korchasa/flowai/commit/5cccd5b32101ccf6e4ccf9f1d4df01c2329df8e8))
* **benchmarks:** migrate to @bench/ import map and clean up checklist types ([aee77db](https://github.com/korchasa/flowai/commit/aee77db8b73241fccb153909960ed9a41cd999f0))
* **benchmarks:** require agentsTemplateVars, remove legacy agentsMarkdown ([4668f65](https://github.com/korchasa/flowai/commit/4668f656d6e8fed074499afe857795e11ecf8f84))
* **benchmarks:** split trace.ts into modular architecture ([83107ea](https://github.com/korchasa/flowai/commit/83107ea1c00c811671cfbf51e3d606247f4fec6d))
* **catalog:** remove flow-execute and flow-plan agents ([8162464](https://github.com/korchasa/flowai/commit/8162464265cb46c0ebc6b29263394c345027e10d))
* **catalog:** remove flow-skill-debug-by-playwright ([c2d338d](https://github.com/korchasa/flowai/commit/c2d338dbcc43360e7530e411aef137df21799150))
* **catalog:** update flow-do, flow-engineer-subagent, flow-execute, flow-auto skills ([a8599b5](https://github.com/korchasa/flowai/commit/a8599b5ca9a0d24216a44b767c482571a933f081))
* **catalog:** update flow-init skill and AGENTS template ([e583524](https://github.com/korchasa/flowai/commit/e583524296d121f4d822c91dd1d760b2b5829e43))
* **catalog:** update flow-maintenance and flow-reflect skills ([765eba9](https://github.com/korchasa/flowai/commit/765eba96b3cc223d6818622130c4dfb117715de9))
* **catalog:** update flow-skill guides ([7fd2976](https://github.com/korchasa/flowai/commit/7fd2976ae6dcc11adc20629ab6377923c47ccab1))
* **cli:** extract local sync into standalone deno task ([2e4965d](https://github.com/korchasa/flowai/commit/2e4965d52a505f9a8413aaab7be7ef49b7ae9317))
* **cli:** split sync.ts god object into focused modules, fix docs ([832d1aa](https://github.com/korchasa/flowai/commit/832d1aafda87cf589228b572fd6ab09606e40ac7))
* co-locate benchmarks with skills (FR-7.1) ([0927be7](https://github.com/korchasa/flowai/commit/0927be72625539de01a27622496b910dc510893b))
* **commands:** consolidate planning workflows and enhance GODS framework ([14a4afa](https://github.com/korchasa/flowai/commit/14a4afabaddc66226163d529d529ab208891f0b5))
* **commands:** drop task prefix from command files ([8ca231b](https://github.com/korchasa/flowai/commit/8ca231b9c35c736c3c2a6f705e497aa09b447613))
* **commands:** integrate BED-LLM algorithm details into workflow steps ([e9664e0](https://github.com/korchasa/flowai/commit/e9664e0c464896522e821b1dbd2fe6424b6fce50))
* **commands:** remove AskQuestion tool references ([730f2c4](https://github.com/korchasa/flowai/commit/730f2c4c56b7d56da062bbb2feca6a4499f9e1d9))
* **commands:** remove plan-and-execute command ([4c7b591](https://github.com/korchasa/flowai/commit/4c7b5914569bebf6e3eee4e07479af2fe83020a6))
* **commands:** remove unused command files and update documentation ([7285577](https://github.com/korchasa/flowai/commit/72855774b208b163700dc83e0a81c6924aec4fc2))
* **commands:** rename alpha-task-build-claude-md to task-build-agents-md ([3407e1a](https://github.com/korchasa/flowai/commit/3407e1a8ecb41a38c8c368ed113f5d2732855284))
* **commands:** rename validation checklist to verification ([8e55e48](https://github.com/korchasa/flowai/commit/8e55e4872fd53fec8d7f5bbeec8e7ebe48f1d182))
* **commands:** reorganize investigation and analysis workflows ([7238aab](https://github.com/korchasa/flowai/commit/7238aab0f07ed6db9e50ed4225ffe128746da229))
* **core:** remove flowai-skill-executor agent ([6d2a96b](https://github.com/korchasa/flowai/commit/6d2a96bf15dda71d2ddf06a2e9748eadb08d425e))
* **cursor:** convert GODS rule to how-to guide ([673c88d](https://github.com/korchasa/flowai/commit/673c88d3698c24a5c1574ee8f89846ca53fda824))
* **devcontainer-skill:** replace Keychain auth-forwarding with fully manual auth policy ([28f5f42](https://github.com/korchasa/flowai/commit/28f5f42ddc8eb17e0144bf1761e6de0796766bb0))
* **devcontainer:** align project config with new Auth Policy and SKILL.md rules ([df70091](https://github.com/korchasa/flowai/commit/df70091f3f3df3673d22c6981890e0c443a2e69e))
* **docs:** remove standalone vision.md, consolidate into AGENTS.md ([c1e2dfc](https://github.com/korchasa/flowai/commit/c1e2dfcaa4fa1124cbf8f99ce26e57a57fff661f))
* extract experiments subsystem to flowai-experiments repo ([32ece08](https://github.com/korchasa/flowai/commit/32ece080e25c4c5ba315512b376b8fda67a1e272))
* **extract-claude-code-prompt:** support JS bundles and add helper scripts ([0cc6ac4](https://github.com/korchasa/flowai/commit/0cc6ac40dc6bc114924ca6a2a76361a0d3b5ffdd))
* **flow-init:** make TDD commands in AGENTS.template generic ([8e9ab34](https://github.com/korchasa/flowai/commit/8e9ab34e089b002acb79faed1c3e99c7b2b8c004))
* **flow-init:** merge analyze/inventory/verify into single script output ([f77ea17](https://github.com/korchasa/flowai/commit/f77ea1723bbc53c8f6700d57210511cef3decda2))
* **flow-init:** replace manifest-driven generation with agent-native approach ([f7f6a07](https://github.com/korchasa/flowai/commit/f7f6a079305407a4eaf618ed6140b3ab897ed4e3))
* **flowai-maintenance:** deliver findings inline instead of saving to task file ([81f9f1b](https://github.com/korchasa/flowai/commit/81f9f1be4450b22d22d48e333eedb86796d96e93))
* **framework:** merge three AGENTS.md templates into one ([d0d31bb](https://github.com/korchasa/flowai/commit/d0d31bbac9fc45a4fc0a36716d628a2992c6bbb6))
* **framework:** remove adapted frontmatter field ([ba887ff](https://github.com/korchasa/flowai/commit/ba887ff416ab4554ee6cc14bfb3b8ce167f4b20f))
* **framework:** remove flow-skill-ai-skel-ts (moved to ai-skel-ts library) ([5e6a304](https://github.com/korchasa/flowai/commit/5e6a304aab9d960b9b3388d68996c03b297f79cd))
* **framework:** split commands from skills into sibling dirs ([fa8beb2](https://github.com/korchasa/flowai/commit/fa8beb21a06987825ef30c3c5a9c8cf3f951b1da))
* **install:** remove shell bootstrap and fix process hang on exit ([8cad430](https://github.com/korchasa/flowai/commit/8cad430f7d8a999c6874f6db0a15a95bd7193288))
* merge flow-cli submodule into monorepo ([eb6d983](https://github.com/korchasa/flowai/commit/eb6d9836023e7e10b837136fa202726e4a34bbe1))
* **pipeline:** add flowai- prefix to all pipeline pack primitives ([bd5ef53](https://github.com/korchasa/flowai/commit/bd5ef537fa8c3d05f2ce3cf6b2b10f4142b95d80))
* **pipeline:** rename .flow/ to .flowai/ and move engineer-pipeline skill ([19cb55b](https://github.com/korchasa/flowai/commit/19cb55b2ddeab8cec9debbd0db60637862a1bd20))
* **pipeline:** rename automation→pipeline pack, inline PM into orchestrator, fix test-fitting in benchmarks ([97a3639](https://github.com/korchasa/flowai/commit/97a3639cf1d03d1a0adc8eb4732d2ab3340d8706))
* **project:** reorganize file structure into .cursor/ directories ([8b46177](https://github.com/korchasa/flowai/commit/8b46177de97a71f3a7690b2b1174a53837993a24))
* reclassify skill types — engineer→skill, setup→setup-agent ([ff1b347](https://github.com/korchasa/flowai/commit/ff1b347c79f9e6fef07df744478cd2687b034cd5))
* remove flowai-session-init-docs hook and sessionDocs config ([74b4b70](https://github.com/korchasa/flowai/commit/74b4b70eac8275c45000eb52f9c2e717e743bd43))
* remove flowai-session-init-docs hook and sessionDocs config ([f2f6455](https://github.com/korchasa/flowai/commit/f2f64555eef871d27b7fbc709d7458a785d9c6a6))
* remove lint-on-write and test-before-commit from framework hooks ([ae26c5a](https://github.com/korchasa/flowai/commit/ae26c5ac69e212f995c703dbcb382a71c84eede8))
* remove lint-on-write and test-before-commit from framework hooks ([47d39fa](https://github.com/korchasa/flowai/commit/47d39fa1fb521b6f4322c8bd6537a16ebfe947ad))
* remove pipeline pack and all references ([bb1a1d1](https://github.com/korchasa/flowai/commit/bb1a1d1b907a445f3d52c617b023e9ae034465bb))
* remove settings.json to simplify configuration ([311a8b9](https://github.com/korchasa/flowai/commit/311a8b935dbe5f8a2df77e7ef1e8a0017f2c2bb8))
* rename af-* prefix to flow-* ([da1e32b](https://github.com/korchasa/flowai/commit/da1e32b2ab7e84a6fba9e470fc5071e9f14058dd))
* rename agents to flow-* convention and update references ([91023e2](https://github.com/korchasa/flowai/commit/91023e2799d3619061e95fd2069fb810c255eb21))
* rename AssistFlow to flowai across the project ([b1b42eb](https://github.com/korchasa/flowai/commit/b1b42eb4adb05ee50980f97034a2f3ea7a5112fc))
* rename catalog/ to framework/ ([f6ab187](https://github.com/korchasa/flowai/commit/f6ab1876a070aa6391acaf3433cdf878a2970963))
* rename create-deno-scripts command to create-scripts ([649ccd4](https://github.com/korchasa/flowai/commit/649ccd4f089aa1909cdf5b780a85aa6a5f0e7da5))
* rename Deno skills to follow flow-skill-* convention ([01d8ca8](https://github.com/korchasa/flowai/commit/01d8ca8161ec64998b3a9e517ef309ec078cb0d9))
* rename flow-cli → flowai ([218bdc5](https://github.com/korchasa/flowai/commit/218bdc5f2c21a50b9ea0579a8f7acc622348e1d6))
* rename test files to Deno _test.ts convention ([b41b97b](https://github.com/korchasa/flowai/commit/b41b97b34a8f79500ae480bc3159330c20f64420))
* rename whiteboards to tasks, flowai-spec to flowai-epic ([58739e8](https://github.com/korchasa/flowai/commit/58739e8d67a311e9e4ce258166483a81a0736c06))
* replace flow-skill-configure-strict-typescript with setup-code-style ([7938015](https://github.com/korchasa/flowai/commit/7938015af66ee825781f95bf21dd998f3a1a30f9))
* replace session-start doc reading with per-skill lazy SRS/SDS instructions ([06fa516](https://github.com/korchasa/flowai/commit/06fa516608b9bb677e39eb8e23d50072ad6fb0b2))
* **rules:** migrate .mdc files to directory-based RULE.md structure ([be73683](https://github.com/korchasa/flowai/commit/be73683abbd9aa3a44fab4d251ae35b7d1c4d261))
* **rules:** remove iOS-specific requirements from main-example rule ([b901ab4](https://github.com/korchasa/flowai/commit/b901ab45d0d2137738f88c36a276ca1b3fbcaabf))
* **scripts/benchmarks:** remove three-template runner branches ([fbc06d0](https://github.com/korchasa/flowai/commit/fbc06d0b60b9782d14de834155d14893b5180b91))
* simplify .gitignore by consolidating .claude entries ([ef5b62b](https://github.com/korchasa/flowai/commit/ef5b62bd0816be3ba404a919e84edf64a9923855))
* **skill:** make extract-claude-code-prompt binary-only and external ([24e6339](https://github.com/korchasa/flowai/commit/24e63396bfbde2168d722645930694e5b8b1c76a))
* **skills:** generalize task management tool description ([1754223](https://github.com/korchasa/flowai/commit/17542235b7639056f451f667d6644129b765f9be))
* **skills:** make flowai-init/flowai-update stack-agnostic for command configuration ([716c4e5](https://github.com/korchasa/flowai/commit/716c4e55a2e1c75bd983b40808bdc1b2ecbe7517))
* **skills:** remove flow-do and flow-execute, superseded by AGENTS.md rules ([c8fde03](https://github.com/korchasa/flowai/commit/c8fde033a67f5b1f6e01abdd5c25587e6481bfd5))
* **skills:** remove obsolete flow-auto and flow-convert-cursor-to-claude skills ([d55f608](https://github.com/korchasa/flowai/commit/d55f60894401c769e8074efb59a5e99358232de3))
* **skills:** rename flow-skill-manage-github-tickets-by-mcp → flow-skill-manage-github-tickets ([cc1bad0](https://github.com/korchasa/flowai/commit/cc1bad029c0d5b4e3779e78b5f5b7078240b6d95))
* **skills:** rename flow-skill-playwright-cli → flow-skill-browser-automation ([bd310b8](https://github.com/korchasa/flowai/commit/bd310b869f3ebb735c7d8d8d9cbb69db0a03a585))
* streamline task-create-command.md for clarity and structure ([c806078](https://github.com/korchasa/flowai/commit/c806078f49f42ffaf2d67afb95c3c2b1af53d62a))
* **task-link:** create per-item symlinks from .dev/ and framework/ into IDE dirs ([b3e7c66](https://github.com/korchasa/flowai/commit/b3e7c66981fcb860512702b422eabdf243f2e8a0))
* update do command steps for clarity and verification ([cf48c4c](https://github.com/korchasa/flowai/commit/cf48c4c3bb2edf29a62a6cc7b20e34e42ca2a914))
* update fix attempt rules to use 5-why analysis ([7ce1578](https://github.com/korchasa/flowai/commit/7ce15785f937abc39c87f6406ac4f0a1ebe36d8a))


### Styles

* **agents:** normalize markdown formatting in agent definitions ([b1bc8d1](https://github.com/korchasa/flowai/commit/b1bc8d1ece5b9a489ed20b1f0866063e8e31c720))
* apply deno fmt formatting ([14a4480](https://github.com/korchasa/flowai/commit/14a448056591c749b0af7105200f6f4bf489bf6f))
* **benchmarks:** apply deno fmt formatting ([5e4d78d](https://github.com/korchasa/flowai/commit/5e4d78ddfb317936c46d11f70a98842b1d05406c))
* **benchmarks:** fix quote consistency in consolidate scenario ([3b8d006](https://github.com/korchasa/flowai/commit/3b8d006f800ecf9a387451aca5d134dd780589f0))
* **cli:** apply deno fmt to hooks.ts and migrate.ts ([37802db](https://github.com/korchasa/flowai/commit/37802dbe06e25a896a49eb8b3031336ced561945))
* **cli:** fix formatting after merge conflict resolution ([5b5384a](https://github.com/korchasa/flowai/commit/5b5384aff06e5916a8823ee47b7e364050d5273e))
* **cursor:** add dependency injection rules for TypeScript classes ([e388495](https://github.com/korchasa/flowai/commit/e38849505fd91190b351563d48cc247882500d64))
* **cursor:** unify headings and formatting in rules and commands ([f6eedc5](https://github.com/korchasa/flowai/commit/f6eedc5be477f69ecc409f9fc061ffb3d2189c01))
* fix trailing whitespace in deno-cli skill ([b1ba46c](https://github.com/korchasa/flowai/commit/b1ba46c6ceff064af92e8bd01fa59266bc1b07bf))
* format benchmark code ([0136679](https://github.com/korchasa/flowai/commit/0136679876e3bc161e21ebafb9fb25685f578faa))
* format cursor skills and agents documentation ([8dc8693](https://github.com/korchasa/flowai/commit/8dc869338c0b2c0dcbea1620028d1d14db63b3d4))
* reformat HTML assets for current Deno fmt rules ([b1739a3](https://github.com/korchasa/flowai/commit/b1739a3634739b72a54bc31b0f1791b280bd1093))
* reformat HTML assets for Deno 2.7.11 fmt rules ([446e2ed](https://github.com/korchasa/flowai/commit/446e2ed220c3bec2eeb56a2e445a49fdbace13e4))
* remove backticks from todo_write in SKILL.md files ([4e62f0d](https://github.com/korchasa/flowai/commit/4e62f0d908ecdfce3857640d4209755400ebe4cb))
* remove emojis from benchmark writing skill ([f72e456](https://github.com/korchasa/flowai/commit/f72e4563ac51d753f85fdf0fc6228a0e8ac90404))
* sync .claude/ from framework and apply formatting fixes ([bec1efb](https://github.com/korchasa/flowai/commit/bec1efbcde39f19cbb59549447fc19b5268d7cc9))

## 0.6.0 (2026-04-12)


### ⚠ BREAKING CHANGES

* **framework:** framework/core/assets/ no longer ships
AGENTS.documents.template.md or AGENTS.scripts.template.md.
pack.yaml `assets:` map is now single-entry. Downstream
projects must run `/flowai-update` to collapse their legacy
three-file AGENTS.md layout; `flowai-update` detects the
legacy layout and guides a per-file confirmation merge.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
* All skill names changed from af-* to flow-*.
Commands like /af-commit are now /flow-commit.

Co-authored-by: Cursor <cursoragent@cursor.com>
* **rules:** Rule files moved from .mdc extension to RULE.md in directories.
Cursor IDE will automatically detect and load rules from new structure.

### Features

* add 'fail fast' strategy to AGENTS rules ([8557845](https://github.com/korchasa/flowai/commit/855784514d0a54f89cfa03ee9141a3ec263cedc1))
* add af-skill-generate-code and context-inefficiency benchmark scenario ([bcd1d50](https://github.com/korchasa/flowai/commit/bcd1d5062dc608217a35a8056c906dfb13d2dac6))
* add Cursor desktop and OpenCode guides to skills catalog ([ed5718e](https://github.com/korchasa/flowai/commit/ed5718eff822af1921085dfc0479fcc17571df05))
* add extract-claude-code-prompt skill for prompt reverse-engineering ([16466f2](https://github.com/korchasa/flowai/commit/16466f20d2c49777e1417d664b27452425574413))
* add flow-skill-playwright-cli and update requirements ([e1321c1](https://github.com/korchasa/flowai/commit/e1321c1a032451e2c11b316686e2d8196494e5d9))
* add how-to guide for writing DEP ([723de86](https://github.com/korchasa/flowai/commit/723de86a6d92ad7a6aeeb705ff7a44b4a9d6e414))
* add new commands and enhance existing development workflows ([0926ab2](https://github.com/korchasa/flowai/commit/0926ab25351fc036d8dee32dcb4fecf8f0d2919c))
* add QA command for task verification and cleanup ([73ce2d0](https://github.com/korchasa/flowai/commit/73ce2d0e30f462f8b5d7d67b3bfa7182bd58a8db))
* add reflect command ([27488f2](https://github.com/korchasa/flowai/commit/27488f2d26e8c576dbf4e6cd8736aafe06f91bf7))
* **af-engineer-skill:** add references and scripts ([576ec4d](https://github.com/korchasa/flowai/commit/576ec4dd92b77567d914af0cfc0d7f7e19d25687))
* **af-engineer-subagent:** add subagent engineering skill ([fad0b60](https://github.com/korchasa/flowai/commit/fad0b6070728ddf89eb75700ee195d2e1907a0ca))
* **af-init:** add component inventory and dev commands configuration ([aa42252](https://github.com/korchasa/flowai/commit/aa422520cee9383c5fd293b6d359b26e4ce93233))
* **af-init:** add standard interface commands to project template ([907de72](https://github.com/korchasa/flowai/commit/907de72a23c2a51e199542d77986b72ee8bba5f2))
* **af-init:** improve brownfield workflow and agent template ([70df9b3](https://github.com/korchasa/flowai/commit/70df9b38999f2a91f4ab26fc5acef3454f0851e5))
* **af-init:** move documentation generation from script to agent ([fa66a4b](https://github.com/korchasa/flowai/commit/fa66a4bae492ed1c047de9c6adf3337f4b21ad68))
* **af-init:** preserve PROJECT_RULES on AGENTS regeneration ([82d5968](https://github.com/korchasa/flowai/commit/82d5968912b58e210d96184646ba5a102fe794ec))
* **af-setup-code-style:** add Deno and strict TS setup skills ([e899178](https://github.com/korchasa/flowai/commit/e899178a2fd2d265c28cd7d639f9340fbf5f3d6e))
* **af-skill-ai-skel-ts:** add AI agent scaffold skill ([bc8ac83](https://github.com/korchasa/flowai/commit/bc8ac83faf5593a5d32c2a2f77d2b0beced4f962))
* **af-skill-configure-deno-commands:** add skill for standardizing deno dev commands ([41962cd](https://github.com/korchasa/flowai/commit/41962cd3c777636a839b4626fbf4497fc5c81d71))
* **af-skill-configure-strict-typescript:** add strict TypeScript configuration skill ([dd0f449](https://github.com/korchasa/flowai/commit/dd0f44910c4e4fb3275b521c9b656822a80f275f))
* **agents:** add flow-console-expert subagent ([36ea657](https://github.com/korchasa/flowai/commit/36ea657e5821c63f0d62f13115f0e29a2361b144))
* **agents:** add general-purpose executor agent ([e79843c](https://github.com/korchasa/flowai/commit/e79843cddc537cae605717ea15ed70e475b19d7f))
* **agents:** specify default models for prompt-engineer and skill-executor ([3a24d18](https://github.com/korchasa/flowai/commit/3a24d18aab7099de6def063f148291e66a4e72cf))
* **automation:** add automation pack with SDLC pipeline, role-specific subagents, and benchmarks ([f468374](https://github.com/korchasa/flowai/commit/f46837494f5e1e13f63935d063a52ce79dd52328))
* **bench:** add pack-level AGENTS.md rules benchmarks and relocate templates ([b23e623](https://github.com/korchasa/flowai/commit/b23e6231232739926367bde2d792936ab75c95d5))
* **bench:** implement secure dockerized execution for benchmarks ([#4](https://github.com/korchasa/flowai/issues/4)) ([ce1d4c1](https://github.com/korchasa/flowai/commit/ce1d4c15745c4f2ac6ec103724016fe6bef1a35a))
* **benchmarks:** add 25 new benchmark scenarios for framework skills ([facab36](https://github.com/korchasa/flowai/commit/facab368949df6ac82b06726c4cba5b2799ab902))
* **benchmarks:** add benchmark system for subagents ([782de3a](https://github.com/korchasa/flowai/commit/782de3a8ba7e2df542d1a6e117e2b910fecc903a))
* **benchmarks:** add multi-IDE support via adapter pattern ([#6](https://github.com/korchasa/flowai/issues/6)) ([97b19b8](https://github.com/korchasa/flowai/commit/97b19b88064f4fb943fa42e07c1fcf19aaa03537))
* **benchmarks:** add pack-scoped sandbox isolation and cross-pack reference validation ([9dda164](https://github.com/korchasa/flowai/commit/9dda1642accb09c6fe6f47d3561b5c53d03bc828))
* **benchmarks:** generate AGENTS.md from templates, add CLAUDE.md symlinks ([da51344](https://github.com/korchasa/flowai/commit/da5134431ea12c6d258276954d82354de2fc8595))
* **benchmarks:** migrate to stream-json, add NO_COLOR support, skip logic ([6cdb1b5](https://github.com/korchasa/flowai/commit/6cdb1b55056533b4fb8284f44bf51fe644683537))
* **benchmarks:** switch judge to Claude CLI, add parallel execution and explicit trace IDs ([c3c0741](https://github.com/korchasa/flowai/commit/c3c074116c82e595095ae26d35aaaaaf0f0ca8d1))
* **catalog:** add flow-commit agent for automated commit workflow ([e597da2](https://github.com/korchasa/flowai/commit/e597da2bf6dca338113394e6950c955edfd70f0b))
* **catalog:** add flow-convert-cursor-to-claude skill ([65bd29a](https://github.com/korchasa/flowai/commit/65bd29a60325e85d501a118e7c040c0ed7050f3f))
* **catalog:** add flow-execute and flow-plan agents ([24ad2ba](https://github.com/korchasa/flowai/commit/24ad2ba5e3bfdc95476095b553051b9a08af21cc))
* **catalog:** add flow-skill-deep-research skill and deep-research-worker agent ([43624a6](https://github.com/korchasa/flowai/commit/43624a61dddd0030760b91c2d6c780579a6e4387))
* **catalog:** disable model invocation for engineer and setup skills ([b4670b2](https://github.com/korchasa/flowai/commit/b4670b207af6ff6723dd888096669208c8bfdd08))
* **checks:** add naming prefix validator (NP-1: all primitives must use flowai- prefix) ([2491f33](https://github.com/korchasa/flowai/commit/2491f332eaadf74cb59faab622d0d05c74228db6))
* **cli:** --version checks for updates and shows update command ([d0e15a3](https://github.com/korchasa/flowai/commit/d0e15a3e89ca025ad8d0fb7b47a9d7e3d9c9ad83))
* **cli,framework:** add CLI update step to flow-update skill and version hint in IDE guard ([690fba7](https://github.com/korchasa/flowai/commit/690fba7f3ae313e14595fed57d92b3dcc5454dd9))
* **cli,update:** complete sync output for all primitive actions + frontmatter validation ([41e7578](https://github.com/korchasa/flowai/commit/41e75784d7e3586ca1a20a1dac9e0fb5fd5055db))
* **cli:** add --local sync mode; stop tracking .claude/ in git ([cd45ca6](https://github.com/korchasa/flowai/commit/cd45ca6b3b95d965db0a9ee2f09c9003090db478))
* **cli:** add `flowai loop` command for non-interactive Claude Code execution ([366e577](https://github.com/korchasa/flowai/commit/366e577fb8448064a783619bb8bc747ef0edff4e))
* **cli:** add `flowai update` self-update subcommand ([7b4d872](https://github.com/korchasa/flowai/commit/7b4d8721be23fcea2e9354d12c7b6fbe0d490cf5))
* **cli:** add migrate subcommand for one-way IDE primitives migration ([7d2962f](https://github.com/korchasa/flowai/commit/7d2962f4093bb9ca51ff783ca34108c98b548f21))
* **cli:** add non-interactive config generation for -y flag ([b8ddd72](https://github.com/korchasa/flowai/commit/b8ddd725f890c30985bc0a2500596cf557531bf4))
* **cli:** add OpenAI Codex IDE as a first-class target ([e1afa2c](https://github.com/korchasa/flowai/commit/e1afa2cb9a56d28c07df3b89ee6af1e916cd41a9))
* **cli:** add source override for installing from git branch or local path ([d210a08](https://github.com/korchasa/flowai/commit/d210a08590ed342c2012b6934632fe2bdba410a7))
* **cli:** decouple AGENTS.md templates from flowai-init scaffolds ([2fd635f](https://github.com/korchasa/flowai/commit/2fd635f3c48addbc9c49ba875311fc54200a01b3))
* **cli:** delete excluded framework resources during sync ([e16e64b](https://github.com/korchasa/flowai/commit/e16e64be9682345753a9e6c409c5aad244f2b575))
* **cli:** implement cross-IDE user resource sync (FR-10.8, FR-10.9) ([af2f709](https://github.com/korchasa/flowai/commit/af2f709f2e738e0e9835a03d86af1483f8233778))
* **cli:** interactive update prompt with deno.lock pinning fix ([5d869ec](https://github.com/korchasa/flowai/commit/5d869ecfa7e7ff3edc866952b63dacb6a3690aa2))
* **cli:** sync core assets to IDE config dirs ([a2e67e2](https://github.com/korchasa/flowai/commit/a2e67e27b6263c6e1c8e90a83352fab0a1a745a8))
* command to build CLAUDE.md file using .cursor/rules ([8a82ab1](https://github.com/korchasa/flowai/commit/8a82ab16ce2e3e02d51f618c2d78c851a9823c56))
* **commands:** add analysis and gap filling step to execution workflow ([887b344](https://github.com/korchasa/flowai/commit/887b34445bf03c6e02df566b97769d41ee681eba))
* **commands:** add docs-check command ([79ab673](https://github.com/korchasa/flowai/commit/79ab673123661979e6f9ac1dd23d133668c8f861))
* **commands:** add error analysis workflow ([3367e92](https://github.com/korchasa/flowai/commit/3367e9230dcef65473c32aa3d912db327d6d5407))
* **commands:** add maintenance command ([f24db45](https://github.com/korchasa/flowai/commit/f24db456efe3d8e291ca64b1548514bb97efbca4))
* **commands:** add task-build-claude-md command with implementation script ([4a48cfd](https://github.com/korchasa/flowai/commit/4a48cfd05d4c9e33bbc495e8de62fe9dd9a6a4b1))
* **commands:** automate commit workflow with atomic grouping ([1033c25](https://github.com/korchasa/flowai/commit/1033c25576efc4894942dab6a0b4823cecc04b8a))
* **commands:** enhance init command workflow ([6a4f8c7](https://github.com/korchasa/flowai/commit/6a4f8c7bb66fd199d4bf1e37ace56796bbc0611e))
* **commands:** implement GODS framework and chat-first reasoning in planning ([90aeb21](https://github.com/korchasa/flowai/commit/90aeb213364c631c0b5f2672496997de37e39e92))
* **commands:** reorganize tasks and add agent rules ([88faf75](https://github.com/korchasa/flowai/commit/88faf75ef04fbc271e5c179e204375fb61952417))
* **configure-deno-commands:** require parallel buffered check execution ([e52ad4d](https://github.com/korchasa/flowai/commit/e52ad4de85edc3c670f31f56f380f9e643989ad8))
* **core:** add flowai-reflect-by-history skill ([d5de1a8](https://github.com/korchasa/flowai/commit/d5de1a8b4aabcd6738fe62275b5852f3a1eaf1cd))
* **core:** add parallel execution to deno task check and review/commit skills ([8441c26](https://github.com/korchasa/flowai/commit/8441c2616359ea3585b4a1be0473196cedb0296e))
* **core:** integrate AskQuestion and SwitchMode tools for interactive clarification ([babd1fe](https://github.com/korchasa/flowai/commit/babd1feab62a47e706a073d6a34ef5e41372ae7e))
* **cursor:** add initial task docs, rule guidelines, and design docs; update README and .gitignore ([03857ee](https://github.com/korchasa/flowai/commit/03857ee3ee04cf567a9c8f62a15ae35d7e51eac9))
* **deno-cli:** add skill for managing Deno capabilities via CLI ([d3b627f](https://github.com/korchasa/flowai/commit/d3b627f496292ea8977b5f2d3298415c7d5b2c59))
* **deno-deploy:** add local debugging protocol and unstable APIs guide ([2e6cee9](https://github.com/korchasa/flowai/commit/2e6cee9be7c851b0f1131b2da3072e4a34c61e5e))
* **deno-deploy:** add skill for managing Deno Deploy cloud services ([e5d4b10](https://github.com/korchasa/flowai/commit/e5d4b1097ed25e2fbdaed8513dbc30758a074fac))
* **devcontainer:** add Claude Code auth forwarding from macOS Keychain ([99d3fa7](https://github.com/korchasa/flowai/commit/99d3fa771b609fe624ff54c89a8f66b3ee0236e4))
* **devcontainer:** add gh CLI auth and git credential helper to setup-container.sh ([e3c9f85](https://github.com/korchasa/flowai/commit/e3c9f85f2a7cb66a27dc303fb1ae5a8b103689e9))
* enforce IDE-agnostic language and update skills ([90fb207](https://github.com/korchasa/flowai/commit/90fb207000082335d74d9e837cdf85d3d96defc7))
* **engineer-rule:** update Claude Code rule semantics based on experimental verification ([b77f509](https://github.com/korchasa/flowai/commit/b77f5099295202cafc2ca33172e63969a8622119))
* **engineer:** add OpenCode IDE support to all engineer skills and docs ([1e50994](https://github.com/korchasa/flowai/commit/1e50994637e4c8beb7f37e20bda38798390e0ba1))
* **experiments:** add sweep subsystem and claude-md-length study ([1b51a1c](https://github.com/korchasa/flowai/commit/1b51a1c32be8116f121d1c53e238ec4c08187cfa))
* extend frontmatter for skills and agents with model tiers ([fd7d37a](https://github.com/korchasa/flowai/commit/fd7d37a5fd7a16c60664225639f510315e80262a))
* **flow-cli:** add self-update check against JSR registry ([8c63c5e](https://github.com/korchasa/flowai/commit/8c63c5e6bb1b10aa2a65db5e9a4f9fcd82cb202e))
* **flow-commit:** enforce consolidation-first commit grouping ([78acd15](https://github.com/korchasa/flowai/commit/78acd158961d70562c0b03fdf02145c3c6ddc022))
* **flow-init:** add 'no tables in chat' rule to AGENTS template ([e8a2d65](https://github.com/korchasa/flowai/commit/e8a2d65eaead9895502654c3cb0f492509f085f3))
* **flow-init:** add CLAUDE.md symlink step and fix evidence references (FR-19) ([cbde0d4](https://github.com/korchasa/flowai/commit/cbde0d43bedbed15abdbae22ba9e112c110dcf27))
* **flow-init:** add Deno tooling option to interview ([fbf5151](https://github.com/korchasa/flowai/commit/fbf515151e81b7d9b6d9ddd092f3b404c3d1892a))
* **flow-init:** split AGENTS.md into domain-scoped files with manifest-driven generation (FR-12) ([1a08122](https://github.com/korchasa/flowai/commit/1a0812217d6cef9722c453cbce4dc628f226c0d6))
* **flow-reflect:** add undocumented discoveries and automation opportunity analysis ([7071875](https://github.com/korchasa/flowai/commit/7071875ab0379cc917fd64cc2b9b26c631b6ba2c))
* **flow-skill-executor:** add introduce-yourself step to workflow ([3ad6d54](https://github.com/korchasa/flowai/commit/3ad6d5421294d0fb04875e1cd3b57475d89f0216))
* **flow-skill-setup-ai-ide-devcontainer:** add feature discovery step and catalog (FR-20.11) ([29fef36](https://github.com/korchasa/flowai/commit/29fef36147e8006087e72ca4a8ef8dd8f168f6e9))
* **flow-skill-setup-ai-ide-devcontainer:** complete FR-20 coverage gaps (SDS, benchmarks, multi-CLI) ([7d6e54d](https://github.com/korchasa/flowai/commit/7d6e54d4a329764fa241c6a2265b377079b1a44a))
* **flowai-plan:** improve variant selection flow and fix interactive benchmark infrastructure ([3b04cfc](https://github.com/korchasa/flowai/commit/3b04cfc4f26b08bd74ed090582814cd5e4d2fcbc))
* **framework,cli:** implement pack system — flowai-* renaming, hooks/scripts, rich sync output ([0cc3000](https://github.com/korchasa/flowai/commit/0cc300021887af082be6ce08b47f45f4ad5ad711))
* **framework:** add clarity review criterion and TS no-nested-ternary rule ([9b7203a](https://github.com/korchasa/flowai/commit/9b7203acfde2f60fb32055f9d72216a6c6271b49))
* **framework:** add explicit git diff commands to flow-update skill ([b946c27](https://github.com/korchasa/flowai/commit/b946c2759a9dd24ff04f8bc300a9a7a1826718ef))
* **framework:** add flow-update skill and CLI IDE context guard ([687effe](https://github.com/korchasa/flowai/commit/687effebf71ffc667c8bd262e45f6f1f337f9a8d))
* **framework:** add interactive-teaching-materials skill ([a141aea](https://github.com/korchasa/flowai/commit/a141aeae4b32d5ded229fa209b90650857c248fc))
* **framework:** add skill adaptation to flowai-update ([bed0c31](https://github.com/korchasa/flowai/commit/bed0c315b38176a91d7a6f00ace1844c0006b384))
* **framework:** enrich variant analysis with Risks and Trade-offs ([5bf9e1f](https://github.com/korchasa/flowai/commit/5bf9e1f1069b62906662f64680958a7b35aa4462))
* **framework:** mandatory Documentation Audit with gate and report template ([2076efb](https://github.com/korchasa/flowai/commit/2076efb06ff5af38270a8858ec35cf5bba077dd2))
* **framework:** migrate benchmarks and runner to pack structure ([28ea5d6](https://github.com/korchasa/flowai/commit/28ea5d6bd5c22c70eed2bddc825ff9fc1bf101d7))
* **framework:** migrate whiteboard from single file to per-session directory ([42316a6](https://github.com/korchasa/flowai/commit/42316a66a13ec3c88ebbfd630b64d68dc955e62d))
* **framework:** propagate FR-<ID> traceability rule to AGENTS template ([7afd092](https://github.com/korchasa/flowai/commit/7afd092f876ff800203bd5d1c5c9b07b33f78431))
* **hooks:** add flowai-session-init-docs SessionStart hook ([22ba4ab](https://github.com/korchasa/flowai/commit/22ba4ab1629fa56b86ebefcc5e2dce32a8aec3b6))
* **hooks:** add framework hooks with IDE-specific config generation ([b6a5ccb](https://github.com/korchasa/flowai/commit/b6a5ccbe14a9c10bcb69e7291616ed376c73071f))
* implement unified benchmark trace with dashboard and skill grouping ([5474dfb](https://github.com/korchasa/flowai/commit/5474dfbe9c23487c0dd47e48248e1b60f3e8c0b7))
* **install:** add --yes/-y flag for non-interactive execution ([af87bc2](https://github.com/korchasa/flowai/commit/af87bc2a72791b84ee2dc894773e9329beb11188))
* **install:** add global installer for per-IDE agent/skill symlinks (FR-10) ([94817b5](https://github.com/korchasa/flowai/commit/94817b5a2118a8b1eae9c2d88b2de6cef6c70ce2))
* **install:** add remote execution and shell bootstrap (FR-10.6) ([b6de621](https://github.com/korchasa/flowai/commit/b6de621cd0b5cd1cb7ffd77348b2655fc15963ee))
* integrate product vision into AGENTS.md and af-init ([#5](https://github.com/korchasa/flowai/issues/5)) ([2d786db](https://github.com/korchasa/flowai/commit/2d786db3aed034fe92afe8bcf852516f883b284a))
* introduce .dev/ SPOT directory with symlink-based multi-IDE support ([9ac2a13](https://github.com/korchasa/flowai/commit/9ac2a1318ddde135193dac725088cfab790cc880))
* **maintenance:** add deno task scripts and config ([1a14040](https://github.com/korchasa/flowai/commit/1a140403747efab3a485954007f71444b61caf82))
* **mcp:** add configuration for Cloudflare browser rendering server ([d7e202f](https://github.com/korchasa/flowai/commit/d7e202fbfc3a59eb6300790fdbc847dae06ffe3f))
* migrate framework Python scripts to Deno/TypeScript (FR-13) ([0a778c1](https://github.com/korchasa/flowai/commit/0a778c1fc7e37ce41135b52f91c9f25efbb1955e))
* **pipeline:** add compact SDLC pipeline with Design and Review agents ([d9c6876](https://github.com/korchasa/flowai/commit/d9c6876720b963e6bdd9a13565b397c3273403ca))
* **pipeline:** add flowai-pipeline-sdlc — local SDLC pipeline without GitHub ([565ec45](https://github.com/korchasa/flowai/commit/565ec45f1cc726d3230bda4225e837a74151069e))
* **planning:** add Plan Persistence rule to save plans to whiteboard.md ([e00c89f](https://github.com/korchasa/flowai/commit/e00c89fd8100c870a6ca6c4b91569b72cdedbfed))
* **reflect:** add self-criticism step to reflection skills ([b8104e2](https://github.com/korchasa/flowai/commit/b8104e28bbd3cb31091d82bff5530c95991a1c83))
* replace /check with iterative /check-and-fix command ([94f7627](https://github.com/korchasa/flowai/commit/94f762709f2a34571833eb455163aada3d825e5c))
* **rules:** add skill-creator guide and scripts ([f5961dc](https://github.com/korchasa/flowai/commit/f5961dcbb393643b00df2401d790eda051ced94f))
* **scripts:** auto-disable ANSI colors when running under Claude Code ([dedcba7](https://github.com/korchasa/flowai/commit/dedcba799f5a31790fa85a8520f8d51cf0773747))
* **settings:** update permissions and add additional directories for flow-review-and-commit ([5e81f60](https://github.com/korchasa/flowai/commit/5e81f60d8524b75c7cf0e5a60dbd0480c020cda5))
* **skills:** add flow-spec skill for phased feature specifications ([294a12c](https://github.com/korchasa/flowai/commit/294a12cc54e433909f773500344791e5cdabbbb9))
* **skills:** add flowai-adapt command for standalone primitive adaptation ([dc01c34](https://github.com/korchasa/flowai/commit/dc01c34d5e478f7147c048e25631e03a68c0c7b0))
* **skills:** add instruction coherence and tooling relevance checks to flowai-maintenance ([867d3ec](https://github.com/korchasa/flowai/commit/867d3ec9af3b50ee5d12688d37100297eb82c7b0))
* **skills:** add pre-flight project check to flowai-review ([fec5307](https://github.com/korchasa/flowai/commit/fec5307dbcd2e7cb3b6f188bd198e5fd80f040ef))
* **skills:** close FR-21.3–21.6 universal skill & script requirements ([fe11fad](https://github.com/korchasa/flowai/commit/fe11fad59d704d6b17630f6a0e8bf9646cf54426))
* **skills:** enforce FR-21.1 agentskills.io compliance with validation and fixes ([c7d1b36](https://github.com/korchasa/flowai/commit/c7d1b362aa22bc82abc4377c2afe7cb706f7c0cb))
* **skills:** enforce FR-21.2 cross-IDE script path resolution ([971f660](https://github.com/korchasa/flowai/commit/971f660d05c4b5bbebdc7c5c3dd126a55ac3d2c5))
* **skill:** update flow-skill-analyze-context to focus on total cost estimation ([fed8ba2](https://github.com/korchasa/flowai/commit/fed8ba2e59a7ca26659c6763ca8af704adc97d8b))
* **sync:** implement user commands synchronization across IDEs ([ef68ff7](https://github.com/korchasa/flowai/commit/ef68ff7d3fbed62221a1a73f1918b0fdd290fd2a))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([8bff86a](https://github.com/korchasa/flowai/commit/8bff86aa4b4d31cdb1605732a5c24fa69f8db1f8))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([88fb794](https://github.com/korchasa/flowai/commit/88fb794f075564548251f973e4ae54d2c1d26822))
* universal agent format + flow-cli distribution ([#7](https://github.com/korchasa/flowai/issues/7)) ([45ad03e](https://github.com/korchasa/flowai/commit/45ad03e200589c2a87644ef116ff35c4482ff41f))
* update /investigate command with iterative workflow ([99ee7f0](https://github.com/korchasa/flowai/commit/99ee7f01cbf1d103c41673fa73575e92a3d70abb))
* update commands ([a629309](https://github.com/korchasa/flowai/commit/a629309ce4d7f7bdd7c4f14b1217d26dbe240456))


### Bug Fixes

* **af-init:** align documentation generation with standard schema ([513960a](https://github.com/korchasa/flowai/commit/513960a3b8a392babcdd23b171f9ec3236cca1b3))
* **bench:** add pre-spawn skill mount check and short-output warning ([18fa0a5](https://github.com/korchasa/flowai/commit/18fa0a56e365e05df443837fe358be08b7f056b8))
* **bench:** copy framework commands/ into sandbox .{ide}/skills/ ([17066dc](https://github.com/korchasa/flowai/commit/17066dca852feb5a0bcf1981dffa63ccf5a3f9d0))
* **bench:** correct checklist items in flowai-update benchmarks ([45ee5d8](https://github.com/korchasa/flowai/commit/45ee5d8bd21cd2837de49456d52e4239cc3e3050))
* **benchmarks:** add interactive mode to review scenarios (P3) ([53f8ed3](https://github.com/korchasa/flowai/commit/53f8ed3a766942b7df2e668c80a7c5b30fd740f6))
* **benchmarks:** fix P5 strict checklists — skill fixes and interactive mode ([ca009f0](https://github.com/korchasa/flowai/commit/ca009f0e42130cf519dc069917ada3098ee7e86b))
* **benchmarks:** fix P6 deterministic failures in flow-commit scenarios ([22a2826](https://github.com/korchasa/flowai/commit/22a28267409c9577e48626f64892688546785529))
* **benchmarks:** handle dynamic exit_code_zero in score test ([576d9b1](https://github.com/korchasa/flowai/commit/576d9b14edbb9827289de52a68f1fdb68b873908))
* **benchmarks:** isolate sandbox with git init to prevent agent escaping to parent repo ([1c30746](https://github.com/korchasa/flowai/commit/1c30746ea4f4446a95b3e34425a5f8089c6ef2c9))
* **benchmarks:** overhaul benchmark infrastructure for reliability ([895d4f9](https://github.com/korchasa/flowai/commit/895d4f9fde59dc435c6662010ada9989a858ba68))
* **benchmarks:** pass judge evidence via file to avoid E2BIG crashes ([fac82f9](https://github.com/korchasa/flowai/commit/fac82f9e7ccd1122f0ef9dbb2db608563d15d0e7))
* **benchmarks:** switch engineer-skill/subagent scenarios to .cursor/ to avoid CLI write block ([5b1ce42](https://github.com/korchasa/flowai/commit/5b1ce4272b69af06e41e4c0a954e737393537904))
* **benchmarks:** update paths after pack migration, remove stale fixturePath overrides ([814c016](https://github.com/korchasa/flowai/commit/814c0166e88fc28cb241c500bdd21848a98881d3))
* **ci:** exclude integration tests from check (API/env dependent) ([145a126](https://github.com/korchasa/flowai/commit/145a12672bbd3145b51c87308a4a832add522cf5))
* **ci:** pass --config to deno install --global in verify-install job ([0a5a6b4](https://github.com/korchasa/flowai/commit/0a5a6b41c33668c161fde8da23b712cc494ae7ab))
* **ci:** resolve non-existent tag in release notes generation ([4fb9cfb](https://github.com/korchasa/flowai/commit/4fb9cfb6af9f9bea31e7d401afd2f67a269e2c30))
* **ci:** stop tracking generated flowai-hooks.json ([645df3e](https://github.com/korchasa/flowai/commit/645df3ec3882e1e0bd37ae1fd267a28e5209d448))
* cleanup ([b5ac8ae](https://github.com/korchasa/flowai/commit/b5ac8aebe45629f07b7603e481aaa525f8ec2433))
* **cli,framework:** clarify flowai sync subcommand in IDE context ([9f85a77](https://github.com/korchasa/flowai/commit/9f85a770ef857fbb7cb485a6803123d1d424dc10))
* **cli:** add explicit type annotation to cliffy action callbacks ([c489233](https://github.com/korchasa/flowai/commit/c489233779fe3b329ea997a5606d1f450236feca))
* **cli:** exclude benchmarks and test files from skill distribution ([76d2a7c](https://github.com/korchasa/flowai/commit/76d2a7c8569d95f876ab3f130a5fb0ffed5742ca))
* **cli:** resolve TS2345 in cliffy action callbacks, add deno check to task-check ([5c9b289](https://github.com/korchasa/flowai/commit/5c9b28965649277e738cd9f2bdb8a949e4e495e9))
* **cli:** run sync integration test in temp dir to avoid side effects ([d3a2053](https://github.com/korchasa/flowai/commit/d3a2053d77ec89c859c0a4739b558dd748a8bdb3))
* **config:** remove source reference from .flowai.yaml ([8946e15](https://github.com/korchasa/flowai/commit/8946e1538b18d4254bcfa38dc5c8b123a66ac530))
* correct deno fmt exclude config and sync flow-review whiteboard path ([ed4ab74](https://github.com/korchasa/flowai/commit/ed4ab74afdcdbd7a1c170e0e79fe1607c50accc7))
* **devcontainer:** fix OAuth auth, volume ownership, and error masking in templates ([9d256b3](https://github.com/korchasa/flowai/commit/9d256b379e8c3ca3a3d5ac1682dcb0345d68bd19))
* **devcontainer:** switch Claude Code install to official script, expand features catalog ([4954d73](https://github.com/korchasa/flowai/commit/4954d738dbe01c0aa70e2d1ea6d14a28c002371e))
* **devtools:** correct Claude Code rule format in engineer-rule skill ([2a56e3b](https://github.com/korchasa/flowai/commit/2a56e3bfad65e9d461e395abab34645c94e994e9))
* **docs:** correct spelling in plan.md instructions ([c83d897](https://github.com/korchasa/flowai/commit/c83d89718c7cf819634d0373afa5aea0b4263f45))
* **docs:** remove extraneous command from installation instructions in README ([4ab2137](https://github.com/korchasa/flowai/commit/4ab21379c4bee9fd01c629f9040faa94e33498de))
* **docs:** update AGENT.md references to AGENTS.md ([988d72e](https://github.com/korchasa/flowai/commit/988d72e5abd36a35878c7d213af3c2cf49074a0e))
* **docs:** update migration instructions in migrate-run-ts.md ([3f8c58a](https://github.com/korchasa/flowai/commit/3f8c58a58cbb2322c4831f32572a4c525b8b6752))
* **flowai-plan:** enable interactive mode in basic benchmark ([edc83bb](https://github.com/korchasa/flowai/commit/edc83bb56bfd76d4500c8986379969911ac54e9c))
* **flowai-review:** add deletion guard for entire directories ([2d8629f](https://github.com/korchasa/flowai/commit/2d8629f449ba42908ce1902b938d6cd50d7a396d))
* **flowai-review:** gate stack-specific checks on manifest detection ([88b81cb](https://github.com/korchasa/flowai/commit/88b81cbc091020259f350c26015d68a77c5e517d))
* **fmt:** format benchmark file that broke CI ([8a6bff0](https://github.com/korchasa/flowai/commit/8a6bff048a4106d1fc3a945e0696878f4a797f8d))
* **framework:** use system temp dir instead of _research_tmp in deep-research skill ([6e72a0f](https://github.com/korchasa/flowai/commit/6e72a0f965278bb8b7836b66adc920725013b8f1))
* **hook:** isGitCommit handles quoted strings, -c flags, and subshells ([b3c71d3](https://github.com/korchasa/flowai/commit/b3c71d3a9f7c43dc1450776a57976c890f9d1c35))
* **install:** use full jsr: specifier for remote execution compatibility ([0da4a94](https://github.com/korchasa/flowai/commit/0da4a94955c6716b80b2667d7fab040df97a4838))
* **plan:** make critique step automatic instead of asking permission ([216724f](https://github.com/korchasa/flowai/commit/216724f4fe944f1061010ce13c38e3125b11bd11))
* **publish:** un-exclude generated artifacts from JSR publish ([0bb79f3](https://github.com/korchasa/flowai/commit/0bb79f38d88db640d4643f596ac2ab241adf7021))
* **scripts:** use jsr: specifier in generate_agents.ts; close 10 FR-21 criteria ([7d14e0a](https://github.com/korchasa/flowai/commit/7d14e0aaf29fd4b26b7d34ab9e9ef07df9d43168))
* **security:** bump next from ^14.0.0 to ^15.5.10 in benchmark fixture ([ba4e081](https://github.com/korchasa/flowai/commit/ba4e0813868644f278182b909d4e308cb6365498))
* **skill:** make asset artifact verification unconditional in flowai-update ([cc66a64](https://github.com/korchasa/flowai/commit/cc66a64368bfcbbf3558728b3865fb5815c4a401))
* **skills:** correct script path in analyze-context and remove --headed flag from playwright-cli ([e6a4a5c](https://github.com/korchasa/flowai/commit/e6a4a5ca95affafd344b5042904a9726108ffeb1))
* **update:** handle invalid YAML in parseFrontmatter gracefully ([fd477bc](https://github.com/korchasa/flowai/commit/fd477bc2bfa3e9cfa4880aa2d32c878c25dd53a5))


### Continuous Integration

* **release:** merge CI jobs into single pipeline with standard-version automation ([acbfc03](https://github.com/korchasa/flowai/commit/acbfc03c4a94402b3244a66b25386884ecab6aaf))


### Build System

* add CI integrity checks and update judge model ([6fdc340](https://github.com/korchasa/flowai/commit/6fdc340b4e0eaedda3423ef8f58aeaab7793bc1c))
* **ci:** add custom release notes generation from conventional commits ([22d5b75](https://github.com/korchasa/flowai/commit/22d5b75c250000bca34610d170c138fb61798f18))
* **ci:** pin Deno to 2.7.11 to fix fmt mismatch ([0442c1d](https://github.com/korchasa/flowai/commit/0442c1de0aa8e0eacc146cde6d0b1eb55541c2dc))
* **ci:** pin Deno to 2.7.4 and revert HTML formatting ([01a7d3a](https://github.com/korchasa/flowai/commit/01a7d3a81f4f5d49dfd499f17caec91e3598a1d5))
* **ci:** pin Deno version to 2.7.11 ([165c70f](https://github.com/korchasa/flowai/commit/165c70f7da0f557f3b446a520441085bdc7041a4))
* exclude markdown files from formatting, cleanup worktrees.json ([2c2a2fe](https://github.com/korchasa/flowai/commit/2c2a2fea6466d91d720c6c4db5a4b9aa92e64918))
* pin GitHub Actions to SHA checksums ([e47d6ea](https://github.com/korchasa/flowai/commit/e47d6ea2e244b88f72d424571df9fd7a628b559a))
* update deno.lock ([ef9543f](https://github.com/korchasa/flowai/commit/ef9543f0193e226ce62bd719764b17a716fdd605))


### Agent Changes

* add Benchmark TDD flow to project instructions ([567d515](https://github.com/korchasa/flowai/commit/567d515b760b2fd3858192eefe9a8bcd345a6517))
* add evidence links to all acceptance criteria in SRS ([d819ee4](https://github.com/korchasa/flowai/commit/d819ee4bb77ee8d1349fbb9c2427a7f9cebd107c))
* add relative paths rule to AGENTS.md and template ([605e556](https://github.com/korchasa/flowai/commit/605e556454eb40bc1073dfc23f3e724d9bd6c86e))
* **AGENTS:** update guidelines to include post-session review and evidence provision ([f3927e3](https://github.com/korchasa/flowai/commit/f3927e3ede008971910de28047e84ed65c8dd157))
* **commit-review:** separate responsibilities between review and commit, add whiteboard cleanup ([00b8a73](https://github.com/korchasa/flowai/commit/00b8a73ce3e7be77170e58a3d4ab1324d09d65aa))
* **core:** add dynamic doc discovery, whiteboard context, and parallel delegation benchmarks ([7ea34e0](https://github.com/korchasa/flowai/commit/7ea34e0a5fd7681fa43d130adca542c01df78873))
* fix inconsistent punctuation in project rules ([9138896](https://github.com/korchasa/flowai/commit/91388969495ec3e4531fdf6fbc28709115399050))
* **flow-commit:** add agent: commit type for AI config changes (FR-11) ([f11dcbc](https://github.com/korchasa/flowai/commit/f11dcbce601d651801ef09b6e5c231cc9b2fb5d5))
* **flow-commit:** add suggest-reflect step after commit ([4e44b9c](https://github.com/korchasa/flowai/commit/4e44b9c70d6d7526f0e211eb9947d42da4fd8042))
* **flow-engineer-hook:** add cross-IDE hook docs and benchmarks (FR-14, FR-15, FR-16) ([202657e](https://github.com/korchasa/flowai/commit/202657e1dbbf5e1b479d2c0eb9e643605aa08f44))
* **flow-review-and-commit:** implement composite review+commit command (FR-18) ([5e512cf](https://github.com/korchasa/flowai/commit/5e512cf23b9ed58112c68b3321692ecb3933e545))
* **flow-review:** inline workflows in composite skill, add sync check and benchmarks ([f804d83](https://github.com/korchasa/flowai/commit/f804d8304d93fd72eb0eb678eb7774ac90884fa2))
* **flow-skill-setup-ai-ide-devcontainer:** add devcontainer skill, update FR-10/FR-20 requirements ([0408c38](https://github.com/korchasa/flowai/commit/0408c38dd0e8ba2395d8cd2cd9da00c16b472c43))
* **flowai-commit:** add missing CLAUDE.md symlink in dynamic-doc-list fixture ([bbd29a7](https://github.com/korchasa/flowai/commit/bbd29a755b9a81acc2bfe4ad7aa33f8163d9d117))
* **flowai-reflect:** add cross-session pattern analysis ([f11f432](https://github.com/korchasa/flowai/commit/f11f4324efa2a577596414a5586fffcb4585a9ab))
* maintenance — fix flow-* naming, improve skill instructions, add JSDoc ([de8e700](https://github.com/korchasa/flowai/commit/de8e70001c40474105cd9c456492d8447fefba82))
* replace bare @std/ specifiers with jsr: for standalone script independence ([be2839f](https://github.com/korchasa/flowai/commit/be2839f91cad7d3885a1a225e30d5ced36f09c98))
* replace flow-qa with flow-review combining QA and code review roles ([4149a7b](https://github.com/korchasa/flowai/commit/4149a7b8a2240362c1205e86cd16fc10c3e148b5))
* resolve IDE support scope to 3 IDEs (FR-17) ([5355740](https://github.com/korchasa/flowai/commit/5355740b4615d0e8da9ccaa13a6d6212a962ce7e))
* use portable <this-skill-dir> placeholder for bundled script paths ([07b005d](https://github.com/korchasa/flowai/commit/07b005d203a9764101131d41e99d502eb0bd0f67))


### Styles

* **agents:** normalize markdown formatting in agent definitions ([b1bc8d1](https://github.com/korchasa/flowai/commit/b1bc8d1ece5b9a489ed20b1f0866063e8e31c720))
* apply deno fmt formatting ([14a4480](https://github.com/korchasa/flowai/commit/14a448056591c749b0af7105200f6f4bf489bf6f))
* **benchmarks:** apply deno fmt formatting ([5e4d78d](https://github.com/korchasa/flowai/commit/5e4d78ddfb317936c46d11f70a98842b1d05406c))
* **benchmarks:** fix quote consistency in consolidate scenario ([3b8d006](https://github.com/korchasa/flowai/commit/3b8d006f800ecf9a387451aca5d134dd780589f0))
* **cli:** fix formatting after merge conflict resolution ([5b5384a](https://github.com/korchasa/flowai/commit/5b5384aff06e5916a8823ee47b7e364050d5273e))
* **cursor:** add dependency injection rules for TypeScript classes ([e388495](https://github.com/korchasa/flowai/commit/e38849505fd91190b351563d48cc247882500d64))
* **cursor:** unify headings and formatting in rules and commands ([f6eedc5](https://github.com/korchasa/flowai/commit/f6eedc5be477f69ecc409f9fc061ffb3d2189c01))
* fix trailing whitespace in deno-cli skill ([b1ba46c](https://github.com/korchasa/flowai/commit/b1ba46c6ceff064af92e8bd01fa59266bc1b07bf))
* format benchmark code ([0136679](https://github.com/korchasa/flowai/commit/0136679876e3bc161e21ebafb9fb25685f578faa))
* format cursor skills and agents documentation ([8dc8693](https://github.com/korchasa/flowai/commit/8dc869338c0b2c0dcbea1620028d1d14db63b3d4))
* reformat HTML assets for current Deno fmt rules ([b1739a3](https://github.com/korchasa/flowai/commit/b1739a3634739b72a54bc31b0f1791b280bd1093))
* reformat HTML assets for Deno 2.7.11 fmt rules ([446e2ed](https://github.com/korchasa/flowai/commit/446e2ed220c3bec2eeb56a2e445a49fdbace13e4))
* remove backticks from todo_write in SKILL.md files ([4e62f0d](https://github.com/korchasa/flowai/commit/4e62f0d908ecdfce3857640d4209755400ebe4cb))
* remove emojis from benchmark writing skill ([f72e456](https://github.com/korchasa/flowai/commit/f72e4563ac51d753f85fdf0fc6228a0e8ac90404))
* sync .claude/ from framework and apply formatting fixes ([bec1efb](https://github.com/korchasa/flowai/commit/bec1efbcde39f19cbb59549447fc19b5268d7cc9))


### Documentation

* add benchmark test-fitting and static mocks rules, clarify cross-pack ref checker ([7c6359b](https://github.com/korchasa/flowai/commit/7c6359be366579517e036c17eb150ddb6b5474cc))
* add CODE STYLE RULES for Go (Golang) ([e2f806d](https://github.com/korchasa/flowai/commit/e2f806df97fa9aa3c2992deec578b68d4cae44db))
* add code-style-typescript-deno.mdc with TS strict rules and Deno import guidance ([950352c](https://github.com/korchasa/flowai/commit/950352cdb1bf8b5c19a97f2177d1c56983695047))
* add deno-cli and deno-deploy to skill coverage matrix ([acd09fb](https://github.com/korchasa/flowai/commit/acd09fb1badc6734e412a7f56b7f45ecd1b5919b))
* add descriptions to command files for clarity and guidance ([89beca2](https://github.com/korchasa/flowai/commit/89beca27671472bfdbc3fe5a05e50cb22e89eec6))
* add flow-review-and-commit command and FR-18/FR-19 requirements ([60fb47b](https://github.com/korchasa/flowai/commit/60fb47bbf0531af7810516ad1c982f438abd340e))
* add guidelines for writing Product Requirements Documents (PRD) ([3548cf0](https://github.com/korchasa/flowai/commit/3548cf0858d667c6e07bf95c70ec5e3e7750c4d4))
* add IDE comparison and research documents ([dfa1821](https://github.com/korchasa/flowai/commit/dfa18214d9f8843e3e09f5141928d50e09445da8))
* add JSDoc to benchmark lib, rewrite scripts/AGENTS.md, clean up duplicates ([baf950e](https://github.com/korchasa/flowai/commit/baf950ee9546d07e45c4238146fa1cdb2d3c7411))
* add local check requirement for CI/CD edits ([49e3aa2](https://github.com/korchasa/flowai/commit/49e3aa27a7050876fba20efb512b99b976b59452))
* add logic-focused testing rule to AGENTS.md and template ([a7c8c16](https://github.com/korchasa/flowai/commit/a7c8c1657bedc7445a2ba1a150d736a60bb05902))
* add maintenance report to whiteboard ([7b0473d](https://github.com/korchasa/flowai/commit/7b0473dde820fb3f55982ead3f000d86ab185b35))
* add PoC rules and update task-answer command ([66faf13](https://github.com/korchasa/flowai/commit/66faf13e683d99fe9c17352076f7961285957162))
* add Product Vision Document creation command and guidelines ([3bb9386](https://github.com/korchasa/flowai/commit/3bb93865188bc512be250b00f3d11d810486ff3c))
* add Reference-First planning rule to AGENTS.md ([06a3ca7](https://github.com/korchasa/flowai/commit/06a3ca7bd895ae2b01c84a32981ddbd568c40c44))
* add task planning and Q&A session guidelines ([e8f8c61](https://github.com/korchasa/flowai/commit/e8f8c612b1a96a8f1db88616fac2777696965807))
* add task-create-rule.md for Cursor IDE rule development ([3d02338](https://github.com/korchasa/flowai/commit/3d02338019a8f580f03b120b5796647c913d8a35))
* add task-write-skill.md for IDE Skill file creation ([8c7229a](https://github.com/korchasa/flowai/commit/8c7229a4a84c7a7a78fac7b0a72d4204205b48cb))
* **af-do:** clarify skill overview description ([4ec5488](https://github.com/korchasa/flowai/commit/4ec5488cc5c08d0aff1d1e6ce7890ed42beac30e))
* **AGENTS.md:** add TypeScript LSP plugin caveat for export ordering ([832a36c](https://github.com/korchasa/flowai/commit/832a36c5294a6f900143edea77908c9ea1da623e))
* **agents:** clarify TDD RED step scope ([df881c4](https://github.com/korchasa/flowai/commit/df881c4bd82fcd6140c84c87719f7ba8a19321fb))
* **agents:** reformulate session-start doc reading rule ([5b21688](https://github.com/korchasa/flowai/commit/5b21688e38296628b8b40d279d1c5b0bbf5ac54d))
* **agents:** update whiteboard references to per-session whiteboards directory ([2153967](https://github.com/korchasa/flowai/commit/21539671e3757273f6e86bb82ea3df58574d2c6e))
* allow Russian in whiteboard.md ([8bde511](https://github.com/korchasa/flowai/commit/8bde511d10728ff15b72e150a59976ee2bfefc15))
* **bench:** enhance README with Docker isolation details and improved benchmark execution instructions ([be05f93](https://github.com/korchasa/flowai/commit/be05f937e77aa9a5e9983c68561d357e3b76b848))
* capture priming lessons from flowai-maintenance output-contract rework ([5971f0f](https://github.com/korchasa/flowai/commit/5971f0f3d00ecd5670fbf164b3315ab66551698c))
* clarify documentation language requirements in RULE.md ([11520d5](https://github.com/korchasa/flowai/commit/11520d57412fe4ab5522a94605940aea7bbd05a7))
* clarify GIT_PAGER usage in task-commit.md ([f260fbf](https://github.com/korchasa/flowai/commit/f260fbfa73dd8c2bcbc01c065b6560feadcb3948))
* clean whiteboard — only remaining TODO items ([1a222f3](https://github.com/korchasa/flowai/commit/1a222f363611b002e158785c43fe902c445e4143))
* cleanup docs and tighten commit workflow guidelines ([33e1305](https://github.com/korchasa/flowai/commit/33e13057b104524068b44bd14a962daae87cb9ea))
* clear whiteboard after session ([cfd1531](https://github.com/korchasa/flowai/commit/cfd153154a3f6887f3c33f5a92e448e372423dae))
* **commands:** clarify commit and planning workflows ([7c1b725](https://github.com/korchasa/flowai/commit/7c1b725e86e111ab1fe582c7db2c3aa27bb2eb61))
* **commands:** sync task plan and do checklist ([2a5ff04](https://github.com/korchasa/flowai/commit/2a5ff04f215ff095507b76701e5a892df8a766c4))
* **cursor-desktop-guide:** add readonly field to subagent frontmatter schema ([8236012](https://github.com/korchasa/flowai/commit/8236012de0c2e81670710a3aae28445eea41e9cd))
* **cursor:** add task workflow docs and code style guidelines; remove legacy rules file ([217a4b1](https://github.com/korchasa/flowai/commit/217a4b1029da30eb92da10c5ce54254698d33ae2))
* delete CLAUDE.md ([0f4af28](https://github.com/korchasa/flowai/commit/0f4af283041a32cdbd7d96837a8f8256b22b13a8))
* enhance ides-difference documentation with dedicated AI ignore files and migration options for Claude Code ([3bf995e](https://github.com/korchasa/flowai/commit/3bf995e107c1e94ad97e00a1dd0a120d0634fb09))
* enhance README and AGENTS.md with developer workflow and agent reference ([b8b2333](https://github.com/korchasa/flowai/commit/b8b23338c44223623a1e4ad8ba43af5fbaf3a448))
* enhance README with comprehensive component lists and fixes ([231f8dc](https://github.com/korchasa/flowai/commit/231f8dcad37590d3ac52a86818e05de7dcd2f85b))
* enhance task planning guidelines in task-plan-with-qa.md ([2e01804](https://github.com/korchasa/flowai/commit/2e01804ae23c5f85c1764b35abecdd66875098da))
* enhance task-execute.md for improved clarity and consistency ([c5ef2ab](https://github.com/korchasa/flowai/commit/c5ef2ab06e207c05d49a15593e5d053c75159f72))
* expand documentation philosophy in README and update SRS ([1fbd6f9](https://github.com/korchasa/flowai/commit/1fbd6f994d705127bcb12d5ef42f33422ddb376b))
* expand GIT_PAGER examples in RULE.md ([e0ce7f5](https://github.com/korchasa/flowai/commit/e0ce7f5c98d439bccd650700f37652eb3e2de6c1))
* expand IDE hooks comparison and add contributor dev setup to README ([6794600](https://github.com/korchasa/flowai/commit/67946003e46c2af679417c2b2d87d06b20c87448))
* **framework:** add automation pack to AGENTS.md packs list ([5b0a964](https://github.com/korchasa/flowai/commit/5b0a9644ea64cbcc7a594cfbb319ae3ee107a32a))
* **ides-difference:** add OpenAI Codex CLI data across all comparison sections ([b24e05c](https://github.com/korchasa/flowai/commit/b24e05ce5ab8c8b80771399572ab1828be7a75c0))
* **ides:** add session/conversation history storage comparison ([c2e4522](https://github.com/korchasa/flowai/commit/c2e4522ded24ed692e48267229b6de2fcdd5e5fb))
* **maintenance:** fix typo in todo_write tool name ([ca64313](https://github.com/korchasa/flowai/commit/ca64313dfae1f50a09737dac18b71247b8ede4bb))
* **maintenance:** remove explicit whiteboard.md filename references ([3296c6a](https://github.com/korchasa/flowai/commit/3296c6abb56fc6b73c9c392ef321acf4e8e0cc15))
* mark af-reflect as benchmarked in SRS ([0fa6b03](https://github.com/korchasa/flowai/commit/0fa6b03ad50890107e236e599ba4bacc475e294f))
* mark FR-14/15/16 criteria as done with evidence, clean up settings.json ([a7d60f4](https://github.com/korchasa/flowai/commit/a7d60f4ca3d83e89680dea72555414b38664e9b3))
* merge RND control primitives data into ides-difference.md and remove source ([569a2d4](https://github.com/korchasa/flowai/commit/569a2d4d29fbae5f73a8527376dbba8a5d71bc15))
* overhaul prompt engineering guides for instant and reasoning models ([a964437](https://github.com/korchasa/flowai/commit/a96443724975ecc646754372b8b8ce6fed8d6728))
* **readme:** simplify README description to refer to Cursor rules ([9bcb414](https://github.com/korchasa/flowai/commit/9bcb4146569de680d4fdb8e0a0a86ed6460c28f1))
* refine control primitives comparison documentation ([52025d5](https://github.com/korchasa/flowai/commit/52025d5615a7c4fe7fb644ffbf38194f6c94c1b8))
* refine task planning guidelines in task-plan-with-qa.md ([cc20c10](https://github.com/korchasa/flowai/commit/cc20c10fce285e6d029d04910db02ccb8a043e81))
* refresh IDE differences with footnotes and new sections ([a3dcb29](https://github.com/korchasa/flowai/commit/a3dcb2936eb493e8c9704f5ec35f49b187db7d10))
* reinforce GIT_PAGER usage in RULE.md ([62b134d](https://github.com/korchasa/flowai/commit/62b134d53dcf0db182f3d1c145e57d48f7c7842f))
* remove duplicate build-in-ide-tools.md (data already in ides-difference.md) ([5f55dff](https://github.com/korchasa/flowai/commit/5f55dff9f74e5fd9f417835dedf7208a728ec3a6))
* remove interactive clarification requirement and AskQuestion tool references ([0c3acf1](https://github.com/korchasa/flowai/commit/0c3acf11bbfc9987a7a92655cc9e175435cff805))
* remove obsolete RnD documents ([10f68e2](https://github.com/korchasa/flowai/commit/10f68e238b090eede02dba3754a8e883c14d75ef))
* remove outdated task planning guidelines from task-plan-with-qa.md ([3c89134](https://github.com/korchasa/flowai/commit/3c89134477f73086425b9d7b9b17d5fbc1202783))
* remove Russian language requirement from howto-write-in-informational-style and adjust task-review guidance to drop language constraint and revise negative-aspects wording ([45495aa](https://github.com/korchasa/flowai/commit/45495aa12ca575df3d60ca818d3be7f0ad960b2a))
* rename "Steps" section to "Todo List" in all command docs ([905b24d](https://github.com/korchasa/flowai/commit/905b24d6cae20a217c10893b32f65f7b906ad2ec))
* rename FR IDs from numeric to mnemonic format across codebase ([cbb2a7e](https://github.com/korchasa/flowai/commit/cbb2a7ed5564ef90fc1b478bc15631c5bdf9a508))
* rename FR IDs from numeric to mnemonic format across codebase ([3d7a30d](https://github.com/korchasa/flowai/commit/3d7a30d1d9c697fa3a2b17fc16f1cd9b95b4897c))
* reorganize R&D documents and add new research notes ([3caad71](https://github.com/korchasa/flowai/commit/3caad71727ddb078fa4767acf25adba0481a863f))
* **requirements:** add FR-8 af-init, update FR-3/FR-6 status ([d16a22a](https://github.com/korchasa/flowai/commit/d16a22a0dc518bc4a1f8ec0b71c7622ac33f6081))
* **requirements:** mark FR-20.1–FR-20.11 as completed with evidence ([43048b2](https://github.com/korchasa/flowai/commit/43048b2a1d45e5f8f686c51bcd8090b4469c8085))
* resolve 7 contradictions across SRS, SDS, and AGENTS.md ([02b2116](https://github.com/korchasa/flowai/commit/02b2116dcc929da8850c897d381fc64e04e64d02))
* revise task-create-command documentation for clarity and structure ([82d1653](https://github.com/korchasa/flowai/commit/82d1653349d19d991031a16ac45c113bfc96b2ee))
* rewrite README with Assisted Engineering paradigm and multi-IDE focus ([54c9fcf](https://github.com/korchasa/flowai/commit/54c9fcf595bda4875eee701e24b9f2df9c8275ef))
* **rnd:** add Claude Code CLI feature analysis ([fd1e919](https://github.com/korchasa/flowai/commit/fd1e91973619ed20098da4f3bc3b1fac5924ff56))
* **rnd:** add Cursor subagent path to Custom Agents comparison ([7c795de](https://github.com/korchasa/flowai/commit/7c795debc928e06ad0b68e72601fa34ac45f3e13))
* **rnd:** add Hyperagents paper practical conclusions with evidence ([7f5d04e](https://github.com/korchasa/flowai/commit/7f5d04ee858f61f2abe07e2a793ab0f8c0b47946))
* **rnd:** add superpowers plugin analysis ([afa38f3](https://github.com/korchasa/flowai/commit/afa38f35de0b782055335a37dea41b8a85adcd5f))
* **rnd:** drop outdated rnd notes ([f311142](https://github.com/korchasa/flowai/commit/f311142162bef0f0d45e1e86429d06a7f1f1d2fb))
* simplify CODE STYLE RULES for TypeScript ([c21dcc7](https://github.com/korchasa/flowai/commit/c21dcc7b1f45d4d75e6e0715be7e6c09b79281b1))
* **spec:** add draft spec for skill versioning feature ([31b2a8d](https://github.com/korchasa/flowai/commit/31b2a8d8ad4e71f95a92a55ba435a7f9d0a115f7))
* **spec:** add skill versioning specification ([f7d9489](https://github.com/korchasa/flowai/commit/f7d9489db0560de88c25d2a6b95d3f1b646cdbcd))
* standardize Key Principles bullets in README with renamed categories (Stages, Rules, Documentation, Project Maintenance, Howto) ([e5405a6](https://github.com/korchasa/flowai/commit/e5405a6a9a83891558347075eaff0e80b4675ac3))
* sync documentation with current command set and workflows ([892eb45](https://github.com/korchasa/flowai/commit/892eb45e53772b52843e9698b404ba58a8bb1d3e))
* sync documentation with new commands ([0c0d4c7](https://github.com/korchasa/flowai/commit/0c0d4c76c6907a6fd8b95afbc53c96b2eb9b620a))
* **task-build-claude-md:** add manual execution restrictions and checklist to CLAUDE.md build guidance ([22b3db2](https://github.com/korchasa/flowai/commit/22b3db283d42c178ce383ba1d56ec33a211fbd37))
* **task-plan:** improve task planning workflow ([034f6e5](https://github.com/korchasa/flowai/commit/034f6e5cb812e51a1b80f36a00b35b10ccade8f8))
* update AGENTS.md generation instructions and checklist ([6b77f2f](https://github.com/korchasa/flowai/commit/6b77f2f3d7520d40441805474a4c0d25057bf366))
* update AGENTS.md with planning rules and dev commands ([b0fff37](https://github.com/korchasa/flowai/commit/b0fff37995b485e9f935f86b89498194cedec9f9))
* update available skills and commands in README ([39d7688](https://github.com/korchasa/flowai/commit/39d7688c9920cb8d9e81cabbb2587c1edc6335cc))
* update command list and count in project documentation ([4c4991d](https://github.com/korchasa/flowai/commit/4c4991dccb4890a23fef27b98453196215b81ec6))
* update command listings and remove references to non-existent run.ts ([0208b38](https://github.com/korchasa/flowai/commit/0208b38fb6e9772231b48deb566eafa5ed019f5b))
* update command references in design and README ([ce3597c](https://github.com/korchasa/flowai/commit/ce3597cebcc02aa0009dbc50c6614f92e8ccfa59))
* update control primitives comparison for cursor rules ([e0087fb](https://github.com/korchasa/flowai/commit/e0087fb25d9871b3c4455717e150d73e122e5b1e))
* update documentation guidelines in RULE.md ([81ec4b4](https://github.com/korchasa/flowai/commit/81ec4b4f95440231dfbfd2469c3e1a896db97f71))
* update FR-8, FR-10.8, FR-15.3, FR-16.3 statuses based on implementation audit ([9a16bda](https://github.com/korchasa/flowai/commit/9a16bda55a181b16a0d6b61f9b1bdf61a28249e4))
* update guide counts in requirements and design ([ce49029](https://github.com/korchasa/flowai/commit/ce49029722eb89d85d2674ba5b6d8ae1a43826cf))
* update IDE comparison — add plugin systems, remove Codex/Antigravity ([86a0fe7](https://github.com/korchasa/flowai/commit/86a0fe72aeb2f39d453fbc1129eecbdc74d0b0db))
* update IDE differences with Cursor Agent CLI findings and Claude Code details ([59fa77e](https://github.com/korchasa/flowai/commit/59fa77ed08f5ca5fdcd0f6f184712c4b089bb6e8))
* update ides-difference and whiteboard ([f1d7e4d](https://github.com/korchasa/flowai/commit/f1d7e4d95587cd92373338eb5f0aa0048d090624))
* update planning commands and related documentation ([b53989c](https://github.com/korchasa/flowai/commit/b53989c3411c1ac6b4b75151bee7a5ecee2d6cf9))
* update project rules and readme ([dec2feb](https://github.com/korchasa/flowai/commit/dec2feb6fa47ec05bd715304a88ec8cc791abc83))
* update README and requirements for post-0.3.2 changes ([a863f87](https://github.com/korchasa/flowai/commit/a863f874a233e0bfa6ec2c5fda65546ac22741c0))
* update README for monorepo structure ([0c42c67](https://github.com/korchasa/flowai/commit/0c42c67fb96a095d3e65eb9f18db46ec8a413aee))
* update README to reflect pack system, add to doc hierarchy ([3ba6e01](https://github.com/korchasa/flowai/commit/3ba6e01113eb6ea8a370412c1ba231b66a3ad2e2))
* update RULE.md to allow user language for notes ([5f9064b](https://github.com/korchasa/flowai/commit/5f9064b0e1618e054e5ed98d98a7477d76cd785c))
* update RULE.md to enforce GIT_PAGER usage ([2a8a563](https://github.com/korchasa/flowai/commit/2a8a563315da9271a93ce113b03fd2e627672ac2))
* update SDS with traceability model and agent name corrections ([60c2cb0](https://github.com/korchasa/flowai/commit/60c2cb0c5703a8a0011b5f4b25dd64006a7976ce))
* update SDS with traceability model and agent name corrections ([41bc9b5](https://github.com/korchasa/flowai/commit/41bc9b5f23f83affbe644ac2cb7e24dae2ebc23a))
* update SRS and SDS for af-init and dev commands configuration ([82e31fc](https://github.com/korchasa/flowai/commit/82e31fc2c8d7901bc609ad13c56378112a14a977))
* update SRS format with requirement numbering and acceptance criteria structure ([ec77a57](https://github.com/korchasa/flowai/commit/ec77a57822ea14fdd73e0cf38b0c0adfea096dd4))
* update SRS/SDS and add product vision ([b464e81](https://github.com/korchasa/flowai/commit/b464e81f9be6e52c8aa19ee2fa50b553ac5f9917))
* update SRS/SDS for single AGENTS.md architecture ([e766eb6](https://github.com/korchasa/flowai/commit/e766eb6868550131b4f7cf4fecc7801ea606ab8e))
* update task planning guidelines in task-plan.md ([c7b7772](https://github.com/korchasa/flowai/commit/c7b7772554426e5b79d10eb5b5909ddddd636614))
* update task-answer documentation for clarity and response handling ([0f63f49](https://github.com/korchasa/flowai/commit/0f63f49555c60ca4a5872d3c85f6a90a06762b24))
* update task-check-analyze and task-generate-agents command documentation ([ed35c23](https://github.com/korchasa/flowai/commit/ed35c236fd621cadd657dc0c825dde66fa36771a))
* update task-commit.md to enforce GIT_PAGER usage ([3684c1f](https://github.com/korchasa/flowai/commit/3684c1f921edad9f99e27bdbb0a4b5c2d5f4fa34))
* update task-execute.md to clarify documentation requirements ([76a5171](https://github.com/korchasa/flowai/commit/76a51713399f7ff54aca5af5db1c3c411a8686da))
* update TS strict code style rules to emphasize pure functions and immutability ([18f5710](https://github.com/korchasa/flowai/commit/18f57108fa80f2050512a299d67a176c6e463d1a))
* update whiteboard — ai-skel-ts removed from framework ([e5c3c66](https://github.com/korchasa/flowai/commit/e5c3c662d4eff73180a62c9e369f17e8176c3ec2))
* update whiteboard — P4 resolved ([9982df6](https://github.com/korchasa/flowai/commit/9982df6a5ed3605c728acc1cec0f52570168fb57))
* update whiteboard — P5 resolved ([428200c](https://github.com/korchasa/flowai/commit/428200c6f07b591b62a58ed9479ca38ac3b0c71d))
* update whiteboard — P6 partially resolved ([efbb5fd](https://github.com/korchasa/flowai/commit/efbb5fd0256631ee769f5efb338c1ff47207f08a))
* update whiteboard with deep research skill redesign plan ([d08fa20](https://github.com/korchasa/flowai/commit/d08fa200edc7ccb9165085721af5042e65eb089d))
* update whiteboard with packs plan, add plugin bundles comparison, remove stale spec ([6dcc931](https://github.com/korchasa/flowai/commit/6dcc9311698a2f7fa1ed925581fbe412b3242ce5))
* **versioning:** add draft spec for per-skill semantic versioning ([f0c33fa](https://github.com/korchasa/flowai/commit/f0c33fa1334a7ac52e4a4487f1b46041bb833462))


### Tests

* **af-init:** add idempotency benchmark scenario ([f24edaf](https://github.com/korchasa/flowai/commit/f24edaf687c71c41261e6548725fec5661061a63))
* **bench:** add adapt-all benchmark for full primitive adaptation ([fdcf66c](https://github.com/korchasa/flowai/commit/fdcf66cee10d791e3636a66dec69eb9a098cc278))
* **bench:** add af-init benchmarks and fix runner ([fc90452](https://github.com/korchasa/flowai/commit/fc90452b388a2196e71b3866fa64081257ba6fe1))
* **benchmarks:** add auto-docs scenarios and .flowai.yaml config ([5c98036](https://github.com/korchasa/flowai/commit/5c98036a269d173010c3a282d95a50cc86c03b85))
* **cli:** add commands field to FlowConfig fixtures in main_test ([76fc2bc](https://github.com/korchasa/flowai/commit/76fc2bc332637e4886ae0758fb663af072c6663a))
* **flow-review-and-commit:** add suggest-reflect benchmark scenarios ([bb9010a](https://github.com/korchasa/flowai/commit/bb9010a251c8c27d1f58294c9a45db2a56d38b8f))
* migrate benchmarks and skills to single AGENTS.md ([f2122c4](https://github.com/korchasa/flowai/commit/f2122c481a1a5eae36fec4a96001a3a29771003b))


### Code Refactoring

* adapt trace generator to tasks.guru style and colors ([8590369](https://github.com/korchasa/flowai/commit/85903695892c7c1e733e8411da3dd8a4626f1dd8))
* add flowai- prefix to all framework hooks and agents ([582914e](https://github.com/korchasa/flowai/commit/582914e744e19245f3196e20a47c4c28a32f7257))
* **af-commit:** simplify atomic commit rules for logical grouping ([bee11e6](https://github.com/korchasa/flowai/commit/bee11e6a08c86747139e0702e2bd35446e33c275))
* **af-commit:** update commit rules and instructions ([410140e](https://github.com/korchasa/flowai/commit/410140e5238b96a78e89b26c70b2940c93935655))
* **af-plan:** deduplicate planning rules, reference AGENTS.md ([cc5cabd](https://github.com/korchasa/flowai/commit/cc5cabde74de02552bd696e506cd87fd9a70d011))
* **agent:** restrict flowai-skill-adapter to Bash-only tools ([6516bb5](https://github.com/korchasa/flowai/commit/6516bb56abd134a3e9d29af14d07c512b18c05c5))
* **agents:** remove explicit model declarations from agent frontmatter ([db909cc](https://github.com/korchasa/flowai/commit/db909ccfd114540f36c57d3425dcf2ac4db2cb47))
* **agents:** restructure to per-IDE subdirs with frontmatter validation ([8684dbb](https://github.com/korchasa/flowai/commit/8684dbb71f71d9d450b8540332fc8da27fd14894))
* **agents:** update flow-skill-executor ([8f15742](https://github.com/korchasa/flowai/commit/8f15742a5d591f657227b6d89794f4da83bd0ade))
* **benchmarks:** expand benchmark coverage and compress docs to reference benchmarks ([455c6a2](https://github.com/korchasa/flowai/commit/455c6a237fea82a1cad87c095105e47c39c674f1))
* **benchmarks:** improve judge evidence, fix score calculation, add safety ([5cccd5b](https://github.com/korchasa/flowai/commit/5cccd5b32101ccf6e4ccf9f1d4df01c2329df8e8))
* **benchmarks:** migrate to @bench/ import map and clean up checklist types ([aee77db](https://github.com/korchasa/flowai/commit/aee77db8b73241fccb153909960ed9a41cd999f0))
* **benchmarks:** require agentsTemplateVars, remove legacy agentsMarkdown ([4668f65](https://github.com/korchasa/flowai/commit/4668f656d6e8fed074499afe857795e11ecf8f84))
* **benchmarks:** split trace.ts into modular architecture ([83107ea](https://github.com/korchasa/flowai/commit/83107ea1c00c811671cfbf51e3d606247f4fec6d))
* **catalog:** remove flow-execute and flow-plan agents ([8162464](https://github.com/korchasa/flowai/commit/8162464265cb46c0ebc6b29263394c345027e10d))
* **catalog:** remove flow-skill-debug-by-playwright ([c2d338d](https://github.com/korchasa/flowai/commit/c2d338dbcc43360e7530e411aef137df21799150))
* **catalog:** update flow-do, flow-engineer-subagent, flow-execute, flow-auto skills ([a8599b5](https://github.com/korchasa/flowai/commit/a8599b5ca9a0d24216a44b767c482571a933f081))
* **catalog:** update flow-init skill and AGENTS template ([e583524](https://github.com/korchasa/flowai/commit/e583524296d121f4d822c91dd1d760b2b5829e43))
* **catalog:** update flow-maintenance and flow-reflect skills ([765eba9](https://github.com/korchasa/flowai/commit/765eba96b3cc223d6818622130c4dfb117715de9))
* **catalog:** update flow-skill guides ([7fd2976](https://github.com/korchasa/flowai/commit/7fd2976ae6dcc11adc20629ab6377923c47ccab1))
* **cli:** extract local sync into standalone deno task ([2e4965d](https://github.com/korchasa/flowai/commit/2e4965d52a505f9a8413aaab7be7ef49b7ae9317))
* co-locate benchmarks with skills (FR-7.1) ([0927be7](https://github.com/korchasa/flowai/commit/0927be72625539de01a27622496b910dc510893b))
* **commands:** consolidate planning workflows and enhance GODS framework ([14a4afa](https://github.com/korchasa/flowai/commit/14a4afabaddc66226163d529d529ab208891f0b5))
* **commands:** drop task prefix from command files ([8ca231b](https://github.com/korchasa/flowai/commit/8ca231b9c35c736c3c2a6f705e497aa09b447613))
* **commands:** integrate BED-LLM algorithm details into workflow steps ([e9664e0](https://github.com/korchasa/flowai/commit/e9664e0c464896522e821b1dbd2fe6424b6fce50))
* **commands:** remove AskQuestion tool references ([730f2c4](https://github.com/korchasa/flowai/commit/730f2c4c56b7d56da062bbb2feca6a4499f9e1d9))
* **commands:** remove plan-and-execute command ([4c7b591](https://github.com/korchasa/flowai/commit/4c7b5914569bebf6e3eee4e07479af2fe83020a6))
* **commands:** remove unused command files and update documentation ([7285577](https://github.com/korchasa/flowai/commit/72855774b208b163700dc83e0a81c6924aec4fc2))
* **commands:** rename alpha-task-build-claude-md to task-build-agents-md ([3407e1a](https://github.com/korchasa/flowai/commit/3407e1a8ecb41a38c8c368ed113f5d2732855284))
* **commands:** rename validation checklist to verification ([8e55e48](https://github.com/korchasa/flowai/commit/8e55e4872fd53fec8d7f5bbeec8e7ebe48f1d182))
* **commands:** reorganize investigation and analysis workflows ([7238aab](https://github.com/korchasa/flowai/commit/7238aab0f07ed6db9e50ed4225ffe128746da229))
* **core:** remove flowai-skill-executor agent ([6d2a96b](https://github.com/korchasa/flowai/commit/6d2a96bf15dda71d2ddf06a2e9748eadb08d425e))
* **cursor:** convert GODS rule to how-to guide ([673c88d](https://github.com/korchasa/flowai/commit/673c88d3698c24a5c1574ee8f89846ca53fda824))
* **devcontainer-skill:** replace Keychain auth-forwarding with fully manual auth policy ([28f5f42](https://github.com/korchasa/flowai/commit/28f5f42ddc8eb17e0144bf1761e6de0796766bb0))
* **devcontainer:** align project config with new Auth Policy and SKILL.md rules ([df70091](https://github.com/korchasa/flowai/commit/df70091f3f3df3673d22c6981890e0c443a2e69e))
* **docs:** remove standalone vision.md, consolidate into AGENTS.md ([c1e2dfc](https://github.com/korchasa/flowai/commit/c1e2dfcaa4fa1124cbf8f99ce26e57a57fff661f))
* extract experiments subsystem to flowai-experiments repo ([32ece08](https://github.com/korchasa/flowai/commit/32ece080e25c4c5ba315512b376b8fda67a1e272))
* **extract-claude-code-prompt:** support JS bundles and add helper scripts ([0cc6ac4](https://github.com/korchasa/flowai/commit/0cc6ac40dc6bc114924ca6a2a76361a0d3b5ffdd))
* **flow-init:** make TDD commands in AGENTS.template generic ([8e9ab34](https://github.com/korchasa/flowai/commit/8e9ab34e089b002acb79faed1c3e99c7b2b8c004))
* **flow-init:** merge analyze/inventory/verify into single script output ([f77ea17](https://github.com/korchasa/flowai/commit/f77ea1723bbc53c8f6700d57210511cef3decda2))
* **flow-init:** replace manifest-driven generation with agent-native approach ([f7f6a07](https://github.com/korchasa/flowai/commit/f7f6a079305407a4eaf618ed6140b3ab897ed4e3))
* **flowai-maintenance:** deliver findings inline instead of saving to task file ([81f9f1b](https://github.com/korchasa/flowai/commit/81f9f1be4450b22d22d48e333eedb86796d96e93))
* **framework:** merge three AGENTS.md templates into one ([d0d31bb](https://github.com/korchasa/flowai/commit/d0d31bbac9fc45a4fc0a36716d628a2992c6bbb6))
* **framework:** remove adapted frontmatter field ([ba887ff](https://github.com/korchasa/flowai/commit/ba887ff416ab4554ee6cc14bfb3b8ce167f4b20f))
* **framework:** remove flow-skill-ai-skel-ts (moved to ai-skel-ts library) ([5e6a304](https://github.com/korchasa/flowai/commit/5e6a304aab9d960b9b3388d68996c03b297f79cd))
* **framework:** split commands from skills into sibling dirs ([fa8beb2](https://github.com/korchasa/flowai/commit/fa8beb21a06987825ef30c3c5a9c8cf3f951b1da))
* **install:** remove shell bootstrap and fix process hang on exit ([8cad430](https://github.com/korchasa/flowai/commit/8cad430f7d8a999c6874f6db0a15a95bd7193288))
* merge flow-cli submodule into monorepo ([eb6d983](https://github.com/korchasa/flowai/commit/eb6d9836023e7e10b837136fa202726e4a34bbe1))
* **pipeline:** add flowai- prefix to all pipeline pack primitives ([bd5ef53](https://github.com/korchasa/flowai/commit/bd5ef537fa8c3d05f2ce3cf6b2b10f4142b95d80))
* **pipeline:** rename .flow/ to .flowai/ and move engineer-pipeline skill ([19cb55b](https://github.com/korchasa/flowai/commit/19cb55b2ddeab8cec9debbd0db60637862a1bd20))
* **pipeline:** rename automation→pipeline pack, inline PM into orchestrator, fix test-fitting in benchmarks ([97a3639](https://github.com/korchasa/flowai/commit/97a3639cf1d03d1a0adc8eb4732d2ab3340d8706))
* **project:** reorganize file structure into .cursor/ directories ([8b46177](https://github.com/korchasa/flowai/commit/8b46177de97a71f3a7690b2b1174a53837993a24))
* reclassify skill types — engineer→skill, setup→setup-agent ([ff1b347](https://github.com/korchasa/flowai/commit/ff1b347c79f9e6fef07df744478cd2687b034cd5))
* remove flowai-session-init-docs hook and sessionDocs config ([74b4b70](https://github.com/korchasa/flowai/commit/74b4b70eac8275c45000eb52f9c2e717e743bd43))
* remove flowai-session-init-docs hook and sessionDocs config ([f2f6455](https://github.com/korchasa/flowai/commit/f2f64555eef871d27b7fbc709d7458a785d9c6a6))
* remove lint-on-write and test-before-commit from framework hooks ([ae26c5a](https://github.com/korchasa/flowai/commit/ae26c5ac69e212f995c703dbcb382a71c84eede8))
* remove lint-on-write and test-before-commit from framework hooks ([47d39fa](https://github.com/korchasa/flowai/commit/47d39fa1fb521b6f4322c8bd6537a16ebfe947ad))
* remove pipeline pack and all references ([bb1a1d1](https://github.com/korchasa/flowai/commit/bb1a1d1b907a445f3d52c617b023e9ae034465bb))
* remove settings.json to simplify configuration ([311a8b9](https://github.com/korchasa/flowai/commit/311a8b935dbe5f8a2df77e7ef1e8a0017f2c2bb8))
* rename af-* prefix to flow-* ([da1e32b](https://github.com/korchasa/flowai/commit/da1e32b2ab7e84a6fba9e470fc5071e9f14058dd))
* rename agents to flow-* convention and update references ([91023e2](https://github.com/korchasa/flowai/commit/91023e2799d3619061e95fd2069fb810c255eb21))
* rename AssistFlow to flowai across the project ([b1b42eb](https://github.com/korchasa/flowai/commit/b1b42eb4adb05ee50980f97034a2f3ea7a5112fc))
* rename catalog/ to framework/ ([f6ab187](https://github.com/korchasa/flowai/commit/f6ab1876a070aa6391acaf3433cdf878a2970963))
* rename create-deno-scripts command to create-scripts ([649ccd4](https://github.com/korchasa/flowai/commit/649ccd4f089aa1909cdf5b780a85aa6a5f0e7da5))
* rename Deno skills to follow flow-skill-* convention ([01d8ca8](https://github.com/korchasa/flowai/commit/01d8ca8161ec64998b3a9e517ef309ec078cb0d9))
* rename flow-cli → flowai ([218bdc5](https://github.com/korchasa/flowai/commit/218bdc5f2c21a50b9ea0579a8f7acc622348e1d6))
* rename test files to Deno _test.ts convention ([b41b97b](https://github.com/korchasa/flowai/commit/b41b97b34a8f79500ae480bc3159330c20f64420))
* rename whiteboards to tasks, flowai-spec to flowai-epic ([58739e8](https://github.com/korchasa/flowai/commit/58739e8d67a311e9e4ce258166483a81a0736c06))
* replace flow-skill-configure-strict-typescript with setup-code-style ([7938015](https://github.com/korchasa/flowai/commit/7938015af66ee825781f95bf21dd998f3a1a30f9))
* replace session-start doc reading with per-skill lazy SRS/SDS instructions ([06fa516](https://github.com/korchasa/flowai/commit/06fa516608b9bb677e39eb8e23d50072ad6fb0b2))
* **rules:** migrate .mdc files to directory-based RULE.md structure ([be73683](https://github.com/korchasa/flowai/commit/be73683abbd9aa3a44fab4d251ae35b7d1c4d261))
* **rules:** remove iOS-specific requirements from main-example rule ([b901ab4](https://github.com/korchasa/flowai/commit/b901ab45d0d2137738f88c36a276ca1b3fbcaabf))
* **scripts/benchmarks:** remove three-template runner branches ([fbc06d0](https://github.com/korchasa/flowai/commit/fbc06d0b60b9782d14de834155d14893b5180b91))
* simplify .gitignore by consolidating .claude entries ([ef5b62b](https://github.com/korchasa/flowai/commit/ef5b62bd0816be3ba404a919e84edf64a9923855))
* **skill:** make extract-claude-code-prompt binary-only and external ([24e6339](https://github.com/korchasa/flowai/commit/24e63396bfbde2168d722645930694e5b8b1c76a))
* **skills:** generalize task management tool description ([1754223](https://github.com/korchasa/flowai/commit/17542235b7639056f451f667d6644129b765f9be))
* **skills:** make flowai-init/flowai-update stack-agnostic for command configuration ([716c4e5](https://github.com/korchasa/flowai/commit/716c4e55a2e1c75bd983b40808bdc1b2ecbe7517))
* **skills:** remove flow-do and flow-execute, superseded by AGENTS.md rules ([c8fde03](https://github.com/korchasa/flowai/commit/c8fde033a67f5b1f6e01abdd5c25587e6481bfd5))
* **skills:** remove obsolete flow-auto and flow-convert-cursor-to-claude skills ([d55f608](https://github.com/korchasa/flowai/commit/d55f60894401c769e8074efb59a5e99358232de3))
* **skills:** rename flow-skill-manage-github-tickets-by-mcp → flow-skill-manage-github-tickets ([cc1bad0](https://github.com/korchasa/flowai/commit/cc1bad029c0d5b4e3779e78b5f5b7078240b6d95))
* **skills:** rename flow-skill-playwright-cli → flow-skill-browser-automation ([bd310b8](https://github.com/korchasa/flowai/commit/bd310b869f3ebb735c7d8d8d9cbb69db0a03a585))
* streamline task-create-command.md for clarity and structure ([c806078](https://github.com/korchasa/flowai/commit/c806078f49f42ffaf2d67afb95c3c2b1af53d62a))
* **task-link:** create per-item symlinks from .dev/ and framework/ into IDE dirs ([b3e7c66](https://github.com/korchasa/flowai/commit/b3e7c66981fcb860512702b422eabdf243f2e8a0))
* update do command steps for clarity and verification ([cf48c4c](https://github.com/korchasa/flowai/commit/cf48c4c3bb2edf29a62a6cc7b20e34e42ca2a914))
* update fix attempt rules to use 5-why analysis ([7ce1578](https://github.com/korchasa/flowai/commit/7ce15785f937abc39c87f6406ac4f0a1ebe36d8a))


### Chores

* add dev agents/skills, cleanup stale hook references ([7387202](https://github.com/korchasa/flowai/commit/73872022a74b1a40750ef8a4f9278c33ba1933ab))
* add session-init-docs hook config, format memory files ([8f5909d](https://github.com/korchasa/flowai/commit/8f5909d44617f542f244da26b8b719c018b3da4b))
* add worktrees configuration ([985a756](https://github.com/korchasa/flowai/commit/985a75672783c4022109a1c161d4616a7d084400))
* **benchmarks:** tune scenario timeouts, interactive mode, and params ([9eab6b3](https://github.com/korchasa/flowai/commit/9eab6b31ef71424cfb60fb55f5d34073efc4e81f))
* cleanup obsolete rules and update task command instructions ([6034fca](https://github.com/korchasa/flowai/commit/6034fca04ca56796ac5349f842468025e3e8649e))
* **commands:** move build CLAUDE to alpha draft ([107cdfe](https://github.com/korchasa/flowai/commit/107cdfec04029fdb868d0e6fe7652caf9e4dfbb7))
* configure sessionDocs for session-init-docs hook ([767b75f](https://github.com/korchasa/flowai/commit/767b75ff77c2634173fad535372a8e57b9bbb139))
* configure sessionDocs for session-init-docs hook ([c2ab3ec](https://github.com/korchasa/flowai/commit/c2ab3ec3d58af1d791fe8d7ccc37470323d89419))
* **cursor:** update commands and add Dockerfile rules ([773c1d1](https://github.com/korchasa/flowai/commit/773c1d18be321c504786a8769690dfbebaccc46b))
* **framework:** update flowai framework ([85785f0](https://github.com/korchasa/flowai/commit/85785f0291b32a411f0592f9a4a77477fbca2376))
* **framework:** update flowai framework ([a36e2d1](https://github.com/korchasa/flowai/commit/a36e2d184bef37f1e6b5e491677ee2a5aaa06459))
* **framework:** update flowai framework ([1c76d18](https://github.com/korchasa/flowai/commit/1c76d18db893ced8cd08c057acdf97ac42523c3d))
* **framework:** update flowai framework ([f1eb946](https://github.com/korchasa/flowai/commit/f1eb946660ef312029053835ebb915030f9824b1))
* **framework:** update flowai framework to 0.4.18 ([7ea38d0](https://github.com/korchasa/flowai/commit/7ea38d011fa27e37a59c50dcc3f7d654844f23fa))
* gitignore pipeline runs and update flowai config ([5de6f90](https://github.com/korchasa/flowai/commit/5de6f90d1b3e9a27668024f005fe4ac9b4510245))
* maintenance sweep — refactor trace.ts, fix design.md, add AGENTS.md and JSDoc ([db8f09c](https://github.com/korchasa/flowai/commit/db8f09cf917098faab49bb086fabdd269eaea734))
* **release:** 0.3.0 ([c30b32d](https://github.com/korchasa/flowai/commit/c30b32d76d2bcebbe3f8334836ae05cb4f3b0033))
* **release:** 0.3.1 ([969cf65](https://github.com/korchasa/flowai/commit/969cf656251ba70cef1141584b009bacb95fa253))
* **release:** 0.3.2 ([8708735](https://github.com/korchasa/flowai/commit/8708735f2c05181e54103ad805f1f281b7e4a802))
* **release:** 0.3.3 ([80fa147](https://github.com/korchasa/flowai/commit/80fa1470eed7b4dbdc962b0e6b55351c9b353503))
* **release:** 0.3.4 ([3718677](https://github.com/korchasa/flowai/commit/371867786107c0ccef134e1562599cbe6faa74cc))
* **release:** 0.3.5 ([57c9c6d](https://github.com/korchasa/flowai/commit/57c9c6df5884fd210141d04aa65f1ff2a3688426))
* **release:** 0.3.6 ([39500cd](https://github.com/korchasa/flowai/commit/39500cdf263bf086b2b54d961fd5e74b65c2642e))
* **release:** 0.3.7 ([0071ef2](https://github.com/korchasa/flowai/commit/0071ef24f98627ae7d5294bf3d0012e17557ec00))
* **release:** 0.3.8 ([4a0ff3f](https://github.com/korchasa/flowai/commit/4a0ff3f231be94e23f89c89d44fb22a670827d5d))
* **release:** 0.3.9 ([9def3c1](https://github.com/korchasa/flowai/commit/9def3c1db450aaa72d4aa986a6aa283a048039f6))
* **release:** 0.4.0 ([9b2d943](https://github.com/korchasa/flowai/commit/9b2d94387ebed6adcece9c30f315056e79aa596c))
* **release:** 0.4.1 ([75b8299](https://github.com/korchasa/flowai/commit/75b8299d835dc569e0c59f26850fc1a13bd328e6))
* **release:** 0.4.10 ([eb97966](https://github.com/korchasa/flowai/commit/eb9796696fb8669875a32b657a76bb4d922e07e7))
* **release:** 0.4.11 ([69ea503](https://github.com/korchasa/flowai/commit/69ea503d600b2d4b6f65de8626907937c040c7ab))
* **release:** 0.4.12 ([74d2f3b](https://github.com/korchasa/flowai/commit/74d2f3bb8f8bbfaca6bf5ba24d5070a3caecd65c))
* **release:** 0.4.13 ([8799598](https://github.com/korchasa/flowai/commit/87995987f52c9e4e6f3eaaa1a6d7c0d6f7c80abf))
* **release:** 0.4.14 ([c90d432](https://github.com/korchasa/flowai/commit/c90d432a4b20e4cb14fb804a93b010bce508db6d))
* **release:** 0.4.15 ([019a943](https://github.com/korchasa/flowai/commit/019a9430b63a58ab08ccb4fe5216ea43099e5e3a))
* **release:** 0.4.16 ([2003f0f](https://github.com/korchasa/flowai/commit/2003f0f325d229baeaf03a405188809e7b2a4599))
* **release:** 0.4.17 ([26d00e6](https://github.com/korchasa/flowai/commit/26d00e6dd8428f8a1a56d5fffd4acef3904bf109))
* **release:** 0.4.18 ([b2613e5](https://github.com/korchasa/flowai/commit/b2613e541d6020353edd5166ecde060332835dd6))
* **release:** 0.4.19 ([18f8d25](https://github.com/korchasa/flowai/commit/18f8d25c2430841b5afd9d429684cc7fb3b05b16))
* **release:** 0.4.2 ([cecef7c](https://github.com/korchasa/flowai/commit/cecef7c7feb2ef531bbde6fd5af965b724ea8141))
* **release:** 0.4.20 ([e3f287f](https://github.com/korchasa/flowai/commit/e3f287ffc3bb4b730731cc828ec54a294b782eee))
* **release:** 0.4.3 ([d1b5e62](https://github.com/korchasa/flowai/commit/d1b5e6295bcec192989ed03f3f0d320ae244589a))
* **release:** 0.4.4 ([27435d0](https://github.com/korchasa/flowai/commit/27435d0bc1e9aa63904b172f2f014a197b954d71))
* **release:** 0.4.5 ([4629ce9](https://github.com/korchasa/flowai/commit/4629ce96d7c23f1e290b7f5789d7639f47fb3e82))
* **release:** 0.4.6 ([239e908](https://github.com/korchasa/flowai/commit/239e90877d85ff130acd832f7bef5fe16fb1adb8))
* **release:** 0.4.7 ([db68a26](https://github.com/korchasa/flowai/commit/db68a2669309d8a1379e2df32ac0676795f63bbe))
* **release:** 0.4.8 ([c5538be](https://github.com/korchasa/flowai/commit/c5538beaa727911ce74cb30005d8dada2561c3b0))
* **release:** 0.4.9 ([f920c42](https://github.com/korchasa/flowai/commit/f920c423ddc0f72e80db57be9230d3104c4ef0e6))
* **release:** 0.5.0 ([1d4c4df](https://github.com/korchasa/flowai/commit/1d4c4dfb0d4c237f6d00542de5a23a99d81a0422))
* remove .claude/ from tracking and add to .gitignore ([41b7a20](https://github.com/korchasa/flowai/commit/41b7a207712b9378e1a5d37245ef4fb338010394))
* remove .flowai/runs/ from tracking ([c476da3](https://github.com/korchasa/flowai/commit/c476da35a88647de3d1e826ece78fb3e41adb928))
* remove deprecated commands and rules ([d35ff91](https://github.com/korchasa/flowai/commit/d35ff9159dd3ab3a1aad1d920f31f9185330023d))
* remove deprecated settings.json and whiteboard.md files ([099dec0](https://github.com/korchasa/flowai/commit/099dec056c3e366f9a1da06cb335f3fa3b12b7b9))
* remove flowai-skill-example and prevent re-creation ([e900e3e](https://github.com/korchasa/flowai/commit/e900e3e74ee5fdede74bad6f2fec25bfbfbf4d6e))
* remove obsolete R&D tasks format documentation ([96bb277](https://github.com/korchasa/flowai/commit/96bb27799fc03f5cf2908594fc60acc257235652))
* remove write-skill command ([c099095](https://github.com/korchasa/flowai/commit/c099095c935357ec322262b508143f071f2adc90))
* **repo:** collapse legacy three-file AGENTS.md layout ([28a4970](https://github.com/korchasa/flowai/commit/28a4970e752c6e5c1b29ee1453d0112f922e2b1a))
* **scripts:** add IDE environment detection utility script ([6261118](https://github.com/korchasa/flowai/commit/62611187972ba799669d4fcc2fd3cee77196e90f))
* sync framework skills/agents via flow-cli ([2a6db9a](https://github.com/korchasa/flowai/commit/2a6db9a070f47c0b15cdfbb7571856a393e56e7b))
* update .gitignore and add .cursorignore ([800f44a](https://github.com/korchasa/flowai/commit/800f44a1c90cba60be40b2eb276b975bc197d8d9))
* update .gitignore and enhance README with new command descriptions ([8ec97a5](https://github.com/korchasa/flowai/commit/8ec97a5e846b701f2281f0b3bf3fd1a0158f7e66))
* update .gitignore to ignore .vscode ([553c382](https://github.com/korchasa/flowai/commit/553c382ca7bccc677a06bb090e1ef063719fbde3))
* update .gitignore to ignore documents directory ([5a4ee0b](https://github.com/korchasa/flowai/commit/5a4ee0b277047079e8adbfd1568aec1a9acf0a16))
* update flow-cli submodule (PATH docs) ([70671e8](https://github.com/korchasa/flowai/commit/70671e8a28ced0714b03de75ec9b1672bb5c9cdd))
* Update project files and add README.md ([1cb69ba](https://github.com/korchasa/flowai/commit/1cb69baace274ed8c00a131309d265363257540b))
* update repo scaffolding and cleanup ([324ce4e](https://github.com/korchasa/flowai/commit/324ce4e59a416475269a60151340184a93f0d25b))
* update repo URL korchasa/flow → korchasa/flowai ([6b348ac](https://github.com/korchasa/flowai/commit/6b348acb1c1ac10603e671a1075e9cb4d5ae7c15))
* **vscode:** remove .vscode/settings.json ([5fedb82](https://github.com/korchasa/flowai/commit/5fedb82e652d8bedebe20b949679520c79d28e48))

## 0.5.0 (2026-04-11)


### ⚠ BREAKING CHANGES

* All skill names changed from af-* to flow-*.
Commands like /af-commit are now /flow-commit.

Co-authored-by: Cursor <cursoragent@cursor.com>
* **rules:** Rule files moved from .mdc extension to RULE.md in directories.
Cursor IDE will automatically detect and load rules from new structure.

### Features

* add 'fail fast' strategy to AGENTS rules ([8557845](https://github.com/korchasa/flowai/commit/855784514d0a54f89cfa03ee9141a3ec263cedc1))
* add af-skill-generate-code and context-inefficiency benchmark scenario ([bcd1d50](https://github.com/korchasa/flowai/commit/bcd1d5062dc608217a35a8056c906dfb13d2dac6))
* add Cursor desktop and OpenCode guides to skills catalog ([ed5718e](https://github.com/korchasa/flowai/commit/ed5718eff822af1921085dfc0479fcc17571df05))
* add flow-skill-playwright-cli and update requirements ([e1321c1](https://github.com/korchasa/flowai/commit/e1321c1a032451e2c11b316686e2d8196494e5d9))
* add how-to guide for writing DEP ([723de86](https://github.com/korchasa/flowai/commit/723de86a6d92ad7a6aeeb705ff7a44b4a9d6e414))
* add new commands and enhance existing development workflows ([0926ab2](https://github.com/korchasa/flowai/commit/0926ab25351fc036d8dee32dcb4fecf8f0d2919c))
* add QA command for task verification and cleanup ([73ce2d0](https://github.com/korchasa/flowai/commit/73ce2d0e30f462f8b5d7d67b3bfa7182bd58a8db))
* add reflect command ([27488f2](https://github.com/korchasa/flowai/commit/27488f2d26e8c576dbf4e6cd8736aafe06f91bf7))
* **af-engineer-skill:** add references and scripts ([576ec4d](https://github.com/korchasa/flowai/commit/576ec4dd92b77567d914af0cfc0d7f7e19d25687))
* **af-engineer-subagent:** add subagent engineering skill ([fad0b60](https://github.com/korchasa/flowai/commit/fad0b6070728ddf89eb75700ee195d2e1907a0ca))
* **af-init:** add component inventory and dev commands configuration ([aa42252](https://github.com/korchasa/flowai/commit/aa422520cee9383c5fd293b6d359b26e4ce93233))
* **af-init:** add standard interface commands to project template ([907de72](https://github.com/korchasa/flowai/commit/907de72a23c2a51e199542d77986b72ee8bba5f2))
* **af-init:** improve brownfield workflow and agent template ([70df9b3](https://github.com/korchasa/flowai/commit/70df9b38999f2a91f4ab26fc5acef3454f0851e5))
* **af-init:** move documentation generation from script to agent ([fa66a4b](https://github.com/korchasa/flowai/commit/fa66a4bae492ed1c047de9c6adf3337f4b21ad68))
* **af-init:** preserve PROJECT_RULES on AGENTS regeneration ([82d5968](https://github.com/korchasa/flowai/commit/82d5968912b58e210d96184646ba5a102fe794ec))
* **af-setup-code-style:** add Deno and strict TS setup skills ([e899178](https://github.com/korchasa/flowai/commit/e899178a2fd2d265c28cd7d639f9340fbf5f3d6e))
* **af-skill-ai-skel-ts:** add AI agent scaffold skill ([bc8ac83](https://github.com/korchasa/flowai/commit/bc8ac83faf5593a5d32c2a2f77d2b0beced4f962))
* **af-skill-configure-deno-commands:** add skill for standardizing deno dev commands ([41962cd](https://github.com/korchasa/flowai/commit/41962cd3c777636a839b4626fbf4497fc5c81d71))
* **af-skill-configure-strict-typescript:** add strict TypeScript configuration skill ([dd0f449](https://github.com/korchasa/flowai/commit/dd0f44910c4e4fb3275b521c9b656822a80f275f))
* **agents:** add flow-console-expert subagent ([36ea657](https://github.com/korchasa/flowai/commit/36ea657e5821c63f0d62f13115f0e29a2361b144))
* **agents:** add general-purpose executor agent ([e79843c](https://github.com/korchasa/flowai/commit/e79843cddc537cae605717ea15ed70e475b19d7f))
* **agents:** specify default models for prompt-engineer and skill-executor ([3a24d18](https://github.com/korchasa/flowai/commit/3a24d18aab7099de6def063f148291e66a4e72cf))
* **automation:** add automation pack with SDLC pipeline, role-specific subagents, and benchmarks ([f468374](https://github.com/korchasa/flowai/commit/f46837494f5e1e13f63935d063a52ce79dd52328))
* **bench:** add pack-level AGENTS.md rules benchmarks and relocate templates ([b23e623](https://github.com/korchasa/flowai/commit/b23e6231232739926367bde2d792936ab75c95d5))
* **bench:** implement secure dockerized execution for benchmarks ([#4](https://github.com/korchasa/flowai/issues/4)) ([ce1d4c1](https://github.com/korchasa/flowai/commit/ce1d4c15745c4f2ac6ec103724016fe6bef1a35a))
* **benchmarks:** add 25 new benchmark scenarios for framework skills ([facab36](https://github.com/korchasa/flowai/commit/facab368949df6ac82b06726c4cba5b2799ab902))
* **benchmarks:** add benchmark system for subagents ([782de3a](https://github.com/korchasa/flowai/commit/782de3a8ba7e2df542d1a6e117e2b910fecc903a))
* **benchmarks:** add multi-IDE support via adapter pattern ([#6](https://github.com/korchasa/flowai/issues/6)) ([97b19b8](https://github.com/korchasa/flowai/commit/97b19b88064f4fb943fa42e07c1fcf19aaa03537))
* **benchmarks:** add pack-scoped sandbox isolation and cross-pack reference validation ([9dda164](https://github.com/korchasa/flowai/commit/9dda1642accb09c6fe6f47d3561b5c53d03bc828))
* **benchmarks:** generate AGENTS.md from templates, add CLAUDE.md symlinks ([da51344](https://github.com/korchasa/flowai/commit/da5134431ea12c6d258276954d82354de2fc8595))
* **benchmarks:** migrate to stream-json, add NO_COLOR support, skip logic ([6cdb1b5](https://github.com/korchasa/flowai/commit/6cdb1b55056533b4fb8284f44bf51fe644683537))
* **benchmarks:** switch judge to Claude CLI, add parallel execution and explicit trace IDs ([c3c0741](https://github.com/korchasa/flowai/commit/c3c074116c82e595095ae26d35aaaaaf0f0ca8d1))
* **catalog:** add flow-commit agent for automated commit workflow ([e597da2](https://github.com/korchasa/flowai/commit/e597da2bf6dca338113394e6950c955edfd70f0b))
* **catalog:** add flow-convert-cursor-to-claude skill ([65bd29a](https://github.com/korchasa/flowai/commit/65bd29a60325e85d501a118e7c040c0ed7050f3f))
* **catalog:** add flow-execute and flow-plan agents ([24ad2ba](https://github.com/korchasa/flowai/commit/24ad2ba5e3bfdc95476095b553051b9a08af21cc))
* **catalog:** add flow-skill-deep-research skill and deep-research-worker agent ([43624a6](https://github.com/korchasa/flowai/commit/43624a61dddd0030760b91c2d6c780579a6e4387))
* **catalog:** disable model invocation for engineer and setup skills ([b4670b2](https://github.com/korchasa/flowai/commit/b4670b207af6ff6723dd888096669208c8bfdd08))
* **checks:** add naming prefix validator (NP-1: all primitives must use flowai- prefix) ([2491f33](https://github.com/korchasa/flowai/commit/2491f332eaadf74cb59faab622d0d05c74228db6))
* **cli:** --version checks for updates and shows update command ([d0e15a3](https://github.com/korchasa/flowai/commit/d0e15a3e89ca025ad8d0fb7b47a9d7e3d9c9ad83))
* **cli,framework:** add CLI update step to flow-update skill and version hint in IDE guard ([690fba7](https://github.com/korchasa/flowai/commit/690fba7f3ae313e14595fed57d92b3dcc5454dd9))
* **cli,update:** complete sync output for all primitive actions + frontmatter validation ([41e7578](https://github.com/korchasa/flowai/commit/41e75784d7e3586ca1a20a1dac9e0fb5fd5055db))
* **cli:** add --local sync mode; stop tracking .claude/ in git ([cd45ca6](https://github.com/korchasa/flowai/commit/cd45ca6b3b95d965db0a9ee2f09c9003090db478))
* **cli:** add `flowai loop` command for non-interactive Claude Code execution ([366e577](https://github.com/korchasa/flowai/commit/366e577fb8448064a783619bb8bc747ef0edff4e))
* **cli:** add `flowai update` self-update subcommand ([7b4d872](https://github.com/korchasa/flowai/commit/7b4d8721be23fcea2e9354d12c7b6fbe0d490cf5))
* **cli:** add migrate subcommand for one-way IDE primitives migration ([7d2962f](https://github.com/korchasa/flowai/commit/7d2962f4093bb9ca51ff783ca34108c98b548f21))
* **cli:** add non-interactive config generation for -y flag ([b8ddd72](https://github.com/korchasa/flowai/commit/b8ddd725f890c30985bc0a2500596cf557531bf4))
* **cli:** add source override for installing from git branch or local path ([d210a08](https://github.com/korchasa/flowai/commit/d210a08590ed342c2012b6934632fe2bdba410a7))
* **cli:** decouple AGENTS.md templates from flowai-init scaffolds ([2fd635f](https://github.com/korchasa/flowai/commit/2fd635f3c48addbc9c49ba875311fc54200a01b3))
* **cli:** delete excluded framework resources during sync ([e16e64b](https://github.com/korchasa/flowai/commit/e16e64be9682345753a9e6c409c5aad244f2b575))
* **cli:** implement cross-IDE user resource sync (FR-10.8, FR-10.9) ([af2f709](https://github.com/korchasa/flowai/commit/af2f709f2e738e0e9835a03d86af1483f8233778))
* **cli:** interactive update prompt with deno.lock pinning fix ([5d869ec](https://github.com/korchasa/flowai/commit/5d869ecfa7e7ff3edc866952b63dacb6a3690aa2))
* **cli:** sync core assets to IDE config dirs ([a2e67e2](https://github.com/korchasa/flowai/commit/a2e67e27b6263c6e1c8e90a83352fab0a1a745a8))
* command to build CLAUDE.md file using .cursor/rules ([8a82ab1](https://github.com/korchasa/flowai/commit/8a82ab16ce2e3e02d51f618c2d78c851a9823c56))
* **commands:** add analysis and gap filling step to execution workflow ([887b344](https://github.com/korchasa/flowai/commit/887b34445bf03c6e02df566b97769d41ee681eba))
* **commands:** add docs-check command ([79ab673](https://github.com/korchasa/flowai/commit/79ab673123661979e6f9ac1dd23d133668c8f861))
* **commands:** add error analysis workflow ([3367e92](https://github.com/korchasa/flowai/commit/3367e9230dcef65473c32aa3d912db327d6d5407))
* **commands:** add maintenance command ([f24db45](https://github.com/korchasa/flowai/commit/f24db456efe3d8e291ca64b1548514bb97efbca4))
* **commands:** add task-build-claude-md command with implementation script ([4a48cfd](https://github.com/korchasa/flowai/commit/4a48cfd05d4c9e33bbc495e8de62fe9dd9a6a4b1))
* **commands:** automate commit workflow with atomic grouping ([1033c25](https://github.com/korchasa/flowai/commit/1033c25576efc4894942dab6a0b4823cecc04b8a))
* **commands:** enhance init command workflow ([6a4f8c7](https://github.com/korchasa/flowai/commit/6a4f8c7bb66fd199d4bf1e37ace56796bbc0611e))
* **commands:** implement GODS framework and chat-first reasoning in planning ([90aeb21](https://github.com/korchasa/flowai/commit/90aeb213364c631c0b5f2672496997de37e39e92))
* **commands:** reorganize tasks and add agent rules ([88faf75](https://github.com/korchasa/flowai/commit/88faf75ef04fbc271e5c179e204375fb61952417))
* **configure-deno-commands:** require parallel buffered check execution ([e52ad4d](https://github.com/korchasa/flowai/commit/e52ad4de85edc3c670f31f56f380f9e643989ad8))
* **core:** add flowai-reflect-by-history skill ([d5de1a8](https://github.com/korchasa/flowai/commit/d5de1a8b4aabcd6738fe62275b5852f3a1eaf1cd))
* **core:** add parallel execution to deno task check and review/commit skills ([8441c26](https://github.com/korchasa/flowai/commit/8441c2616359ea3585b4a1be0473196cedb0296e))
* **core:** integrate AskQuestion and SwitchMode tools for interactive clarification ([babd1fe](https://github.com/korchasa/flowai/commit/babd1feab62a47e706a073d6a34ef5e41372ae7e))
* **cursor:** add initial task docs, rule guidelines, and design docs; update README and .gitignore ([03857ee](https://github.com/korchasa/flowai/commit/03857ee3ee04cf567a9c8f62a15ae35d7e51eac9))
* **deno-cli:** add skill for managing Deno capabilities via CLI ([d3b627f](https://github.com/korchasa/flowai/commit/d3b627f496292ea8977b5f2d3298415c7d5b2c59))
* **deno-deploy:** add local debugging protocol and unstable APIs guide ([2e6cee9](https://github.com/korchasa/flowai/commit/2e6cee9be7c851b0f1131b2da3072e4a34c61e5e))
* **deno-deploy:** add skill for managing Deno Deploy cloud services ([e5d4b10](https://github.com/korchasa/flowai/commit/e5d4b1097ed25e2fbdaed8513dbc30758a074fac))
* **devcontainer:** add Claude Code auth forwarding from macOS Keychain ([99d3fa7](https://github.com/korchasa/flowai/commit/99d3fa771b609fe624ff54c89a8f66b3ee0236e4))
* **devcontainer:** add gh CLI auth and git credential helper to setup-container.sh ([e3c9f85](https://github.com/korchasa/flowai/commit/e3c9f85f2a7cb66a27dc303fb1ae5a8b103689e9))
* enforce IDE-agnostic language and update skills ([90fb207](https://github.com/korchasa/flowai/commit/90fb207000082335d74d9e837cdf85d3d96defc7))
* **engineer-rule:** update Claude Code rule semantics based on experimental verification ([b77f509](https://github.com/korchasa/flowai/commit/b77f5099295202cafc2ca33172e63969a8622119))
* **engineer:** add OpenCode IDE support to all engineer skills and docs ([1e50994](https://github.com/korchasa/flowai/commit/1e50994637e4c8beb7f37e20bda38798390e0ba1))
* **experiments:** add sweep subsystem and claude-md-length study ([1b51a1c](https://github.com/korchasa/flowai/commit/1b51a1c32be8116f121d1c53e238ec4c08187cfa))
* extend frontmatter for skills and agents with model tiers ([fd7d37a](https://github.com/korchasa/flowai/commit/fd7d37a5fd7a16c60664225639f510315e80262a))
* **flow-cli:** add self-update check against JSR registry ([8c63c5e](https://github.com/korchasa/flowai/commit/8c63c5e6bb1b10aa2a65db5e9a4f9fcd82cb202e))
* **flow-commit:** enforce consolidation-first commit grouping ([78acd15](https://github.com/korchasa/flowai/commit/78acd158961d70562c0b03fdf02145c3c6ddc022))
* **flow-init:** add 'no tables in chat' rule to AGENTS template ([e8a2d65](https://github.com/korchasa/flowai/commit/e8a2d65eaead9895502654c3cb0f492509f085f3))
* **flow-init:** add CLAUDE.md symlink step and fix evidence references (FR-19) ([cbde0d4](https://github.com/korchasa/flowai/commit/cbde0d43bedbed15abdbae22ba9e112c110dcf27))
* **flow-init:** add Deno tooling option to interview ([fbf5151](https://github.com/korchasa/flowai/commit/fbf515151e81b7d9b6d9ddd092f3b404c3d1892a))
* **flow-init:** split AGENTS.md into domain-scoped files with manifest-driven generation (FR-12) ([1a08122](https://github.com/korchasa/flowai/commit/1a0812217d6cef9722c453cbce4dc628f226c0d6))
* **flow-reflect:** add undocumented discoveries and automation opportunity analysis ([7071875](https://github.com/korchasa/flowai/commit/7071875ab0379cc917fd64cc2b9b26c631b6ba2c))
* **flow-skill-executor:** add introduce-yourself step to workflow ([3ad6d54](https://github.com/korchasa/flowai/commit/3ad6d5421294d0fb04875e1cd3b57475d89f0216))
* **flow-skill-setup-ai-ide-devcontainer:** add feature discovery step and catalog (FR-20.11) ([29fef36](https://github.com/korchasa/flowai/commit/29fef36147e8006087e72ca4a8ef8dd8f168f6e9))
* **flow-skill-setup-ai-ide-devcontainer:** complete FR-20 coverage gaps (SDS, benchmarks, multi-CLI) ([7d6e54d](https://github.com/korchasa/flowai/commit/7d6e54d4a329764fa241c6a2265b377079b1a44a))
* **flowai-plan:** improve variant selection flow and fix interactive benchmark infrastructure ([3b04cfc](https://github.com/korchasa/flowai/commit/3b04cfc4f26b08bd74ed090582814cd5e4d2fcbc))
* **framework,cli:** implement pack system — flowai-* renaming, hooks/scripts, rich sync output ([0cc3000](https://github.com/korchasa/flowai/commit/0cc300021887af082be6ce08b47f45f4ad5ad711))
* **framework:** add clarity review criterion and TS no-nested-ternary rule ([9b7203a](https://github.com/korchasa/flowai/commit/9b7203acfde2f60fb32055f9d72216a6c6271b49))
* **framework:** add explicit git diff commands to flow-update skill ([b946c27](https://github.com/korchasa/flowai/commit/b946c2759a9dd24ff04f8bc300a9a7a1826718ef))
* **framework:** add flow-update skill and CLI IDE context guard ([687effe](https://github.com/korchasa/flowai/commit/687effebf71ffc667c8bd262e45f6f1f337f9a8d))
* **framework:** add interactive-teaching-materials skill ([a141aea](https://github.com/korchasa/flowai/commit/a141aeae4b32d5ded229fa209b90650857c248fc))
* **framework:** add skill adaptation to flowai-update ([bed0c31](https://github.com/korchasa/flowai/commit/bed0c315b38176a91d7a6f00ace1844c0006b384))
* **framework:** enrich variant analysis with Risks and Trade-offs ([5bf9e1f](https://github.com/korchasa/flowai/commit/5bf9e1f1069b62906662f64680958a7b35aa4462))
* **framework:** mandatory Documentation Audit with gate and report template ([2076efb](https://github.com/korchasa/flowai/commit/2076efb06ff5af38270a8858ec35cf5bba077dd2))
* **framework:** migrate benchmarks and runner to pack structure ([28ea5d6](https://github.com/korchasa/flowai/commit/28ea5d6bd5c22c70eed2bddc825ff9fc1bf101d7))
* **framework:** migrate whiteboard from single file to per-session directory ([42316a6](https://github.com/korchasa/flowai/commit/42316a66a13ec3c88ebbfd630b64d68dc955e62d))
* **framework:** propagate FR-<ID> traceability rule to AGENTS template ([7afd092](https://github.com/korchasa/flowai/commit/7afd092f876ff800203bd5d1c5c9b07b33f78431))
* **hooks:** add flowai-session-init-docs SessionStart hook ([22ba4ab](https://github.com/korchasa/flowai/commit/22ba4ab1629fa56b86ebefcc5e2dce32a8aec3b6))
* **hooks:** add framework hooks with IDE-specific config generation ([b6a5ccb](https://github.com/korchasa/flowai/commit/b6a5ccbe14a9c10bcb69e7291616ed376c73071f))
* implement unified benchmark trace with dashboard and skill grouping ([5474dfb](https://github.com/korchasa/flowai/commit/5474dfbe9c23487c0dd47e48248e1b60f3e8c0b7))
* **install:** add --yes/-y flag for non-interactive execution ([af87bc2](https://github.com/korchasa/flowai/commit/af87bc2a72791b84ee2dc894773e9329beb11188))
* **install:** add global installer for per-IDE agent/skill symlinks (FR-10) ([94817b5](https://github.com/korchasa/flowai/commit/94817b5a2118a8b1eae9c2d88b2de6cef6c70ce2))
* **install:** add remote execution and shell bootstrap (FR-10.6) ([b6de621](https://github.com/korchasa/flowai/commit/b6de621cd0b5cd1cb7ffd77348b2655fc15963ee))
* integrate product vision into AGENTS.md and af-init ([#5](https://github.com/korchasa/flowai/issues/5)) ([2d786db](https://github.com/korchasa/flowai/commit/2d786db3aed034fe92afe8bcf852516f883b284a))
* introduce .dev/ SPOT directory with symlink-based multi-IDE support ([9ac2a13](https://github.com/korchasa/flowai/commit/9ac2a1318ddde135193dac725088cfab790cc880))
* **maintenance:** add deno task scripts and config ([1a14040](https://github.com/korchasa/flowai/commit/1a140403747efab3a485954007f71444b61caf82))
* **mcp:** add configuration for Cloudflare browser rendering server ([d7e202f](https://github.com/korchasa/flowai/commit/d7e202fbfc3a59eb6300790fdbc847dae06ffe3f))
* migrate framework Python scripts to Deno/TypeScript (FR-13) ([0a778c1](https://github.com/korchasa/flowai/commit/0a778c1fc7e37ce41135b52f91c9f25efbb1955e))
* **pipeline:** add compact SDLC pipeline with Design and Review agents ([d9c6876](https://github.com/korchasa/flowai/commit/d9c6876720b963e6bdd9a13565b397c3273403ca))
* **pipeline:** add flowai-pipeline-sdlc — local SDLC pipeline without GitHub ([565ec45](https://github.com/korchasa/flowai/commit/565ec45f1cc726d3230bda4225e837a74151069e))
* **planning:** add Plan Persistence rule to save plans to whiteboard.md ([e00c89f](https://github.com/korchasa/flowai/commit/e00c89fd8100c870a6ca6c4b91569b72cdedbfed))
* replace /check with iterative /check-and-fix command ([94f7627](https://github.com/korchasa/flowai/commit/94f762709f2a34571833eb455163aada3d825e5c))
* **rules:** add skill-creator guide and scripts ([f5961dc](https://github.com/korchasa/flowai/commit/f5961dcbb393643b00df2401d790eda051ced94f))
* **scripts:** auto-disable ANSI colors when running under Claude Code ([dedcba7](https://github.com/korchasa/flowai/commit/dedcba799f5a31790fa85a8520f8d51cf0773747))
* **settings:** update permissions and add additional directories for flow-review-and-commit ([5e81f60](https://github.com/korchasa/flowai/commit/5e81f60d8524b75c7cf0e5a60dbd0480c020cda5))
* **skills:** add flow-spec skill for phased feature specifications ([294a12c](https://github.com/korchasa/flowai/commit/294a12cc54e433909f773500344791e5cdabbbb9))
* **skills:** add flowai-adapt command for standalone primitive adaptation ([dc01c34](https://github.com/korchasa/flowai/commit/dc01c34d5e478f7147c048e25631e03a68c0c7b0))
* **skills:** add instruction coherence and tooling relevance checks to flowai-maintenance ([867d3ec](https://github.com/korchasa/flowai/commit/867d3ec9af3b50ee5d12688d37100297eb82c7b0))
* **skills:** add pre-flight project check to flowai-review ([fec5307](https://github.com/korchasa/flowai/commit/fec5307dbcd2e7cb3b6f188bd198e5fd80f040ef))
* **skills:** close FR-21.3–21.6 universal skill & script requirements ([fe11fad](https://github.com/korchasa/flowai/commit/fe11fad59d704d6b17630f6a0e8bf9646cf54426))
* **skills:** enforce FR-21.1 agentskills.io compliance with validation and fixes ([c7d1b36](https://github.com/korchasa/flowai/commit/c7d1b362aa22bc82abc4377c2afe7cb706f7c0cb))
* **skills:** enforce FR-21.2 cross-IDE script path resolution ([971f660](https://github.com/korchasa/flowai/commit/971f660d05c4b5bbebdc7c5c3dd126a55ac3d2c5))
* **skill:** update flow-skill-analyze-context to focus on total cost estimation ([fed8ba2](https://github.com/korchasa/flowai/commit/fed8ba2e59a7ca26659c6763ca8af704adc97d8b))
* **sync:** implement user commands synchronization across IDEs ([ef68ff7](https://github.com/korchasa/flowai/commit/ef68ff7d3fbed62221a1a73f1918b0fdd290fd2a))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([8bff86a](https://github.com/korchasa/flowai/commit/8bff86aa4b4d31cdb1605732a5c24fa69f8db1f8))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([88fb794](https://github.com/korchasa/flowai/commit/88fb794f075564548251f973e4ae54d2c1d26822))
* universal agent format + flow-cli distribution ([#7](https://github.com/korchasa/flowai/issues/7)) ([45ad03e](https://github.com/korchasa/flowai/commit/45ad03e200589c2a87644ef116ff35c4482ff41f))
* update /investigate command with iterative workflow ([99ee7f0](https://github.com/korchasa/flowai/commit/99ee7f01cbf1d103c41673fa73575e92a3d70abb))
* update commands ([a629309](https://github.com/korchasa/flowai/commit/a629309ce4d7f7bdd7c4f14b1217d26dbe240456))


### Bug Fixes

* **af-init:** align documentation generation with standard schema ([513960a](https://github.com/korchasa/flowai/commit/513960a3b8a392babcdd23b171f9ec3236cca1b3))
* **bench:** correct checklist items in flowai-update benchmarks ([45ee5d8](https://github.com/korchasa/flowai/commit/45ee5d8bd21cd2837de49456d52e4239cc3e3050))
* **benchmarks:** add interactive mode to review scenarios (P3) ([53f8ed3](https://github.com/korchasa/flowai/commit/53f8ed3a766942b7df2e668c80a7c5b30fd740f6))
* **benchmarks:** fix P5 strict checklists — skill fixes and interactive mode ([ca009f0](https://github.com/korchasa/flowai/commit/ca009f0e42130cf519dc069917ada3098ee7e86b))
* **benchmarks:** fix P6 deterministic failures in flow-commit scenarios ([22a2826](https://github.com/korchasa/flowai/commit/22a28267409c9577e48626f64892688546785529))
* **benchmarks:** handle dynamic exit_code_zero in score test ([576d9b1](https://github.com/korchasa/flowai/commit/576d9b14edbb9827289de52a68f1fdb68b873908))
* **benchmarks:** isolate sandbox with git init to prevent agent escaping to parent repo ([1c30746](https://github.com/korchasa/flowai/commit/1c30746ea4f4446a95b3e34425a5f8089c6ef2c9))
* **benchmarks:** overhaul benchmark infrastructure for reliability ([895d4f9](https://github.com/korchasa/flowai/commit/895d4f9fde59dc435c6662010ada9989a858ba68))
* **benchmarks:** pass judge evidence via file to avoid E2BIG crashes ([fac82f9](https://github.com/korchasa/flowai/commit/fac82f9e7ccd1122f0ef9dbb2db608563d15d0e7))
* **benchmarks:** switch engineer-skill/subagent scenarios to .cursor/ to avoid CLI write block ([5b1ce42](https://github.com/korchasa/flowai/commit/5b1ce4272b69af06e41e4c0a954e737393537904))
* **benchmarks:** update paths after pack migration, remove stale fixturePath overrides ([814c016](https://github.com/korchasa/flowai/commit/814c0166e88fc28cb241c500bdd21848a98881d3))
* **ci:** exclude integration tests from check (API/env dependent) ([145a126](https://github.com/korchasa/flowai/commit/145a12672bbd3145b51c87308a4a832add522cf5))
* **ci:** pass --config to deno install --global in verify-install job ([0a5a6b4](https://github.com/korchasa/flowai/commit/0a5a6b41c33668c161fde8da23b712cc494ae7ab))
* **ci:** resolve non-existent tag in release notes generation ([4fb9cfb](https://github.com/korchasa/flowai/commit/4fb9cfb6af9f9bea31e7d401afd2f67a269e2c30))
* **ci:** stop tracking generated flowai-hooks.json ([645df3e](https://github.com/korchasa/flowai/commit/645df3ec3882e1e0bd37ae1fd267a28e5209d448))
* **cli,framework:** clarify flowai sync subcommand in IDE context ([9f85a77](https://github.com/korchasa/flowai/commit/9f85a770ef857fbb7cb485a6803123d1d424dc10))
* **cli:** add explicit type annotation to cliffy action callbacks ([c489233](https://github.com/korchasa/flowai/commit/c489233779fe3b329ea997a5606d1f450236feca))
* **cli:** exclude benchmarks and test files from skill distribution ([76d2a7c](https://github.com/korchasa/flowai/commit/76d2a7c8569d95f876ab3f130a5fb0ffed5742ca))
* **cli:** resolve TS2345 in cliffy action callbacks, add deno check to task-check ([5c9b289](https://github.com/korchasa/flowai/commit/5c9b28965649277e738cd9f2bdb8a949e4e495e9))
* **cli:** run sync integration test in temp dir to avoid side effects ([d3a2053](https://github.com/korchasa/flowai/commit/d3a2053d77ec89c859c0a4739b558dd748a8bdb3))
* **config:** remove source reference from .flowai.yaml ([8946e15](https://github.com/korchasa/flowai/commit/8946e1538b18d4254bcfa38dc5c8b123a66ac530))
* correct deno fmt exclude config and sync flow-review whiteboard path ([ed4ab74](https://github.com/korchasa/flowai/commit/ed4ab74afdcdbd7a1c170e0e79fe1607c50accc7))
* **devcontainer:** fix OAuth auth, volume ownership, and error masking in templates ([9d256b3](https://github.com/korchasa/flowai/commit/9d256b379e8c3ca3a3d5ac1682dcb0345d68bd19))
* **devcontainer:** switch Claude Code install to official script, expand features catalog ([4954d73](https://github.com/korchasa/flowai/commit/4954d738dbe01c0aa70e2d1ea6d14a28c002371e))
* **devtools:** correct Claude Code rule format in engineer-rule skill ([2a56e3b](https://github.com/korchasa/flowai/commit/2a56e3bfad65e9d461e395abab34645c94e994e9))
* **docs:** correct spelling in plan.md instructions ([c83d897](https://github.com/korchasa/flowai/commit/c83d89718c7cf819634d0373afa5aea0b4263f45))
* **docs:** remove extraneous command from installation instructions in README ([4ab2137](https://github.com/korchasa/flowai/commit/4ab21379c4bee9fd01c629f9040faa94e33498de))
* **docs:** update AGENT.md references to AGENTS.md ([988d72e](https://github.com/korchasa/flowai/commit/988d72e5abd36a35878c7d213af3c2cf49074a0e))
* **docs:** update migration instructions in migrate-run-ts.md ([3f8c58a](https://github.com/korchasa/flowai/commit/3f8c58a58cbb2322c4831f32572a4c525b8b6752))
* **flowai-plan:** enable interactive mode in basic benchmark ([edc83bb](https://github.com/korchasa/flowai/commit/edc83bb56bfd76d4500c8986379969911ac54e9c))
* **flowai-review:** add deletion guard for entire directories ([2d8629f](https://github.com/korchasa/flowai/commit/2d8629f449ba42908ce1902b938d6cd50d7a396d))
* **fmt:** format benchmark file that broke CI ([8a6bff0](https://github.com/korchasa/flowai/commit/8a6bff048a4106d1fc3a945e0696878f4a797f8d))
* **framework:** use system temp dir instead of _research_tmp in deep-research skill ([6e72a0f](https://github.com/korchasa/flowai/commit/6e72a0f965278bb8b7836b66adc920725013b8f1))
* **hook:** isGitCommit handles quoted strings, -c flags, and subshells ([b3c71d3](https://github.com/korchasa/flowai/commit/b3c71d3a9f7c43dc1450776a57976c890f9d1c35))
* **install:** use full jsr: specifier for remote execution compatibility ([0da4a94](https://github.com/korchasa/flowai/commit/0da4a94955c6716b80b2667d7fab040df97a4838))
* **plan:** make critique step automatic instead of asking permission ([216724f](https://github.com/korchasa/flowai/commit/216724f4fe944f1061010ce13c38e3125b11bd11))
* **publish:** un-exclude generated artifacts from JSR publish ([0bb79f3](https://github.com/korchasa/flowai/commit/0bb79f38d88db640d4643f596ac2ab241adf7021))
* **scripts:** use jsr: specifier in generate_agents.ts; close 10 FR-21 criteria ([7d14e0a](https://github.com/korchasa/flowai/commit/7d14e0aaf29fd4b26b7d34ab9e9ef07df9d43168))
* **security:** bump next from ^14.0.0 to ^15.5.10 in benchmark fixture ([ba4e081](https://github.com/korchasa/flowai/commit/ba4e0813868644f278182b909d4e308cb6365498))
* **skill:** make asset artifact verification unconditional in flowai-update ([cc66a64](https://github.com/korchasa/flowai/commit/cc66a64368bfcbbf3558728b3865fb5815c4a401))
* **skills:** correct script path in analyze-context and remove --headed flag from playwright-cli ([e6a4a5c](https://github.com/korchasa/flowai/commit/e6a4a5ca95affafd344b5042904a9726108ffeb1))
* **update:** handle invalid YAML in parseFrontmatter gracefully ([fd477bc](https://github.com/korchasa/flowai/commit/fd477bc2bfa3e9cfa4880aa2d32c878c25dd53a5))


### Continuous Integration

* **release:** merge CI jobs into single pipeline with standard-version automation ([acbfc03](https://github.com/korchasa/flowai/commit/acbfc03c4a94402b3244a66b25386884ecab6aaf))


### Build System

* add CI integrity checks and update judge model ([6fdc340](https://github.com/korchasa/flowai/commit/6fdc340b4e0eaedda3423ef8f58aeaab7793bc1c))
* **ci:** add custom release notes generation from conventional commits ([22d5b75](https://github.com/korchasa/flowai/commit/22d5b75c250000bca34610d170c138fb61798f18))
* **ci:** pin Deno to 2.7.11 to fix fmt mismatch ([0442c1d](https://github.com/korchasa/flowai/commit/0442c1de0aa8e0eacc146cde6d0b1eb55541c2dc))
* **ci:** pin Deno to 2.7.4 and revert HTML formatting ([01a7d3a](https://github.com/korchasa/flowai/commit/01a7d3a81f4f5d49dfd499f17caec91e3598a1d5))
* **ci:** pin Deno version to 2.7.11 ([165c70f](https://github.com/korchasa/flowai/commit/165c70f7da0f557f3b446a520441085bdc7041a4))
* exclude markdown files from formatting, cleanup worktrees.json ([2c2a2fe](https://github.com/korchasa/flowai/commit/2c2a2fea6466d91d720c6c4db5a4b9aa92e64918))
* pin GitHub Actions to SHA checksums ([e47d6ea](https://github.com/korchasa/flowai/commit/e47d6ea2e244b88f72d424571df9fd7a628b559a))
* update deno.lock ([ef9543f](https://github.com/korchasa/flowai/commit/ef9543f0193e226ce62bd719764b17a716fdd605))


### Agent Changes

* add Benchmark TDD flow to project instructions ([567d515](https://github.com/korchasa/flowai/commit/567d515b760b2fd3858192eefe9a8bcd345a6517))
* add evidence links to all acceptance criteria in SRS ([d819ee4](https://github.com/korchasa/flowai/commit/d819ee4bb77ee8d1349fbb9c2427a7f9cebd107c))
* add relative paths rule to AGENTS.md and template ([605e556](https://github.com/korchasa/flowai/commit/605e556454eb40bc1073dfc23f3e724d9bd6c86e))
* **AGENTS:** update guidelines to include post-session review and evidence provision ([f3927e3](https://github.com/korchasa/flowai/commit/f3927e3ede008971910de28047e84ed65c8dd157))
* **commit-review:** separate responsibilities between review and commit, add whiteboard cleanup ([00b8a73](https://github.com/korchasa/flowai/commit/00b8a73ce3e7be77170e58a3d4ab1324d09d65aa))
* **core:** add dynamic doc discovery, whiteboard context, and parallel delegation benchmarks ([7ea34e0](https://github.com/korchasa/flowai/commit/7ea34e0a5fd7681fa43d130adca542c01df78873))
* fix inconsistent punctuation in project rules ([9138896](https://github.com/korchasa/flowai/commit/91388969495ec3e4531fdf6fbc28709115399050))
* **flow-commit:** add agent: commit type for AI config changes (FR-11) ([f11dcbc](https://github.com/korchasa/flowai/commit/f11dcbce601d651801ef09b6e5c231cc9b2fb5d5))
* **flow-commit:** add suggest-reflect step after commit ([4e44b9c](https://github.com/korchasa/flowai/commit/4e44b9c70d6d7526f0e211eb9947d42da4fd8042))
* **flow-engineer-hook:** add cross-IDE hook docs and benchmarks (FR-14, FR-15, FR-16) ([202657e](https://github.com/korchasa/flowai/commit/202657e1dbbf5e1b479d2c0eb9e643605aa08f44))
* **flow-review-and-commit:** implement composite review+commit command (FR-18) ([5e512cf](https://github.com/korchasa/flowai/commit/5e512cf23b9ed58112c68b3321692ecb3933e545))
* **flow-review:** inline workflows in composite skill, add sync check and benchmarks ([f804d83](https://github.com/korchasa/flowai/commit/f804d8304d93fd72eb0eb678eb7774ac90884fa2))
* **flow-skill-setup-ai-ide-devcontainer:** add devcontainer skill, update FR-10/FR-20 requirements ([0408c38](https://github.com/korchasa/flowai/commit/0408c38dd0e8ba2395d8cd2cd9da00c16b472c43))
* **flowai-commit:** add missing CLAUDE.md symlink in dynamic-doc-list fixture ([bbd29a7](https://github.com/korchasa/flowai/commit/bbd29a755b9a81acc2bfe4ad7aa33f8163d9d117))
* **flowai-reflect:** add cross-session pattern analysis ([f11f432](https://github.com/korchasa/flowai/commit/f11f4324efa2a577596414a5586fffcb4585a9ab))
* maintenance — fix flow-* naming, improve skill instructions, add JSDoc ([de8e700](https://github.com/korchasa/flowai/commit/de8e70001c40474105cd9c456492d8447fefba82))
* replace bare @std/ specifiers with jsr: for standalone script independence ([be2839f](https://github.com/korchasa/flowai/commit/be2839f91cad7d3885a1a225e30d5ced36f09c98))
* replace flow-qa with flow-review combining QA and code review roles ([4149a7b](https://github.com/korchasa/flowai/commit/4149a7b8a2240362c1205e86cd16fc10c3e148b5))
* resolve IDE support scope to 3 IDEs (FR-17) ([5355740](https://github.com/korchasa/flowai/commit/5355740b4615d0e8da9ccaa13a6d6212a962ce7e))
* use portable <this-skill-dir> placeholder for bundled script paths ([07b005d](https://github.com/korchasa/flowai/commit/07b005d203a9764101131d41e99d502eb0bd0f67))


### Styles

* **agents:** normalize markdown formatting in agent definitions ([b1bc8d1](https://github.com/korchasa/flowai/commit/b1bc8d1ece5b9a489ed20b1f0866063e8e31c720))
* apply deno fmt formatting ([14a4480](https://github.com/korchasa/flowai/commit/14a448056591c749b0af7105200f6f4bf489bf6f))
* **benchmarks:** apply deno fmt formatting ([5e4d78d](https://github.com/korchasa/flowai/commit/5e4d78ddfb317936c46d11f70a98842b1d05406c))
* **benchmarks:** fix quote consistency in consolidate scenario ([3b8d006](https://github.com/korchasa/flowai/commit/3b8d006f800ecf9a387451aca5d134dd780589f0))
* **cli:** fix formatting after merge conflict resolution ([5b5384a](https://github.com/korchasa/flowai/commit/5b5384aff06e5916a8823ee47b7e364050d5273e))
* **cursor:** add dependency injection rules for TypeScript classes ([e388495](https://github.com/korchasa/flowai/commit/e38849505fd91190b351563d48cc247882500d64))
* **cursor:** unify headings and formatting in rules and commands ([f6eedc5](https://github.com/korchasa/flowai/commit/f6eedc5be477f69ecc409f9fc061ffb3d2189c01))
* fix trailing whitespace in deno-cli skill ([b1ba46c](https://github.com/korchasa/flowai/commit/b1ba46c6ceff064af92e8bd01fa59266bc1b07bf))
* format benchmark code ([0136679](https://github.com/korchasa/flowai/commit/0136679876e3bc161e21ebafb9fb25685f578faa))
* format cursor skills and agents documentation ([8dc8693](https://github.com/korchasa/flowai/commit/8dc869338c0b2c0dcbea1620028d1d14db63b3d4))
* reformat HTML assets for current Deno fmt rules ([b1739a3](https://github.com/korchasa/flowai/commit/b1739a3634739b72a54bc31b0f1791b280bd1093))
* reformat HTML assets for Deno 2.7.11 fmt rules ([446e2ed](https://github.com/korchasa/flowai/commit/446e2ed220c3bec2eeb56a2e445a49fdbace13e4))
* remove backticks from todo_write in SKILL.md files ([4e62f0d](https://github.com/korchasa/flowai/commit/4e62f0d908ecdfce3857640d4209755400ebe4cb))
* remove emojis from benchmark writing skill ([f72e456](https://github.com/korchasa/flowai/commit/f72e4563ac51d753f85fdf0fc6228a0e8ac90404))
* sync .claude/ from framework and apply formatting fixes ([bec1efb](https://github.com/korchasa/flowai/commit/bec1efbcde39f19cbb59549447fc19b5268d7cc9))


### Chores

* add session-init-docs hook config, format memory files ([8f5909d](https://github.com/korchasa/flowai/commit/8f5909d44617f542f244da26b8b719c018b3da4b))
* add worktrees configuration ([985a756](https://github.com/korchasa/flowai/commit/985a75672783c4022109a1c161d4616a7d084400))
* **benchmarks:** tune scenario timeouts, interactive mode, and params ([9eab6b3](https://github.com/korchasa/flowai/commit/9eab6b31ef71424cfb60fb55f5d34073efc4e81f))
* cleanup obsolete rules and update task command instructions ([6034fca](https://github.com/korchasa/flowai/commit/6034fca04ca56796ac5349f842468025e3e8649e))
* **commands:** move build CLAUDE to alpha draft ([107cdfe](https://github.com/korchasa/flowai/commit/107cdfec04029fdb868d0e6fe7652caf9e4dfbb7))
* configure sessionDocs for session-init-docs hook ([767b75f](https://github.com/korchasa/flowai/commit/767b75ff77c2634173fad535372a8e57b9bbb139))
* configure sessionDocs for session-init-docs hook ([c2ab3ec](https://github.com/korchasa/flowai/commit/c2ab3ec3d58af1d791fe8d7ccc37470323d89419))
* **cursor:** update commands and add Dockerfile rules ([773c1d1](https://github.com/korchasa/flowai/commit/773c1d18be321c504786a8769690dfbebaccc46b))
* **framework:** update flowai framework ([85785f0](https://github.com/korchasa/flowai/commit/85785f0291b32a411f0592f9a4a77477fbca2376))
* **framework:** update flowai framework ([a36e2d1](https://github.com/korchasa/flowai/commit/a36e2d184bef37f1e6b5e491677ee2a5aaa06459))
* **framework:** update flowai framework ([1c76d18](https://github.com/korchasa/flowai/commit/1c76d18db893ced8cd08c057acdf97ac42523c3d))
* **framework:** update flowai framework ([f1eb946](https://github.com/korchasa/flowai/commit/f1eb946660ef312029053835ebb915030f9824b1))
* **framework:** update flowai framework to 0.4.18 ([7ea38d0](https://github.com/korchasa/flowai/commit/7ea38d011fa27e37a59c50dcc3f7d654844f23fa))
* gitignore pipeline runs and update flowai config ([5de6f90](https://github.com/korchasa/flowai/commit/5de6f90d1b3e9a27668024f005fe4ac9b4510245))
* maintenance sweep — refactor trace.ts, fix design.md, add AGENTS.md and JSDoc ([db8f09c](https://github.com/korchasa/flowai/commit/db8f09cf917098faab49bb086fabdd269eaea734))
* **release:** 0.3.0 ([c30b32d](https://github.com/korchasa/flowai/commit/c30b32d76d2bcebbe3f8334836ae05cb4f3b0033))
* **release:** 0.3.1 ([969cf65](https://github.com/korchasa/flowai/commit/969cf656251ba70cef1141584b009bacb95fa253))
* **release:** 0.3.2 ([8708735](https://github.com/korchasa/flowai/commit/8708735f2c05181e54103ad805f1f281b7e4a802))
* **release:** 0.3.3 ([80fa147](https://github.com/korchasa/flowai/commit/80fa1470eed7b4dbdc962b0e6b55351c9b353503))
* **release:** 0.3.4 ([3718677](https://github.com/korchasa/flowai/commit/371867786107c0ccef134e1562599cbe6faa74cc))
* **release:** 0.3.5 ([57c9c6d](https://github.com/korchasa/flowai/commit/57c9c6df5884fd210141d04aa65f1ff2a3688426))
* **release:** 0.3.6 ([39500cd](https://github.com/korchasa/flowai/commit/39500cdf263bf086b2b54d961fd5e74b65c2642e))
* **release:** 0.3.7 ([0071ef2](https://github.com/korchasa/flowai/commit/0071ef24f98627ae7d5294bf3d0012e17557ec00))
* **release:** 0.3.8 ([4a0ff3f](https://github.com/korchasa/flowai/commit/4a0ff3f231be94e23f89c89d44fb22a670827d5d))
* **release:** 0.3.9 ([9def3c1](https://github.com/korchasa/flowai/commit/9def3c1db450aaa72d4aa986a6aa283a048039f6))
* **release:** 0.4.0 ([9b2d943](https://github.com/korchasa/flowai/commit/9b2d94387ebed6adcece9c30f315056e79aa596c))
* **release:** 0.4.1 ([75b8299](https://github.com/korchasa/flowai/commit/75b8299d835dc569e0c59f26850fc1a13bd328e6))
* **release:** 0.4.10 ([eb97966](https://github.com/korchasa/flowai/commit/eb9796696fb8669875a32b657a76bb4d922e07e7))
* **release:** 0.4.11 ([69ea503](https://github.com/korchasa/flowai/commit/69ea503d600b2d4b6f65de8626907937c040c7ab))
* **release:** 0.4.12 ([74d2f3b](https://github.com/korchasa/flowai/commit/74d2f3bb8f8bbfaca6bf5ba24d5070a3caecd65c))
* **release:** 0.4.13 ([8799598](https://github.com/korchasa/flowai/commit/87995987f52c9e4e6f3eaaa1a6d7c0d6f7c80abf))
* **release:** 0.4.14 ([c90d432](https://github.com/korchasa/flowai/commit/c90d432a4b20e4cb14fb804a93b010bce508db6d))
* **release:** 0.4.15 ([019a943](https://github.com/korchasa/flowai/commit/019a9430b63a58ab08ccb4fe5216ea43099e5e3a))
* **release:** 0.4.16 ([2003f0f](https://github.com/korchasa/flowai/commit/2003f0f325d229baeaf03a405188809e7b2a4599))
* **release:** 0.4.17 ([26d00e6](https://github.com/korchasa/flowai/commit/26d00e6dd8428f8a1a56d5fffd4acef3904bf109))
* **release:** 0.4.18 ([b2613e5](https://github.com/korchasa/flowai/commit/b2613e541d6020353edd5166ecde060332835dd6))
* **release:** 0.4.19 ([18f8d25](https://github.com/korchasa/flowai/commit/18f8d25c2430841b5afd9d429684cc7fb3b05b16))
* **release:** 0.4.2 ([cecef7c](https://github.com/korchasa/flowai/commit/cecef7c7feb2ef531bbde6fd5af965b724ea8141))
* **release:** 0.4.20 ([e3f287f](https://github.com/korchasa/flowai/commit/e3f287ffc3bb4b730731cc828ec54a294b782eee))
* **release:** 0.4.3 ([d1b5e62](https://github.com/korchasa/flowai/commit/d1b5e6295bcec192989ed03f3f0d320ae244589a))
* **release:** 0.4.4 ([27435d0](https://github.com/korchasa/flowai/commit/27435d0bc1e9aa63904b172f2f014a197b954d71))
* **release:** 0.4.5 ([4629ce9](https://github.com/korchasa/flowai/commit/4629ce96d7c23f1e290b7f5789d7639f47fb3e82))
* **release:** 0.4.6 ([239e908](https://github.com/korchasa/flowai/commit/239e90877d85ff130acd832f7bef5fe16fb1adb8))
* **release:** 0.4.7 ([db68a26](https://github.com/korchasa/flowai/commit/db68a2669309d8a1379e2df32ac0676795f63bbe))
* **release:** 0.4.8 ([c5538be](https://github.com/korchasa/flowai/commit/c5538beaa727911ce74cb30005d8dada2561c3b0))
* **release:** 0.4.9 ([f920c42](https://github.com/korchasa/flowai/commit/f920c423ddc0f72e80db57be9230d3104c4ef0e6))
* remove .claude/ from tracking and add to .gitignore ([41b7a20](https://github.com/korchasa/flowai/commit/41b7a207712b9378e1a5d37245ef4fb338010394))
* remove .flowai/runs/ from tracking ([c476da3](https://github.com/korchasa/flowai/commit/c476da35a88647de3d1e826ece78fb3e41adb928))
* remove deprecated commands and rules ([d35ff91](https://github.com/korchasa/flowai/commit/d35ff9159dd3ab3a1aad1d920f31f9185330023d))
* remove deprecated settings.json and whiteboard.md files ([099dec0](https://github.com/korchasa/flowai/commit/099dec056c3e366f9a1da06cb335f3fa3b12b7b9))
* remove flowai-skill-example and prevent re-creation ([e900e3e](https://github.com/korchasa/flowai/commit/e900e3e74ee5fdede74bad6f2fec25bfbfbf4d6e))
* remove obsolete R&D tasks format documentation ([96bb277](https://github.com/korchasa/flowai/commit/96bb27799fc03f5cf2908594fc60acc257235652))
* remove write-skill command ([c099095](https://github.com/korchasa/flowai/commit/c099095c935357ec322262b508143f071f2adc90))
* **scripts:** add IDE environment detection utility script ([6261118](https://github.com/korchasa/flowai/commit/62611187972ba799669d4fcc2fd3cee77196e90f))
* sync framework skills/agents via flow-cli ([2a6db9a](https://github.com/korchasa/flowai/commit/2a6db9a070f47c0b15cdfbb7571856a393e56e7b))
* update .gitignore and add .cursorignore ([800f44a](https://github.com/korchasa/flowai/commit/800f44a1c90cba60be40b2eb276b975bc197d8d9))
* update .gitignore and enhance README with new command descriptions ([8ec97a5](https://github.com/korchasa/flowai/commit/8ec97a5e846b701f2281f0b3bf3fd1a0158f7e66))
* update .gitignore to ignore .vscode ([553c382](https://github.com/korchasa/flowai/commit/553c382ca7bccc677a06bb090e1ef063719fbde3))
* update .gitignore to ignore documents directory ([5a4ee0b](https://github.com/korchasa/flowai/commit/5a4ee0b277047079e8adbfd1568aec1a9acf0a16))
* update flow-cli submodule (PATH docs) ([70671e8](https://github.com/korchasa/flowai/commit/70671e8a28ced0714b03de75ec9b1672bb5c9cdd))
* Update project files and add README.md ([1cb69ba](https://github.com/korchasa/flowai/commit/1cb69baace274ed8c00a131309d265363257540b))
* update repo scaffolding and cleanup ([324ce4e](https://github.com/korchasa/flowai/commit/324ce4e59a416475269a60151340184a93f0d25b))
* update repo URL korchasa/flow → korchasa/flowai ([6b348ac](https://github.com/korchasa/flowai/commit/6b348acb1c1ac10603e671a1075e9cb4d5ae7c15))
* **vscode:** remove .vscode/settings.json ([5fedb82](https://github.com/korchasa/flowai/commit/5fedb82e652d8bedebe20b949679520c79d28e48))


### Tests

* **af-init:** add idempotency benchmark scenario ([f24edaf](https://github.com/korchasa/flowai/commit/f24edaf687c71c41261e6548725fec5661061a63))
* **bench:** add adapt-all benchmark for full primitive adaptation ([fdcf66c](https://github.com/korchasa/flowai/commit/fdcf66cee10d791e3636a66dec69eb9a098cc278))
* **bench:** add af-init benchmarks and fix runner ([fc90452](https://github.com/korchasa/flowai/commit/fc90452b388a2196e71b3866fa64081257ba6fe1))
* **benchmarks:** add auto-docs scenarios and .flowai.yaml config ([5c98036](https://github.com/korchasa/flowai/commit/5c98036a269d173010c3a282d95a50cc86c03b85))
* **cli:** add commands field to FlowConfig fixtures in main_test ([76fc2bc](https://github.com/korchasa/flowai/commit/76fc2bc332637e4886ae0758fb663af072c6663a))
* **flow-review-and-commit:** add suggest-reflect benchmark scenarios ([bb9010a](https://github.com/korchasa/flowai/commit/bb9010a251c8c27d1f58294c9a45db2a56d38b8f))


### Code Refactoring

* adapt trace generator to tasks.guru style and colors ([8590369](https://github.com/korchasa/flowai/commit/85903695892c7c1e733e8411da3dd8a4626f1dd8))
* add flowai- prefix to all framework hooks and agents ([582914e](https://github.com/korchasa/flowai/commit/582914e744e19245f3196e20a47c4c28a32f7257))
* **af-commit:** simplify atomic commit rules for logical grouping ([bee11e6](https://github.com/korchasa/flowai/commit/bee11e6a08c86747139e0702e2bd35446e33c275))
* **af-commit:** update commit rules and instructions ([410140e](https://github.com/korchasa/flowai/commit/410140e5238b96a78e89b26c70b2940c93935655))
* **af-plan:** deduplicate planning rules, reference AGENTS.md ([cc5cabd](https://github.com/korchasa/flowai/commit/cc5cabde74de02552bd696e506cd87fd9a70d011))
* **agent:** restrict flowai-skill-adapter to Bash-only tools ([6516bb5](https://github.com/korchasa/flowai/commit/6516bb56abd134a3e9d29af14d07c512b18c05c5))
* **agents:** remove explicit model declarations from agent frontmatter ([db909cc](https://github.com/korchasa/flowai/commit/db909ccfd114540f36c57d3425dcf2ac4db2cb47))
* **agents:** restructure to per-IDE subdirs with frontmatter validation ([8684dbb](https://github.com/korchasa/flowai/commit/8684dbb71f71d9d450b8540332fc8da27fd14894))
* **agents:** update flow-skill-executor ([8f15742](https://github.com/korchasa/flowai/commit/8f15742a5d591f657227b6d89794f4da83bd0ade))
* **benchmarks:** expand benchmark coverage and compress docs to reference benchmarks ([455c6a2](https://github.com/korchasa/flowai/commit/455c6a237fea82a1cad87c095105e47c39c674f1))
* **benchmarks:** improve judge evidence, fix score calculation, add safety ([5cccd5b](https://github.com/korchasa/flowai/commit/5cccd5b32101ccf6e4ccf9f1d4df01c2329df8e8))
* **benchmarks:** migrate to @bench/ import map and clean up checklist types ([aee77db](https://github.com/korchasa/flowai/commit/aee77db8b73241fccb153909960ed9a41cd999f0))
* **benchmarks:** require agentsTemplateVars, remove legacy agentsMarkdown ([4668f65](https://github.com/korchasa/flowai/commit/4668f656d6e8fed074499afe857795e11ecf8f84))
* **benchmarks:** split trace.ts into modular architecture ([83107ea](https://github.com/korchasa/flowai/commit/83107ea1c00c811671cfbf51e3d606247f4fec6d))
* **catalog:** remove flow-execute and flow-plan agents ([8162464](https://github.com/korchasa/flowai/commit/8162464265cb46c0ebc6b29263394c345027e10d))
* **catalog:** remove flow-skill-debug-by-playwright ([c2d338d](https://github.com/korchasa/flowai/commit/c2d338dbcc43360e7530e411aef137df21799150))
* **catalog:** update flow-do, flow-engineer-subagent, flow-execute, flow-auto skills ([a8599b5](https://github.com/korchasa/flowai/commit/a8599b5ca9a0d24216a44b767c482571a933f081))
* **catalog:** update flow-init skill and AGENTS template ([e583524](https://github.com/korchasa/flowai/commit/e583524296d121f4d822c91dd1d760b2b5829e43))
* **catalog:** update flow-maintenance and flow-reflect skills ([765eba9](https://github.com/korchasa/flowai/commit/765eba96b3cc223d6818622130c4dfb117715de9))
* **catalog:** update flow-skill guides ([7fd2976](https://github.com/korchasa/flowai/commit/7fd2976ae6dcc11adc20629ab6377923c47ccab1))
* **cli:** extract local sync into standalone deno task ([2e4965d](https://github.com/korchasa/flowai/commit/2e4965d52a505f9a8413aaab7be7ef49b7ae9317))
* co-locate benchmarks with skills (FR-7.1) ([0927be7](https://github.com/korchasa/flowai/commit/0927be72625539de01a27622496b910dc510893b))
* **commands:** consolidate planning workflows and enhance GODS framework ([14a4afa](https://github.com/korchasa/flowai/commit/14a4afabaddc66226163d529d529ab208891f0b5))
* **commands:** drop task prefix from command files ([8ca231b](https://github.com/korchasa/flowai/commit/8ca231b9c35c736c3c2a6f705e497aa09b447613))
* **commands:** integrate BED-LLM algorithm details into workflow steps ([e9664e0](https://github.com/korchasa/flowai/commit/e9664e0c464896522e821b1dbd2fe6424b6fce50))
* **commands:** remove AskQuestion tool references ([730f2c4](https://github.com/korchasa/flowai/commit/730f2c4c56b7d56da062bbb2feca6a4499f9e1d9))
* **commands:** remove plan-and-execute command ([4c7b591](https://github.com/korchasa/flowai/commit/4c7b5914569bebf6e3eee4e07479af2fe83020a6))
* **commands:** remove unused command files and update documentation ([7285577](https://github.com/korchasa/flowai/commit/72855774b208b163700dc83e0a81c6924aec4fc2))
* **commands:** rename alpha-task-build-claude-md to task-build-agents-md ([3407e1a](https://github.com/korchasa/flowai/commit/3407e1a8ecb41a38c8c368ed113f5d2732855284))
* **commands:** rename validation checklist to verification ([8e55e48](https://github.com/korchasa/flowai/commit/8e55e4872fd53fec8d7f5bbeec8e7ebe48f1d182))
* **commands:** reorganize investigation and analysis workflows ([7238aab](https://github.com/korchasa/flowai/commit/7238aab0f07ed6db9e50ed4225ffe128746da229))
* **core:** remove flowai-skill-executor agent ([6d2a96b](https://github.com/korchasa/flowai/commit/6d2a96bf15dda71d2ddf06a2e9748eadb08d425e))
* **cursor:** convert GODS rule to how-to guide ([673c88d](https://github.com/korchasa/flowai/commit/673c88d3698c24a5c1574ee8f89846ca53fda824))
* **docs:** remove standalone vision.md, consolidate into AGENTS.md ([c1e2dfc](https://github.com/korchasa/flowai/commit/c1e2dfcaa4fa1124cbf8f99ce26e57a57fff661f))
* **flow-init:** make TDD commands in AGENTS.template generic ([8e9ab34](https://github.com/korchasa/flowai/commit/8e9ab34e089b002acb79faed1c3e99c7b2b8c004))
* **flow-init:** merge analyze/inventory/verify into single script output ([f77ea17](https://github.com/korchasa/flowai/commit/f77ea1723bbc53c8f6700d57210511cef3decda2))
* **flow-init:** replace manifest-driven generation with agent-native approach ([f7f6a07](https://github.com/korchasa/flowai/commit/f7f6a079305407a4eaf618ed6140b3ab897ed4e3))
* **framework:** remove adapted frontmatter field ([ba887ff](https://github.com/korchasa/flowai/commit/ba887ff416ab4554ee6cc14bfb3b8ce167f4b20f))
* **framework:** remove flow-skill-ai-skel-ts (moved to ai-skel-ts library) ([5e6a304](https://github.com/korchasa/flowai/commit/5e6a304aab9d960b9b3388d68996c03b297f79cd))
* **framework:** split commands from skills into sibling dirs ([fa8beb2](https://github.com/korchasa/flowai/commit/fa8beb21a06987825ef30c3c5a9c8cf3f951b1da))
* **install:** remove shell bootstrap and fix process hang on exit ([8cad430](https://github.com/korchasa/flowai/commit/8cad430f7d8a999c6874f6db0a15a95bd7193288))
* merge flow-cli submodule into monorepo ([eb6d983](https://github.com/korchasa/flowai/commit/eb6d9836023e7e10b837136fa202726e4a34bbe1))
* **pipeline:** add flowai- prefix to all pipeline pack primitives ([bd5ef53](https://github.com/korchasa/flowai/commit/bd5ef537fa8c3d05f2ce3cf6b2b10f4142b95d80))
* **pipeline:** rename .flow/ to .flowai/ and move engineer-pipeline skill ([19cb55b](https://github.com/korchasa/flowai/commit/19cb55b2ddeab8cec9debbd0db60637862a1bd20))
* **pipeline:** rename automation→pipeline pack, inline PM into orchestrator, fix test-fitting in benchmarks ([97a3639](https://github.com/korchasa/flowai/commit/97a3639cf1d03d1a0adc8eb4732d2ab3340d8706))
* **project:** reorganize file structure into .cursor/ directories ([8b46177](https://github.com/korchasa/flowai/commit/8b46177de97a71f3a7690b2b1174a53837993a24))
* reclassify skill types — engineer→skill, setup→setup-agent ([ff1b347](https://github.com/korchasa/flowai/commit/ff1b347c79f9e6fef07df744478cd2687b034cd5))
* remove flowai-session-init-docs hook and sessionDocs config ([74b4b70](https://github.com/korchasa/flowai/commit/74b4b70eac8275c45000eb52f9c2e717e743bd43))
* remove flowai-session-init-docs hook and sessionDocs config ([f2f6455](https://github.com/korchasa/flowai/commit/f2f64555eef871d27b7fbc709d7458a785d9c6a6))
* remove lint-on-write and test-before-commit from framework hooks ([ae26c5a](https://github.com/korchasa/flowai/commit/ae26c5ac69e212f995c703dbcb382a71c84eede8))
* remove lint-on-write and test-before-commit from framework hooks ([47d39fa](https://github.com/korchasa/flowai/commit/47d39fa1fb521b6f4322c8bd6537a16ebfe947ad))
* remove pipeline pack and all references ([bb1a1d1](https://github.com/korchasa/flowai/commit/bb1a1d1b907a445f3d52c617b023e9ae034465bb))
* remove settings.json to simplify configuration ([311a8b9](https://github.com/korchasa/flowai/commit/311a8b935dbe5f8a2df77e7ef1e8a0017f2c2bb8))
* rename af-* prefix to flow-* ([da1e32b](https://github.com/korchasa/flowai/commit/da1e32b2ab7e84a6fba9e470fc5071e9f14058dd))
* rename agents to flow-* convention and update references ([91023e2](https://github.com/korchasa/flowai/commit/91023e2799d3619061e95fd2069fb810c255eb21))
* rename AssistFlow to flowai across the project ([b1b42eb](https://github.com/korchasa/flowai/commit/b1b42eb4adb05ee50980f97034a2f3ea7a5112fc))
* rename catalog/ to framework/ ([f6ab187](https://github.com/korchasa/flowai/commit/f6ab1876a070aa6391acaf3433cdf878a2970963))
* rename create-deno-scripts command to create-scripts ([649ccd4](https://github.com/korchasa/flowai/commit/649ccd4f089aa1909cdf5b780a85aa6a5f0e7da5))
* rename Deno skills to follow flow-skill-* convention ([01d8ca8](https://github.com/korchasa/flowai/commit/01d8ca8161ec64998b3a9e517ef309ec078cb0d9))
* rename flow-cli → flowai ([218bdc5](https://github.com/korchasa/flowai/commit/218bdc5f2c21a50b9ea0579a8f7acc622348e1d6))
* rename test files to Deno _test.ts convention ([b41b97b](https://github.com/korchasa/flowai/commit/b41b97b34a8f79500ae480bc3159330c20f64420))
* rename whiteboards to tasks, flowai-spec to flowai-epic ([58739e8](https://github.com/korchasa/flowai/commit/58739e8d67a311e9e4ce258166483a81a0736c06))
* replace flow-skill-configure-strict-typescript with setup-code-style ([7938015](https://github.com/korchasa/flowai/commit/7938015af66ee825781f95bf21dd998f3a1a30f9))
* replace session-start doc reading with per-skill lazy SRS/SDS instructions ([06fa516](https://github.com/korchasa/flowai/commit/06fa516608b9bb677e39eb8e23d50072ad6fb0b2))
* **rules:** migrate .mdc files to directory-based RULE.md structure ([be73683](https://github.com/korchasa/flowai/commit/be73683abbd9aa3a44fab4d251ae35b7d1c4d261))
* **rules:** remove iOS-specific requirements from main-example rule ([b901ab4](https://github.com/korchasa/flowai/commit/b901ab45d0d2137738f88c36a276ca1b3fbcaabf))
* simplify .gitignore by consolidating .claude entries ([ef5b62b](https://github.com/korchasa/flowai/commit/ef5b62bd0816be3ba404a919e84edf64a9923855))
* **skills:** generalize task management tool description ([1754223](https://github.com/korchasa/flowai/commit/17542235b7639056f451f667d6644129b765f9be))
* **skills:** make flowai-init/flowai-update stack-agnostic for command configuration ([716c4e5](https://github.com/korchasa/flowai/commit/716c4e55a2e1c75bd983b40808bdc1b2ecbe7517))
* **skills:** remove flow-do and flow-execute, superseded by AGENTS.md rules ([c8fde03](https://github.com/korchasa/flowai/commit/c8fde033a67f5b1f6e01abdd5c25587e6481bfd5))
* **skills:** remove obsolete flow-auto and flow-convert-cursor-to-claude skills ([d55f608](https://github.com/korchasa/flowai/commit/d55f60894401c769e8074efb59a5e99358232de3))
* **skills:** rename flow-skill-manage-github-tickets-by-mcp → flow-skill-manage-github-tickets ([cc1bad0](https://github.com/korchasa/flowai/commit/cc1bad029c0d5b4e3779e78b5f5b7078240b6d95))
* **skills:** rename flow-skill-playwright-cli → flow-skill-browser-automation ([bd310b8](https://github.com/korchasa/flowai/commit/bd310b869f3ebb735c7d8d8d9cbb69db0a03a585))
* streamline task-create-command.md for clarity and structure ([c806078](https://github.com/korchasa/flowai/commit/c806078f49f42ffaf2d67afb95c3c2b1af53d62a))
* **task-link:** create per-item symlinks from .dev/ and framework/ into IDE dirs ([b3e7c66](https://github.com/korchasa/flowai/commit/b3e7c66981fcb860512702b422eabdf243f2e8a0))
* update do command steps for clarity and verification ([cf48c4c](https://github.com/korchasa/flowai/commit/cf48c4c3bb2edf29a62a6cc7b20e34e42ca2a914))
* update fix attempt rules to use 5-why analysis ([7ce1578](https://github.com/korchasa/flowai/commit/7ce15785f937abc39c87f6406ac4f0a1ebe36d8a))


### Documentation

* add benchmark test-fitting and static mocks rules, clarify cross-pack ref checker ([7c6359b](https://github.com/korchasa/flowai/commit/7c6359be366579517e036c17eb150ddb6b5474cc))
* add CODE STYLE RULES for Go (Golang) ([e2f806d](https://github.com/korchasa/flowai/commit/e2f806df97fa9aa3c2992deec578b68d4cae44db))
* add code-style-typescript-deno.mdc with TS strict rules and Deno import guidance ([950352c](https://github.com/korchasa/flowai/commit/950352cdb1bf8b5c19a97f2177d1c56983695047))
* add deno-cli and deno-deploy to skill coverage matrix ([acd09fb](https://github.com/korchasa/flowai/commit/acd09fb1badc6734e412a7f56b7f45ecd1b5919b))
* add descriptions to command files for clarity and guidance ([89beca2](https://github.com/korchasa/flowai/commit/89beca27671472bfdbc3fe5a05e50cb22e89eec6))
* add flow-review-and-commit command and FR-18/FR-19 requirements ([60fb47b](https://github.com/korchasa/flowai/commit/60fb47bbf0531af7810516ad1c982f438abd340e))
* add guidelines for writing Product Requirements Documents (PRD) ([3548cf0](https://github.com/korchasa/flowai/commit/3548cf0858d667c6e07bf95c70ec5e3e7750c4d4))
* add IDE comparison and research documents ([dfa1821](https://github.com/korchasa/flowai/commit/dfa18214d9f8843e3e09f5141928d50e09445da8))
* add JSDoc to benchmark lib, rewrite scripts/AGENTS.md, clean up duplicates ([baf950e](https://github.com/korchasa/flowai/commit/baf950ee9546d07e45c4238146fa1cdb2d3c7411))
* add local check requirement for CI/CD edits ([49e3aa2](https://github.com/korchasa/flowai/commit/49e3aa27a7050876fba20efb512b99b976b59452))
* add logic-focused testing rule to AGENTS.md and template ([a7c8c16](https://github.com/korchasa/flowai/commit/a7c8c1657bedc7445a2ba1a150d736a60bb05902))
* add maintenance report to whiteboard ([7b0473d](https://github.com/korchasa/flowai/commit/7b0473dde820fb3f55982ead3f000d86ab185b35))
* add PoC rules and update task-answer command ([66faf13](https://github.com/korchasa/flowai/commit/66faf13e683d99fe9c17352076f7961285957162))
* add Product Vision Document creation command and guidelines ([3bb9386](https://github.com/korchasa/flowai/commit/3bb93865188bc512be250b00f3d11d810486ff3c))
* add Reference-First planning rule to AGENTS.md ([06a3ca7](https://github.com/korchasa/flowai/commit/06a3ca7bd895ae2b01c84a32981ddbd568c40c44))
* add task planning and Q&A session guidelines ([e8f8c61](https://github.com/korchasa/flowai/commit/e8f8c612b1a96a8f1db88616fac2777696965807))
* add task-create-rule.md for Cursor IDE rule development ([3d02338](https://github.com/korchasa/flowai/commit/3d02338019a8f580f03b120b5796647c913d8a35))
* add task-write-skill.md for IDE Skill file creation ([8c7229a](https://github.com/korchasa/flowai/commit/8c7229a4a84c7a7a78fac7b0a72d4204205b48cb))
* **af-do:** clarify skill overview description ([4ec5488](https://github.com/korchasa/flowai/commit/4ec5488cc5c08d0aff1d1e6ce7890ed42beac30e))
* **AGENTS.md:** add TypeScript LSP plugin caveat for export ordering ([832a36c](https://github.com/korchasa/flowai/commit/832a36c5294a6f900143edea77908c9ea1da623e))
* **agents:** clarify TDD RED step scope ([df881c4](https://github.com/korchasa/flowai/commit/df881c4bd82fcd6140c84c87719f7ba8a19321fb))
* **agents:** reformulate session-start doc reading rule ([5b21688](https://github.com/korchasa/flowai/commit/5b21688e38296628b8b40d279d1c5b0bbf5ac54d))
* **agents:** update whiteboard references to per-session whiteboards directory ([2153967](https://github.com/korchasa/flowai/commit/21539671e3757273f6e86bb82ea3df58574d2c6e))
* allow Russian in whiteboard.md ([8bde511](https://github.com/korchasa/flowai/commit/8bde511d10728ff15b72e150a59976ee2bfefc15))
* **bench:** enhance README with Docker isolation details and improved benchmark execution instructions ([be05f93](https://github.com/korchasa/flowai/commit/be05f937e77aa9a5e9983c68561d357e3b76b848))
* clarify documentation language requirements in RULE.md ([11520d5](https://github.com/korchasa/flowai/commit/11520d57412fe4ab5522a94605940aea7bbd05a7))
* clarify GIT_PAGER usage in task-commit.md ([f260fbf](https://github.com/korchasa/flowai/commit/f260fbfa73dd8c2bcbc01c065b6560feadcb3948))
* clean whiteboard — only remaining TODO items ([1a222f3](https://github.com/korchasa/flowai/commit/1a222f363611b002e158785c43fe902c445e4143))
* cleanup docs and tighten commit workflow guidelines ([33e1305](https://github.com/korchasa/flowai/commit/33e13057b104524068b44bd14a962daae87cb9ea))
* clear whiteboard after session ([cfd1531](https://github.com/korchasa/flowai/commit/cfd153154a3f6887f3c33f5a92e448e372423dae))
* **commands:** clarify commit and planning workflows ([7c1b725](https://github.com/korchasa/flowai/commit/7c1b725e86e111ab1fe582c7db2c3aa27bb2eb61))
* **commands:** sync task plan and do checklist ([2a5ff04](https://github.com/korchasa/flowai/commit/2a5ff04f215ff095507b76701e5a892df8a766c4))
* **cursor-desktop-guide:** add readonly field to subagent frontmatter schema ([8236012](https://github.com/korchasa/flowai/commit/8236012de0c2e81670710a3aae28445eea41e9cd))
* **cursor:** add task workflow docs and code style guidelines; remove legacy rules file ([217a4b1](https://github.com/korchasa/flowai/commit/217a4b1029da30eb92da10c5ce54254698d33ae2))
* delete CLAUDE.md ([0f4af28](https://github.com/korchasa/flowai/commit/0f4af283041a32cdbd7d96837a8f8256b22b13a8))
* enhance ides-difference documentation with dedicated AI ignore files and migration options for Claude Code ([3bf995e](https://github.com/korchasa/flowai/commit/3bf995e107c1e94ad97e00a1dd0a120d0634fb09))
* enhance README and AGENTS.md with developer workflow and agent reference ([b8b2333](https://github.com/korchasa/flowai/commit/b8b23338c44223623a1e4ad8ba43af5fbaf3a448))
* enhance README with comprehensive component lists and fixes ([231f8dc](https://github.com/korchasa/flowai/commit/231f8dcad37590d3ac52a86818e05de7dcd2f85b))
* enhance task planning guidelines in task-plan-with-qa.md ([2e01804](https://github.com/korchasa/flowai/commit/2e01804ae23c5f85c1764b35abecdd66875098da))
* enhance task-execute.md for improved clarity and consistency ([c5ef2ab](https://github.com/korchasa/flowai/commit/c5ef2ab06e207c05d49a15593e5d053c75159f72))
* expand documentation philosophy in README and update SRS ([1fbd6f9](https://github.com/korchasa/flowai/commit/1fbd6f994d705127bcb12d5ef42f33422ddb376b))
* expand GIT_PAGER examples in RULE.md ([e0ce7f5](https://github.com/korchasa/flowai/commit/e0ce7f5c98d439bccd650700f37652eb3e2de6c1))
* expand IDE hooks comparison and add contributor dev setup to README ([6794600](https://github.com/korchasa/flowai/commit/67946003e46c2af679417c2b2d87d06b20c87448))
* **framework:** add automation pack to AGENTS.md packs list ([5b0a964](https://github.com/korchasa/flowai/commit/5b0a9644ea64cbcc7a594cfbb319ae3ee107a32a))
* **ides:** add session/conversation history storage comparison ([c2e4522](https://github.com/korchasa/flowai/commit/c2e4522ded24ed692e48267229b6de2fcdd5e5fb))
* **maintenance:** fix typo in todo_write tool name ([ca64313](https://github.com/korchasa/flowai/commit/ca64313dfae1f50a09737dac18b71247b8ede4bb))
* **maintenance:** remove explicit whiteboard.md filename references ([3296c6a](https://github.com/korchasa/flowai/commit/3296c6abb56fc6b73c9c392ef321acf4e8e0cc15))
* mark af-reflect as benchmarked in SRS ([0fa6b03](https://github.com/korchasa/flowai/commit/0fa6b03ad50890107e236e599ba4bacc475e294f))
* mark FR-14/15/16 criteria as done with evidence, clean up settings.json ([a7d60f4](https://github.com/korchasa/flowai/commit/a7d60f4ca3d83e89680dea72555414b38664e9b3))
* merge RND control primitives data into ides-difference.md and remove source ([569a2d4](https://github.com/korchasa/flowai/commit/569a2d4d29fbae5f73a8527376dbba8a5d71bc15))
* overhaul prompt engineering guides for instant and reasoning models ([a964437](https://github.com/korchasa/flowai/commit/a96443724975ecc646754372b8b8ce6fed8d6728))
* **readme:** simplify README description to refer to Cursor rules ([9bcb414](https://github.com/korchasa/flowai/commit/9bcb4146569de680d4fdb8e0a0a86ed6460c28f1))
* refine control primitives comparison documentation ([52025d5](https://github.com/korchasa/flowai/commit/52025d5615a7c4fe7fb644ffbf38194f6c94c1b8))
* refine task planning guidelines in task-plan-with-qa.md ([cc20c10](https://github.com/korchasa/flowai/commit/cc20c10fce285e6d029d04910db02ccb8a043e81))
* refresh IDE differences with footnotes and new sections ([a3dcb29](https://github.com/korchasa/flowai/commit/a3dcb2936eb493e8c9704f5ec35f49b187db7d10))
* reinforce GIT_PAGER usage in RULE.md ([62b134d](https://github.com/korchasa/flowai/commit/62b134d53dcf0db182f3d1c145e57d48f7c7842f))
* remove duplicate build-in-ide-tools.md (data already in ides-difference.md) ([5f55dff](https://github.com/korchasa/flowai/commit/5f55dff9f74e5fd9f417835dedf7208a728ec3a6))
* remove interactive clarification requirement and AskQuestion tool references ([0c3acf1](https://github.com/korchasa/flowai/commit/0c3acf11bbfc9987a7a92655cc9e175435cff805))
* remove obsolete RnD documents ([10f68e2](https://github.com/korchasa/flowai/commit/10f68e238b090eede02dba3754a8e883c14d75ef))
* remove outdated task planning guidelines from task-plan-with-qa.md ([3c89134](https://github.com/korchasa/flowai/commit/3c89134477f73086425b9d7b9b17d5fbc1202783))
* remove Russian language requirement from howto-write-in-informational-style and adjust task-review guidance to drop language constraint and revise negative-aspects wording ([45495aa](https://github.com/korchasa/flowai/commit/45495aa12ca575df3d60ca818d3be7f0ad960b2a))
* rename "Steps" section to "Todo List" in all command docs ([905b24d](https://github.com/korchasa/flowai/commit/905b24d6cae20a217c10893b32f65f7b906ad2ec))
* rename FR IDs from numeric to mnemonic format across codebase ([cbb2a7e](https://github.com/korchasa/flowai/commit/cbb2a7ed5564ef90fc1b478bc15631c5bdf9a508))
* rename FR IDs from numeric to mnemonic format across codebase ([3d7a30d](https://github.com/korchasa/flowai/commit/3d7a30d1d9c697fa3a2b17fc16f1cd9b95b4897c))
* reorganize R&D documents and add new research notes ([3caad71](https://github.com/korchasa/flowai/commit/3caad71727ddb078fa4767acf25adba0481a863f))
* **requirements:** add FR-8 af-init, update FR-3/FR-6 status ([d16a22a](https://github.com/korchasa/flowai/commit/d16a22a0dc518bc4a1f8ec0b71c7622ac33f6081))
* **requirements:** mark FR-20.1–FR-20.11 as completed with evidence ([43048b2](https://github.com/korchasa/flowai/commit/43048b2a1d45e5f8f686c51bcd8090b4469c8085))
* resolve 7 contradictions across SRS, SDS, and AGENTS.md ([02b2116](https://github.com/korchasa/flowai/commit/02b2116dcc929da8850c897d381fc64e04e64d02))
* revise task-create-command documentation for clarity and structure ([82d1653](https://github.com/korchasa/flowai/commit/82d1653349d19d991031a16ac45c113bfc96b2ee))
* rewrite README with Assisted Engineering paradigm and multi-IDE focus ([54c9fcf](https://github.com/korchasa/flowai/commit/54c9fcf595bda4875eee701e24b9f2df9c8275ef))
* **rnd:** add Claude Code CLI feature analysis ([fd1e919](https://github.com/korchasa/flowai/commit/fd1e91973619ed20098da4f3bc3b1fac5924ff56))
* **rnd:** add Cursor subagent path to Custom Agents comparison ([7c795de](https://github.com/korchasa/flowai/commit/7c795debc928e06ad0b68e72601fa34ac45f3e13))
* **rnd:** add Hyperagents paper practical conclusions with evidence ([7f5d04e](https://github.com/korchasa/flowai/commit/7f5d04ee858f61f2abe07e2a793ab0f8c0b47946))
* **rnd:** add superpowers plugin analysis ([afa38f3](https://github.com/korchasa/flowai/commit/afa38f35de0b782055335a37dea41b8a85adcd5f))
* **rnd:** drop outdated rnd notes ([f311142](https://github.com/korchasa/flowai/commit/f311142162bef0f0d45e1e86429d06a7f1f1d2fb))
* simplify CODE STYLE RULES for TypeScript ([c21dcc7](https://github.com/korchasa/flowai/commit/c21dcc7b1f45d4d75e6e0715be7e6c09b79281b1))
* **spec:** add draft spec for skill versioning feature ([31b2a8d](https://github.com/korchasa/flowai/commit/31b2a8d8ad4e71f95a92a55ba435a7f9d0a115f7))
* **spec:** add skill versioning specification ([f7d9489](https://github.com/korchasa/flowai/commit/f7d9489db0560de88c25d2a6b95d3f1b646cdbcd))
* standardize Key Principles bullets in README with renamed categories (Stages, Rules, Documentation, Project Maintenance, Howto) ([e5405a6](https://github.com/korchasa/flowai/commit/e5405a6a9a83891558347075eaff0e80b4675ac3))
* sync documentation with current command set and workflows ([892eb45](https://github.com/korchasa/flowai/commit/892eb45e53772b52843e9698b404ba58a8bb1d3e))
* sync documentation with new commands ([0c0d4c7](https://github.com/korchasa/flowai/commit/0c0d4c76c6907a6fd8b95afbc53c96b2eb9b620a))
* **task-build-claude-md:** add manual execution restrictions and checklist to CLAUDE.md build guidance ([22b3db2](https://github.com/korchasa/flowai/commit/22b3db283d42c178ce383ba1d56ec33a211fbd37))
* **task-plan:** improve task planning workflow ([034f6e5](https://github.com/korchasa/flowai/commit/034f6e5cb812e51a1b80f36a00b35b10ccade8f8))
* update AGENTS.md generation instructions and checklist ([6b77f2f](https://github.com/korchasa/flowai/commit/6b77f2f3d7520d40441805474a4c0d25057bf366))
* update AGENTS.md with planning rules and dev commands ([b0fff37](https://github.com/korchasa/flowai/commit/b0fff37995b485e9f935f86b89498194cedec9f9))
* update available skills and commands in README ([39d7688](https://github.com/korchasa/flowai/commit/39d7688c9920cb8d9e81cabbb2587c1edc6335cc))
* update command list and count in project documentation ([4c4991d](https://github.com/korchasa/flowai/commit/4c4991dccb4890a23fef27b98453196215b81ec6))
* update command listings and remove references to non-existent run.ts ([0208b38](https://github.com/korchasa/flowai/commit/0208b38fb6e9772231b48deb566eafa5ed019f5b))
* update command references in design and README ([ce3597c](https://github.com/korchasa/flowai/commit/ce3597cebcc02aa0009dbc50c6614f92e8ccfa59))
* update control primitives comparison for cursor rules ([e0087fb](https://github.com/korchasa/flowai/commit/e0087fb25d9871b3c4455717e150d73e122e5b1e))
* update documentation guidelines in RULE.md ([81ec4b4](https://github.com/korchasa/flowai/commit/81ec4b4f95440231dfbfd2469c3e1a896db97f71))
* update FR-8, FR-10.8, FR-15.3, FR-16.3 statuses based on implementation audit ([9a16bda](https://github.com/korchasa/flowai/commit/9a16bda55a181b16a0d6b61f9b1bdf61a28249e4))
* update guide counts in requirements and design ([ce49029](https://github.com/korchasa/flowai/commit/ce49029722eb89d85d2674ba5b6d8ae1a43826cf))
* update IDE comparison — add plugin systems, remove Codex/Antigravity ([86a0fe7](https://github.com/korchasa/flowai/commit/86a0fe72aeb2f39d453fbc1129eecbdc74d0b0db))
* update IDE differences with Cursor Agent CLI findings and Claude Code details ([59fa77e](https://github.com/korchasa/flowai/commit/59fa77ed08f5ca5fdcd0f6f184712c4b089bb6e8))
* update ides-difference and whiteboard ([f1d7e4d](https://github.com/korchasa/flowai/commit/f1d7e4d95587cd92373338eb5f0aa0048d090624))
* update planning commands and related documentation ([b53989c](https://github.com/korchasa/flowai/commit/b53989c3411c1ac6b4b75151bee7a5ecee2d6cf9))
* update project rules and readme ([dec2feb](https://github.com/korchasa/flowai/commit/dec2feb6fa47ec05bd715304a88ec8cc791abc83))
* update README and requirements for post-0.3.2 changes ([a863f87](https://github.com/korchasa/flowai/commit/a863f874a233e0bfa6ec2c5fda65546ac22741c0))
* update README for monorepo structure ([0c42c67](https://github.com/korchasa/flowai/commit/0c42c67fb96a095d3e65eb9f18db46ec8a413aee))
* update README to reflect pack system, add to doc hierarchy ([3ba6e01](https://github.com/korchasa/flowai/commit/3ba6e01113eb6ea8a370412c1ba231b66a3ad2e2))
* update RULE.md to allow user language for notes ([5f9064b](https://github.com/korchasa/flowai/commit/5f9064b0e1618e054e5ed98d98a7477d76cd785c))
* update RULE.md to enforce GIT_PAGER usage ([2a8a563](https://github.com/korchasa/flowai/commit/2a8a563315da9271a93ce113b03fd2e627672ac2))
* update SDS with traceability model and agent name corrections ([60c2cb0](https://github.com/korchasa/flowai/commit/60c2cb0c5703a8a0011b5f4b25dd64006a7976ce))
* update SDS with traceability model and agent name corrections ([41bc9b5](https://github.com/korchasa/flowai/commit/41bc9b5f23f83affbe644ac2cb7e24dae2ebc23a))
* update SRS and SDS for af-init and dev commands configuration ([82e31fc](https://github.com/korchasa/flowai/commit/82e31fc2c8d7901bc609ad13c56378112a14a977))
* update SRS format with requirement numbering and acceptance criteria structure ([ec77a57](https://github.com/korchasa/flowai/commit/ec77a57822ea14fdd73e0cf38b0c0adfea096dd4))
* update SRS/SDS and add product vision ([b464e81](https://github.com/korchasa/flowai/commit/b464e81f9be6e52c8aa19ee2fa50b553ac5f9917))
* update task planning guidelines in task-plan.md ([c7b7772](https://github.com/korchasa/flowai/commit/c7b7772554426e5b79d10eb5b5909ddddd636614))
* update task-answer documentation for clarity and response handling ([0f63f49](https://github.com/korchasa/flowai/commit/0f63f49555c60ca4a5872d3c85f6a90a06762b24))
* update task-check-analyze and task-generate-agents command documentation ([ed35c23](https://github.com/korchasa/flowai/commit/ed35c236fd621cadd657dc0c825dde66fa36771a))
* update task-commit.md to enforce GIT_PAGER usage ([3684c1f](https://github.com/korchasa/flowai/commit/3684c1f921edad9f99e27bdbb0a4b5c2d5f4fa34))
* update task-execute.md to clarify documentation requirements ([76a5171](https://github.com/korchasa/flowai/commit/76a51713399f7ff54aca5af5db1c3c411a8686da))
* update TS strict code style rules to emphasize pure functions and immutability ([18f5710](https://github.com/korchasa/flowai/commit/18f57108fa80f2050512a299d67a176c6e463d1a))
* update whiteboard — ai-skel-ts removed from framework ([e5c3c66](https://github.com/korchasa/flowai/commit/e5c3c662d4eff73180a62c9e369f17e8176c3ec2))
* update whiteboard — P4 resolved ([9982df6](https://github.com/korchasa/flowai/commit/9982df6a5ed3605c728acc1cec0f52570168fb57))
* update whiteboard — P5 resolved ([428200c](https://github.com/korchasa/flowai/commit/428200c6f07b591b62a58ed9479ca38ac3b0c71d))
* update whiteboard — P6 partially resolved ([efbb5fd](https://github.com/korchasa/flowai/commit/efbb5fd0256631ee769f5efb338c1ff47207f08a))
* update whiteboard with deep research skill redesign plan ([d08fa20](https://github.com/korchasa/flowai/commit/d08fa200edc7ccb9165085721af5042e65eb089d))
* update whiteboard with packs plan, add plugin bundles comparison, remove stale spec ([6dcc931](https://github.com/korchasa/flowai/commit/6dcc9311698a2f7fa1ed925581fbe412b3242ce5))
* **versioning:** add draft spec for per-skill semantic versioning ([f0c33fa](https://github.com/korchasa/flowai/commit/f0c33fa1334a7ac52e4a4487f1b46041bb833462))

### [0.4.20](https://github.com/korchasa/flowai/compare/v0.4.19...v0.4.20) (2026-04-09)


### Features

* **cli:** add migrate subcommand for one-way IDE primitives migration ([a42df1c](https://github.com/korchasa/flowai/commit/a42df1cf1383acd61e4a952336472f0a22285e73))

### [0.4.19](https://github.com/korchasa/flowai/compare/v0.4.18...v0.4.19) (2026-04-08)


### Features

* **skills:** add instruction coherence and tooling relevance checks to flowai-maintenance ([6034001](https://github.com/korchasa/flowai/commit/60340019b3335ae36c57ab1ff904850eca2dc0d3))
* **skills:** add pre-flight project check to flowai-review ([770b0df](https://github.com/korchasa/flowai/commit/770b0df280de5e8de2ad5670deffd72ea96a5293))


### Bug Fixes

* **bench:** correct checklist items in flowai-update benchmarks ([8d6a306](https://github.com/korchasa/flowai/commit/8d6a30624a5ce66ed796235575769bbea9583eb5))


### Chores

* **framework:** update flowai framework to 0.4.18 ([18960fb](https://github.com/korchasa/flowai/commit/18960fbee0486099ad5fab998986e294e22151d5))

### [0.4.18](https://github.com/korchasa/flowai/compare/v0.4.17...v0.4.18) (2026-04-08)


### Features

* **bench:** add pack-level AGENTS.md rules benchmarks and relocate templates ([247e43a](https://github.com/korchasa/flowai/commit/247e43a0f409cce978adf5be665e3aa3e3fe068d))
* **cli:** decouple AGENTS.md templates from flowai-init scaffolds ([4a139e0](https://github.com/korchasa/flowai/commit/4a139e0a2ac0d7a054273df0e700041fd4be5723))
* **cli:** sync core assets to IDE config dirs ([3463549](https://github.com/korchasa/flowai/commit/3463549342d4347e5d67a0df9eeb13c7cad5f017))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([228dbf2](https://github.com/korchasa/flowai/commit/228dbf23041a71b257853a0436264192275d8f02))
* **traceability:** add FR-* code-to-SRS traceability with verification script ([c2ff7a6](https://github.com/korchasa/flowai/commit/c2ff7a664d1dd8a57fa2950a4b4746a15171df1c))


### Bug Fixes

* **config:** remove source reference from .flowai.yaml ([1031461](https://github.com/korchasa/flowai/commit/10314613ccc1d5c64a6ab84f9899c9b9d88385c7))
* **fmt:** format benchmark file that broke CI ([4e9ed79](https://github.com/korchasa/flowai/commit/4e9ed797ed0fef0d6aa63cc6a9de85f9d5fd9432))
* **skill:** make asset artifact verification unconditional in flowai-update ([e4048f9](https://github.com/korchasa/flowai/commit/e4048f941c2255548ec4a6ae510add79ccbdffc4))


### Documentation

* rename FR IDs from numeric to mnemonic format across codebase ([4fff581](https://github.com/korchasa/flowai/commit/4fff581e8d6e4ee2db9a8bd4d3a40c98860c7e30))
* rename FR IDs from numeric to mnemonic format across codebase ([9c08aa9](https://github.com/korchasa/flowai/commit/9c08aa9028e5bbbc0510f396001f75f4b9de828d))
* update SDS with traceability model and agent name corrections ([ba4aed8](https://github.com/korchasa/flowai/commit/ba4aed852909d3e6ca5bdeddff54a257b3a60e17))
* update SDS with traceability model and agent name corrections ([8612843](https://github.com/korchasa/flowai/commit/86128431d429bd3353d54acfcdbfcd9e709af1a0))


### Chores

* configure sessionDocs for session-init-docs hook ([5e874e9](https://github.com/korchasa/flowai/commit/5e874e968b785146b0ea2a215efe3c247afe3858))
* configure sessionDocs for session-init-docs hook ([87646db](https://github.com/korchasa/flowai/commit/87646db264d59565c3255a8aa3d55c4888ded4cb))
* **framework:** update flowai framework ([526b23c](https://github.com/korchasa/flowai/commit/526b23c67cb69702318e75ef329ca4c76d64dcce))


### Code Refactoring

* remove flowai-session-init-docs hook and sessionDocs config ([f89c0d0](https://github.com/korchasa/flowai/commit/f89c0d0e96cee4611b615d87b5f3a8bb385b936b))
* remove lint-on-write and test-before-commit from framework hooks ([09b0aa7](https://github.com/korchasa/flowai/commit/09b0aa771e4ed8ac8d1ee7edc0b38ecc814da10b))
* remove lint-on-write and test-before-commit from framework hooks ([b586415](https://github.com/korchasa/flowai/commit/b586415fb6fb664e695baca607f46da91f4eb1b7))
* remove settings.json to simplify configuration ([3422482](https://github.com/korchasa/flowai/commit/34224829f57d510ca714049f22480721d161b036))
* replace session-start doc reading with per-skill lazy SRS/SDS instructions ([b5297a9](https://github.com/korchasa/flowai/commit/b5297a91468d3f41090fc01cb98ed11e29b61f43))
* simplify .gitignore by consolidating .claude entries ([b9e3252](https://github.com/korchasa/flowai/commit/b9e32529f74946f365acfd9feec6e57c2b2ea6e3))


### Styles

* **cli:** fix formatting after merge conflict resolution ([f603693](https://github.com/korchasa/flowai/commit/f6036939793ecc0b658cfd27073524fb58b8b525))

### [0.4.17](https://github.com/korchasa/flowai/compare/v0.4.16...v0.4.17) (2026-04-08)


### Code Refactoring

* remove flowai-session-init-docs hook and sessionDocs config ([5876920](https://github.com/korchasa/flowai/commit/587692005121a595838c9aae0952c109f739f39b))

### [0.4.16](https://github.com/korchasa/flowai/compare/v0.4.15...v0.4.16) (2026-04-07)


### Features

* **cli:** add source override for installing from git branch or local path ([e8b7f10](https://github.com/korchasa/flowai/commit/e8b7f106356d62a53e9db9d38355b693b0fc3773))


### Documentation

* update SRS format with requirement numbering and acceptance criteria structure ([88f0aa1](https://github.com/korchasa/flowai/commit/88f0aa126537de9ccf37e1a47bf77f1e777d92ce))

### [0.4.15](https://github.com/korchasa/flowai/compare/v0.4.14...v0.4.15) (2026-04-05)


### Features

* extend frontmatter for skills and agents with model tiers ([d7c6059](https://github.com/korchasa/flowai/commit/d7c60597a8b1fc5c82bf0aff209114143b339faf))
* **hooks:** add flowai-session-init-docs SessionStart hook ([02f1cdd](https://github.com/korchasa/flowai/commit/02f1cdd4c76f855914dd1b3859d1d719f3e8c79b))


### Agent Changes

* **commit-review:** separate responsibilities between review and commit, add whiteboard cleanup ([7217be5](https://github.com/korchasa/flowai/commit/7217be557d06d819a5c460401775e722b30c657f))


### Documentation

* update IDE differences with Cursor Agent CLI findings and Claude Code details ([d7f6953](https://github.com/korchasa/flowai/commit/d7f695391ef94b6cec0868c6339232f1d531efb4))


### Chores

* add session-init-docs hook config, format memory files ([eebdf7b](https://github.com/korchasa/flowai/commit/eebdf7b1f6aed3e46563a9b99dffe3db24ce5cc7))

### [0.4.14](https://github.com/korchasa/flowai/compare/v0.4.13...v0.4.14) (2026-04-04)


### Features

* **cli:** add `flowai loop` command for non-interactive Claude Code execution ([d3332f0](https://github.com/korchasa/flowai/commit/d3332f006feb9a3df43c53fbbcda3f59aec68a40))
* **engineer-rule:** update Claude Code rule semantics based on experimental verification ([5c1ffed](https://github.com/korchasa/flowai/commit/5c1ffed8c3171a868925cac49aedb025f6ccf2b9))


### Styles

* reformat HTML assets for current Deno fmt rules ([7542918](https://github.com/korchasa/flowai/commit/75429186b69f64820a8897edb7f0725b5c0924e5))


### Documentation

* add Reference-First planning rule to AGENTS.md ([03f4fc6](https://github.com/korchasa/flowai/commit/03f4fc6b8ebd7a7f5806c5add77ba1acd4a2b9e8))


### Code Refactoring

* remove pipeline pack and all references ([dd07b48](https://github.com/korchasa/flowai/commit/dd07b48bb12ba4f3a0c183a41c1f8a84a56f5c43))


### Build System

* **ci:** pin Deno to 2.7.11 to fix fmt mismatch ([c42a418](https://github.com/korchasa/flowai/commit/c42a41890017f5cf0a98eb5aef40e38a15471e74))

### [0.4.13](https://github.com/korchasa/flowai/compare/v0.4.12...v0.4.13) (2026-04-03)


### Chores

* gitignore pipeline runs and update flowai config ([79e673d](https://github.com/korchasa/flowai/commit/79e673d531373a9f15957eab2d7a5f63108980d2))
* remove .flowai/runs/ from tracking ([e7dc61b](https://github.com/korchasa/flowai/commit/e7dc61bbb20160aa0eb8db01a5de32e7fee872da))


### Styles

* reformat HTML assets for Deno 2.7.11 fmt rules ([180ef95](https://github.com/korchasa/flowai/commit/180ef9557426ecba82a58ecb4d785a8696b3b6fd))


### Build System

* **ci:** pin Deno to 2.7.4 and revert HTML formatting ([e7a1673](https://github.com/korchasa/flowai/commit/e7a167323ef411b95956e143ffac5643b64b5692))
* **ci:** pin Deno version to 2.7.11 ([7f792f5](https://github.com/korchasa/flowai/commit/7f792f52672d51c4ef0d0ed0713be2da2743ee13))

### [0.4.12](https://github.com/korchasa/flowai/compare/v0.4.11...v0.4.12) (2026-04-03)


### Features

* **pipeline:** add compact SDLC pipeline with Design and Review agents ([820d9f8](https://github.com/korchasa/flowai/commit/820d9f80457da39045831d282328f9eee4dbc6ed))

### [0.4.11](https://github.com/korchasa/flowai/compare/v0.4.9...v0.4.11) (2026-04-03)


### Features

* **devcontainer:** add gh CLI auth and git credential helper to setup-container.sh ([df88728](https://github.com/korchasa/flowai/commit/df88728e9b9e5f1668fd718bc6184a274988ea15))


### Bug Fixes

* **ci:** resolve non-existent tag in release notes generation ([f782af6](https://github.com/korchasa/flowai/commit/f782af6743a8211ac05f81889714b53b3d81b27b))
* **devcontainer:** fix OAuth auth, volume ownership, and error masking in templates ([72866f3](https://github.com/korchasa/flowai/commit/72866f3b360896d113fde9f0093c803d30008460))


### Build System

* **ci:** add custom release notes generation from conventional commits ([5b8ff63](https://github.com/korchasa/flowai/commit/5b8ff63c53a468a339678ce7c4d1cf296d9c3e3c))


### Code Refactoring

* **pipeline:** rename .flow/ to .flowai/ and move engineer-pipeline skill ([1e41dda](https://github.com/korchasa/flowai/commit/1e41dda79a80b5535b55a16f4358c0dfe5e082e9))


### Chores

* **release:** 0.4.10 ([7ae3b3f](https://github.com/korchasa/flowai/commit/7ae3b3fa9a213ee6aa49615ec59060b585142038))

### [0.4.10](https://github.com/korchasa/flowai/compare/v0.4.9...v0.4.10) (2026-04-03)


### Features

* **devcontainer:** add gh CLI auth and git credential helper to setup-container.sh ([df88728](https://github.com/korchasa/flowai/commit/df88728e9b9e5f1668fd718bc6184a274988ea15))


### Bug Fixes

* **devcontainer:** fix OAuth auth, volume ownership, and error masking in templates ([72866f3](https://github.com/korchasa/flowai/commit/72866f3b360896d113fde9f0093c803d30008460))


### Build System

* **ci:** add custom release notes generation from conventional commits ([5b8ff63](https://github.com/korchasa/flowai/commit/5b8ff63c53a468a339678ce7c4d1cf296d9c3e3c))


### Code Refactoring

* **pipeline:** rename .flow/ to .flowai/ and move engineer-pipeline skill ([1e41dda](https://github.com/korchasa/flowai/commit/1e41dda79a80b5535b55a16f4358c0dfe5e082e9))

### [0.4.9](https://github.com/korchasa/flowai/compare/v0.4.8...v0.4.9) (2026-04-01)


### Features

* **cli:** add --local sync mode; stop tracking .claude/ in git ([8fba6ac](https://github.com/korchasa/flowai/commit/8fba6acde7d9dcb60ea7b5792d89dd27c4ddf57f))


### Agent Changes

* **core:** add dynamic doc discovery, whiteboard context, and parallel delegation benchmarks ([e74a11c](https://github.com/korchasa/flowai/commit/e74a11c82389b0a18381f840be511d365f9f604d))
* **flowai-commit:** add missing CLAUDE.md symlink in dynamic-doc-list fixture ([8436259](https://github.com/korchasa/flowai/commit/8436259d40c667ee3e3f85536f7d7da77f1c9862))

### [0.4.8](https://github.com/korchasa/flowai/compare/v0.4.7...v0.4.8) (2026-04-01)


### Features

* **checks:** add naming prefix validator (NP-1: all primitives must use flowai- prefix) ([84d1fcf](https://github.com/korchasa/flowai/commit/84d1fcf1e6b0fdbed3116bb46095663b34935591))
* **cli,update:** complete sync output for all primitive actions + frontmatter validation ([4d456b6](https://github.com/korchasa/flowai/commit/4d456b61fce82d44480a20e9a3906a33c1e0b474))
* **core:** add flowai-reflect-by-history skill ([d4fc2a5](https://github.com/korchasa/flowai/commit/d4fc2a5853793f8e2d4b67036e39a3994fbcce56))
* **core:** add parallel execution to deno task check and review/commit skills ([bee2762](https://github.com/korchasa/flowai/commit/bee2762646eca601044dbf002d0250e90e81039a))
* **pipeline:** add flowai-pipeline-sdlc — local SDLC pipeline without GitHub ([c78fd09](https://github.com/korchasa/flowai/commit/c78fd09b79dbb3760e21b9b3c59a70f4198ffc0d))


### Bug Fixes

* **plan:** make critique step automatic instead of asking permission ([0c091d3](https://github.com/korchasa/flowai/commit/0c091d31785d8bc200158c81d5b43d3a1e5615bf))
* **update:** handle invalid YAML in parseFrontmatter gracefully ([fd7cf59](https://github.com/korchasa/flowai/commit/fd7cf599e2d5413511a38749c9b347256e3d9065))


### Chores

* **framework:** update flowai framework ([55faa2f](https://github.com/korchasa/flowai/commit/55faa2f34bda65a57ebe3ab1d232a0ec43a02743))


### Documentation

* **ides:** add session/conversation history storage comparison ([12a9374](https://github.com/korchasa/flowai/commit/12a9374908d45f36cdd2a94562c6546367062bd2))


### Code Refactoring

* **core:** remove flowai-skill-executor agent ([4b2b265](https://github.com/korchasa/flowai/commit/4b2b2651f96823ffda6e800452372f61cd051304))
* **pipeline:** add flowai- prefix to all pipeline pack primitives ([3d86322](https://github.com/korchasa/flowai/commit/3d86322ab9217af0cf23a9832898d371aaba01fd))

### [0.4.7](https://github.com/korchasa/flowai/compare/v0.4.6...v0.4.7) (2026-03-31)


### Bug Fixes

* **devtools:** correct Claude Code rule format in engineer-rule skill ([c99d54f](https://github.com/korchasa/flowai/commit/c99d54faf4080b6bced1a73aba00d86a5e6f412d))

### [0.4.6](https://github.com/korchasa/flowai/compare/v0.4.5...v0.4.6) (2026-03-30)


### Code Refactoring

* **pipeline:** rename automation→pipeline pack, inline PM into orchestrator, fix test-fitting in benchmarks ([2ba0c8e](https://github.com/korchasa/flowai/commit/2ba0c8ee59d5a1f14fabcbdd5519909f59ed4ba1))


### Documentation

* add benchmark test-fitting and static mocks rules, clarify cross-pack ref checker ([0320ddd](https://github.com/korchasa/flowai/commit/0320ddd20dc75ba486970de7cff041378f99d505))

### [0.4.5](https://github.com/korchasa/flowai/compare/v0.4.4...v0.4.5) (2026-03-30)


### Features

* **automation:** add automation pack with SDLC pipeline, role-specific subagents, and benchmarks ([a80340b](https://github.com/korchasa/flowai/commit/a80340b93cb6e625c0f2d5ae68bcdf9e6550efc5))
* **benchmarks:** add benchmark system for subagents ([8462f44](https://github.com/korchasa/flowai/commit/8462f44b43459d7b45e152836a24dbdcea26cd60))


### Bug Fixes

* **hook:** isGitCommit handles quoted strings, -c flags, and subshells ([b42f995](https://github.com/korchasa/flowai/commit/b42f995c176560e70bcf5413f08a92e8c2173b96))


### Code Refactoring

* **skills:** make flowai-init/flowai-update stack-agnostic for command configuration ([aedc9ec](https://github.com/korchasa/flowai/commit/aedc9ecd8fdfba8c084d85b22d12e8002d33f612))


### Chores

* **framework:** update flowai framework ([75fb4b0](https://github.com/korchasa/flowai/commit/75fb4b0fcaf698f6e90a00b089ad2ef8e6ddd4d4))


### Documentation

* **framework:** add automation pack to AGENTS.md packs list ([dd3b493](https://github.com/korchasa/flowai/commit/dd3b49389ea1adfc3398c4ebde6790621ddb3d42))

### [0.4.4](https://github.com/korchasa/flowai/compare/v0.4.3...v0.4.4) (2026-03-29)


### Code Refactoring

* **benchmarks:** expand benchmark coverage and compress docs to reference benchmarks ([11f5aa8](https://github.com/korchasa/flowai/commit/11f5aa8e39f00f7fdc5823f23a3d6883dcd039eb))

### [0.4.3](https://github.com/korchasa/flowai/compare/v0.4.2...v0.4.3) (2026-03-29)


### Code Refactoring

* **agent:** restrict flowai-skill-adapter to Bash-only tools ([6f6695b](https://github.com/korchasa/flowai/commit/6f6695b50f63285aaee8714b681eb86f14fb2156))

### [0.4.2](https://github.com/korchasa/flowai/compare/v0.4.1...v0.4.2) (2026-03-28)


### Bug Fixes

* **cli:** exclude benchmarks and test files from skill distribution ([de91c21](https://github.com/korchasa/flowai/commit/de91c21d38fd8835dfa7e23fec950aad749b5bbb))


### Code Refactoring

* add flowai- prefix to all framework hooks and agents ([b2ab74e](https://github.com/korchasa/flowai/commit/b2ab74e84e51d67415bb56edba38f7ee9c52693c))

### [0.4.1](https://github.com/korchasa/flowai/compare/v0.4.0...v0.4.1) (2026-03-28)


### Bug Fixes

* **ci:** stop tracking generated flowai-hooks.json ([b87a625](https://github.com/korchasa/flowai/commit/b87a625318fa788b96aff9542353fb4ef234d64f))
* **cli:** run sync integration test in temp dir to avoid side effects ([b91ca46](https://github.com/korchasa/flowai/commit/b91ca465017d849fc99a9c8b81819f6efb7a4f66))

### [0.3.9](https://github.com/korchasa/flowai/compare/v0.3.8...v0.3.9) (2026-03-28)


### Features

* **benchmarks:** add pack-scoped sandbox isolation and cross-pack reference validation ([8399a2f](https://github.com/korchasa/flowai/commit/8399a2f0d41f85c2a6bbdfa5230d0114e5fc6800))
* **benchmarks:** generate AGENTS.md from templates, add CLAUDE.md symlinks ([dd04a34](https://github.com/korchasa/flowai/commit/dd04a3401d7faec24fc8ee40d221a34462f1cf01))
* **benchmarks:** switch judge to Claude CLI, add parallel execution and explicit trace IDs ([1dcdbf9](https://github.com/korchasa/flowai/commit/1dcdbf9280df61ed0e04799f367bc830f1aac959))
* **cli:** add non-interactive config generation for -y flag ([e193c43](https://github.com/korchasa/flowai/commit/e193c432678cfbdda32d01e47598af5fe8f3c045))
* **configure-deno-commands:** require parallel buffered check execution ([c8e7665](https://github.com/korchasa/flowai/commit/c8e7665eda24eb9047d6b92b14d0fdaf488359fd))
* **flowai-plan:** improve variant selection flow and fix interactive benchmark infrastructure ([9bf6c4d](https://github.com/korchasa/flowai/commit/9bf6c4df99ec348284eddf8dc4babb276f98f65b))
* **framework,cli:** implement pack system — flowai-* renaming, hooks/scripts, rich sync output ([98aa386](https://github.com/korchasa/flowai/commit/98aa386db2c95b6d25ba081e4c82f2f679eeec24))
* **framework:** add skill adaptation to flowai-update ([e306c6c](https://github.com/korchasa/flowai/commit/e306c6c3375ecc471ed71780995c85e744d49c48))
* **framework:** migrate benchmarks and runner to pack structure ([2e0e3b7](https://github.com/korchasa/flowai/commit/2e0e3b7c7ccf61565e6b1fbf58a1508b2ab86b79))
* **hooks:** add framework hooks with IDE-specific config generation ([0c204c9](https://github.com/korchasa/flowai/commit/0c204c90db958cdaaed87afc7a17de3422c621b1))


### Bug Fixes

* **benchmarks:** handle dynamic exit_code_zero in score test ([e468a4e](https://github.com/korchasa/flowai/commit/e468a4edabd2464d012ea05b47c2c0b88d46f42f))
* **benchmarks:** isolate sandbox with git init to prevent agent escaping to parent repo ([63d6423](https://github.com/korchasa/flowai/commit/63d6423a8fcc3531430733576f250bb66f11403a))
* **benchmarks:** overhaul benchmark infrastructure for reliability ([2d24f02](https://github.com/korchasa/flowai/commit/2d24f02263ef1d0336c4eb90c7570c5e35e57e0f))
* **benchmarks:** pass judge evidence via file to avoid E2BIG crashes ([14e1c3a](https://github.com/korchasa/flowai/commit/14e1c3ac8bb570497070cb55228d9fd9e49db804))
* **benchmarks:** update paths after pack migration, remove stale fixturePath overrides ([40be066](https://github.com/korchasa/flowai/commit/40be066c04791268ce5cc2b0a8cf19278586a7c1))
* **flowai-plan:** enable interactive mode in basic benchmark ([aaf6b0c](https://github.com/korchasa/flowai/commit/aaf6b0c476e1fda3391f87740c5eb1f4b286516b))
* **flowai-review:** add deletion guard for entire directories ([853b579](https://github.com/korchasa/flowai/commit/853b5792c6ad6587212563b96ad00dc56fc04aa0))


### Chores

* remove flowai-skill-example and prevent re-creation ([efb3403](https://github.com/korchasa/flowai/commit/efb3403d0c9280a067551ae5fb0f7cf4504006cd))


### Documentation

* **AGENTS.md:** add TypeScript LSP plugin caveat for export ordering ([cb85bf3](https://github.com/korchasa/flowai/commit/cb85bf300773881261c38154a2aeb96a1ccb9051))
* merge RND control primitives data into ides-difference.md and remove source ([917322c](https://github.com/korchasa/flowai/commit/917322c9198d5e62f9f5eb1a5ce51ea50a90be56))
* remove duplicate build-in-ide-tools.md (data already in ides-difference.md) ([6e3c4f5](https://github.com/korchasa/flowai/commit/6e3c4f5e9ed61b4c30da32bf01fe08f2bc837673))
* **rnd:** add Claude Code CLI feature analysis ([abb0c5e](https://github.com/korchasa/flowai/commit/abb0c5e60e9b38a93bd889ab88bf9339f04e8191))
* **rnd:** add Hyperagents paper practical conclusions with evidence ([f3e5099](https://github.com/korchasa/flowai/commit/f3e5099ecaa75f628befa481b8bb9094f38e5e1f))
* **spec:** add draft spec for skill versioning feature ([d1023cb](https://github.com/korchasa/flowai/commit/d1023cb0c2233a34c94e0d5b43e2e6ae8d03d8f6))
* **spec:** add skill versioning specification ([cbde22a](https://github.com/korchasa/flowai/commit/cbde22a840e2f9f7a4f47856021326102060ed1d))
* update IDE comparison — add plugin systems, remove Codex/Antigravity ([59f2ee8](https://github.com/korchasa/flowai/commit/59f2ee8b1aa03c5af6bb839136ee54783e5f5111))
* update whiteboard with packs plan, add plugin bundles comparison, remove stale spec ([c4621f8](https://github.com/korchasa/flowai/commit/c4621f85b63975ac87db80ce48ac2416a6e6a19e))


### Agent Changes

* maintenance — fix flow-* naming, improve skill instructions, add JSDoc ([893764a](https://github.com/korchasa/flowai/commit/893764a239df0e900d66c4258d44b46068ea26ad))


### Build System

* add CI integrity checks and update judge model ([82fda8d](https://github.com/korchasa/flowai/commit/82fda8db0e3e95041160960196f90bec8487467f))
* pin GitHub Actions to SHA checksums ([5e75c8c](https://github.com/korchasa/flowai/commit/5e75c8c413f2ff9d39c6109847c8eff9ccb71c28))


### Code Refactoring

* **benchmarks:** improve judge evidence, fix score calculation, add safety ([5357397](https://github.com/korchasa/flowai/commit/535739794823d7c5c39b984a148070ece33ac9f1))
* **benchmarks:** migrate to @bench/ import map and clean up checklist types ([c99050c](https://github.com/korchasa/flowai/commit/c99050cd63217f5a270d53182d9d2515c4d878a1))
* **benchmarks:** require agentsTemplateVars, remove legacy agentsMarkdown ([9de987a](https://github.com/korchasa/flowai/commit/9de987a62466c5126ad0391ae1e9db0f80696e56))
* **benchmarks:** split trace.ts into modular architecture ([0c9ac68](https://github.com/korchasa/flowai/commit/0c9ac6859042f986145e33f52c487c154698086c))
* co-locate benchmarks with skills (FR-BENCH.COLOC) ([7d9495f](https://github.com/korchasa/flowai/commit/7d9495f377c4d3c36773af2567bc96352d4cf01f))
* rename AssistFlow to flowai across the project ([53c6f93](https://github.com/korchasa/flowai/commit/53c6f931c47bcc177d480c33ca2fa34258587cb5))
* rename test files to Deno _test.ts convention ([a569a15](https://github.com/korchasa/flowai/commit/a569a15888352e19e3f8e80d7aba52200438efe9))

### [0.3.8](https://github.com/korchasa/flowai/compare/v0.3.7...v0.3.8) (2026-03-24)


### Features

* **framework:** migrate whiteboard from single file to per-session directory ([0b12782](https://github.com/korchasa/flowai/commit/0b1278204bb2873d6548822d9a4cc4fdaad12c79))


### Bug Fixes

* correct deno fmt exclude config and sync flow-review whiteboard path ([0433dc1](https://github.com/korchasa/flowai/commit/0433dc1891c0bca54c93bdd77a27f8fc0a3ce981))


### Chores

* remove .claude/ from tracking and add to .gitignore ([63bc4e0](https://github.com/korchasa/flowai/commit/63bc4e0a3cd868b79593682ac42b4b8753359137))


### Documentation

* **agents:** update whiteboard references to per-session whiteboards directory ([c85e53d](https://github.com/korchasa/flowai/commit/c85e53d4042f33b1683d88113c7befdd4b190ab1))


### Styles

* apply deno fmt formatting ([d60beb2](https://github.com/korchasa/flowai/commit/d60beb29039a799de3b682274d293f6e66911bba))

### [0.3.7](https://github.com/korchasa/flowai/compare/v0.3.6...v0.3.7) (2026-03-24)


### Features

* **cli:** --version checks for updates and shows update command ([af74d6d](https://github.com/korchasa/flowai/commit/af74d6d42e17af8ca86e72bba3d084eba4ffad98))
* **framework:** add explicit git diff commands to flowai-update skill ([b94122e](https://github.com/korchasa/flowai/commit/b94122ec036c0b2d1391ef6378e65c3de5039231))
* **framework:** add interactive-teaching-materials skill ([6f84b1e](https://github.com/korchasa/flowai/commit/6f84b1e64ef830b80601a464f72a4c502540a466))
* **framework:** mandatory Documentation Audit with gate and report template ([64eea6a](https://github.com/korchasa/flowai/commit/64eea6a6b66a754ba8ee5359d075f8d3ba5c2774))


### Tests

* **benchmarks:** add auto-docs scenarios and .flowai.yaml config ([2f720f9](https://github.com/korchasa/flowai/commit/2f720f944de5305fc1a3fa912daaba29e25c22e1))

### [0.3.6](https://github.com/korchasa/flowai/compare/v0.3.5...v0.3.6) (2026-03-23)


### Features

* **cli,framework:** add CLI update step to flowai-update skill and version hint in IDE guard ([9ed9c3e](https://github.com/korchasa/flowai/commit/9ed9c3e61f2d45cf273bce7ddd90711acdfc8ad4))


### Bug Fixes

* **cli,framework:** clarify flowai sync subcommand in IDE context ([0ad8bcd](https://github.com/korchasa/flowai/commit/0ad8bcd7ac0bcc91fd181412164b0a74b476a881))


### Documentation

* update README and requirements for post-0.3.2 changes ([fd858d4](https://github.com/korchasa/flowai/commit/fd858d46e055475428216d0d4f40677d55319fb7))

### [0.3.5](https://github.com/korchasa/flowai/compare/v0.3.2...v0.3.5) (2026-03-23)


### Features

* **benchmarks:** add 25 new benchmark scenarios for framework skills ([1e2cb74](https://github.com/korchasa/flowai/commit/1e2cb7434240d0c07b34374e36ba87c3f78afc2f))
* **benchmarks:** migrate to stream-json, add NO_COLOR support, skip logic ([cf8fb0b](https://github.com/korchasa/flowai/commit/cf8fb0b3513e73981d94b8d9508ea18d875a18d4))
* **cli:** interactive update prompt with deno.lock pinning fix ([601f75f](https://github.com/korchasa/flowai/commit/601f75f80a8fc77e73902666283f5ab7593461e2))
* **framework:** add flowai-update skill and CLI IDE context guard ([95945d5](https://github.com/korchasa/flowai/commit/95945d5a9abd377629f15b902c3abb95b29dd994))
* **framework:** enrich variant analysis with Risks and Trade-offs ([a0a66b7](https://github.com/korchasa/flowai/commit/a0a66b733e83c29352880a09ef4e14f0a528900e))
* **scripts:** auto-disable ANSI colors when running under Claude Code ([252981c](https://github.com/korchasa/flowai/commit/252981c5a86731b267ce1aea287d4956c89ff58f))


### Bug Fixes

* **benchmarks:** add interactive mode to review scenarios (P3) ([3ed58ee](https://github.com/korchasa/flowai/commit/3ed58ee1ae16ae8343647c2a9e13a7269b1eac97))
* **benchmarks:** fix P5 strict checklists — skill fixes and interactive mode ([7c8830b](https://github.com/korchasa/flowai/commit/7c8830bb68b5b6229b189c1d5dbc98943f77ce9d))
* **benchmarks:** fix P6 deterministic failures in flowai-commit scenarios ([82106ad](https://github.com/korchasa/flowai/commit/82106ada5df2631758f7b14db7e9985657b89efe))
* **benchmarks:** switch engineer-skill/subagent scenarios to .cursor/ to avoid CLI write block ([f8a6709](https://github.com/korchasa/flowai/commit/f8a670952fb19f8d00a6a171589a330c1dce6813))
* **cli:** add explicit type annotation to cliffy action callbacks ([46b145f](https://github.com/korchasa/flowai/commit/46b145f26176f1cae0e730103e312dd6cfec89fd))
* **cli:** resolve TS2345 in cliffy action callbacks, add deno check to task-check ([8dc8551](https://github.com/korchasa/flowai/commit/8dc8551b9013e27b6a8b5f37889cbe43a994927b))
* **framework:** use system temp dir instead of _research_tmp in deep-research skill ([0e45167](https://github.com/korchasa/flowai/commit/0e4516750b941a71cecfe80002199369b15d247d))


### Code Refactoring

* **framework:** remove flowai-skill-ai-skel-ts (moved to ai-skel-ts library) ([23f6e5d](https://github.com/korchasa/flowai/commit/23f6e5d541bf0eab469776ee07d1637f4b37113c))
* **skills:** rename flowai-skill-manage-github-tickets-by-mcp → flowai-skill-manage-github-tickets ([3f064c6](https://github.com/korchasa/flowai/commit/3f064c6cd9a3b04fa9e44947f29935366ee28117))
* **skills:** rename flowai-skill-playwright-cli → flowai-skill-browser-automation ([c4d955b](https://github.com/korchasa/flowai/commit/c4d955bb685734c0c882eca8a9fd55cf3d6da230))


### Agent Changes

* add Benchmark TDD flow to project instructions ([2f2f2e3](https://github.com/korchasa/flowai/commit/2f2f2e39061cf8d377851f90d0e4bdcc00dbc4b5))
* **flowai-commit:** add suggest-reflect step after commit ([8cddd55](https://github.com/korchasa/flowai/commit/8cddd55441767c254a9efe7eae4d0bc962cf8ecd))


### Tests

* **flowai-review-and-commit:** add suggest-reflect benchmark scenarios ([1ebf235](https://github.com/korchasa/flowai/commit/1ebf2352d4dbda67a140cbd8fb60f908103ee9d1))


### Documentation

* clean whiteboard — only remaining TODO items ([f8304b2](https://github.com/korchasa/flowai/commit/f8304b242f582ddff1ab6bc24adbb2bac0f4871c))
* update whiteboard — ai-skel-ts removed from framework ([f85f077](https://github.com/korchasa/flowai/commit/f85f077d0774b2c058dbd9558d5ec700dc0dc066))
* update whiteboard — P4 resolved ([b3dee86](https://github.com/korchasa/flowai/commit/b3dee8619f99b14f30f27c3391747cfd5aa9a4e8))
* update whiteboard — P5 resolved ([1bb76b0](https://github.com/korchasa/flowai/commit/1bb76b0df666b2f7cd4c812941b2dc308a168a36))
* update whiteboard — P6 partially resolved ([bc7ffcf](https://github.com/korchasa/flowai/commit/bc7ffcffd527fd618fa913e4664af527b945b00a))
* **versioning:** add draft spec for per-skill semantic versioning ([b60d3cd](https://github.com/korchasa/flowai/commit/b60d3cdcc55b7ad13dcf60464592eb6ba2448581))


### Chores

* **benchmarks:** tune scenario timeouts, interactive mode, and params ([ee2578f](https://github.com/korchasa/flowai/commit/ee2578f1eef9c5c71c377b8f06a789c64a67bab6))
* **release:** 0.3.3 ([42351c6](https://github.com/korchasa/flowai/commit/42351c655cfd9290ec17df1c661395d2be570854))
* **release:** 0.3.4 ([cd38415](https://github.com/korchasa/flowai/commit/cd384151be6c4025d1bca865b3db19f5a076cc12))
* **scripts:** add IDE environment detection utility script ([5a8679d](https://github.com/korchasa/flowai/commit/5a8679de2cfa93b34f372e209c70873ed49dba04))

### [0.3.4](https://github.com/korchasa/flowai/compare/v0.3.2...v0.3.4) (2026-03-23)


### Features

* **benchmarks:** add 25 new benchmark scenarios for framework skills ([1e2cb74](https://github.com/korchasa/flowai/commit/1e2cb7434240d0c07b34374e36ba87c3f78afc2f))
* **benchmarks:** migrate to stream-json, add NO_COLOR support, skip logic ([cf8fb0b](https://github.com/korchasa/flowai/commit/cf8fb0b3513e73981d94b8d9508ea18d875a18d4))
* **cli:** interactive update prompt with deno.lock pinning fix ([601f75f](https://github.com/korchasa/flowai/commit/601f75f80a8fc77e73902666283f5ab7593461e2))
* **framework:** add flowai-update skill and CLI IDE context guard ([95945d5](https://github.com/korchasa/flowai/commit/95945d5a9abd377629f15b902c3abb95b29dd994))
* **framework:** enrich variant analysis with Risks and Trade-offs ([a0a66b7](https://github.com/korchasa/flowai/commit/a0a66b733e83c29352880a09ef4e14f0a528900e))
* **scripts:** auto-disable ANSI colors when running under Claude Code ([252981c](https://github.com/korchasa/flowai/commit/252981c5a86731b267ce1aea287d4956c89ff58f))


### Bug Fixes

* **benchmarks:** add interactive mode to review scenarios (P3) ([3ed58ee](https://github.com/korchasa/flowai/commit/3ed58ee1ae16ae8343647c2a9e13a7269b1eac97))
* **benchmarks:** fix P5 strict checklists — skill fixes and interactive mode ([7c8830b](https://github.com/korchasa/flowai/commit/7c8830bb68b5b6229b189c1d5dbc98943f77ce9d))
* **benchmarks:** fix P6 deterministic failures in flowai-commit scenarios ([82106ad](https://github.com/korchasa/flowai/commit/82106ada5df2631758f7b14db7e9985657b89efe))
* **benchmarks:** switch engineer-skill/subagent scenarios to .cursor/ to avoid CLI write block ([f8a6709](https://github.com/korchasa/flowai/commit/f8a670952fb19f8d00a6a171589a330c1dce6813))
* **cli:** add explicit type annotation to cliffy action callbacks ([46b145f](https://github.com/korchasa/flowai/commit/46b145f26176f1cae0e730103e312dd6cfec89fd))
* **framework:** use system temp dir instead of _research_tmp in deep-research skill ([0e45167](https://github.com/korchasa/flowai/commit/0e4516750b941a71cecfe80002199369b15d247d))


### Code Refactoring

* **framework:** remove flowai-skill-ai-skel-ts (moved to ai-skel-ts library) ([23f6e5d](https://github.com/korchasa/flowai/commit/23f6e5d541bf0eab469776ee07d1637f4b37113c))
* **skills:** rename flowai-skill-manage-github-tickets-by-mcp → flowai-skill-manage-github-tickets ([3f064c6](https://github.com/korchasa/flowai/commit/3f064c6cd9a3b04fa9e44947f29935366ee28117))
* **skills:** rename flowai-skill-playwright-cli → flowai-skill-browser-automation ([c4d955b](https://github.com/korchasa/flowai/commit/c4d955bb685734c0c882eca8a9fd55cf3d6da230))


### Agent Changes

* add Benchmark TDD flow to project instructions ([2f2f2e3](https://github.com/korchasa/flowai/commit/2f2f2e39061cf8d377851f90d0e4bdcc00dbc4b5))
* **flowai-commit:** add suggest-reflect step after commit ([8cddd55](https://github.com/korchasa/flowai/commit/8cddd55441767c254a9efe7eae4d0bc962cf8ecd))


### Tests

* **flowai-review-and-commit:** add suggest-reflect benchmark scenarios ([1ebf235](https://github.com/korchasa/flowai/commit/1ebf2352d4dbda67a140cbd8fb60f908103ee9d1))


### Documentation

* clean whiteboard — only remaining TODO items ([f8304b2](https://github.com/korchasa/flowai/commit/f8304b242f582ddff1ab6bc24adbb2bac0f4871c))
* update whiteboard — ai-skel-ts removed from framework ([f85f077](https://github.com/korchasa/flowai/commit/f85f077d0774b2c058dbd9558d5ec700dc0dc066))
* update whiteboard — P4 resolved ([b3dee86](https://github.com/korchasa/flowai/commit/b3dee8619f99b14f30f27c3391747cfd5aa9a4e8))
* update whiteboard — P5 resolved ([1bb76b0](https://github.com/korchasa/flowai/commit/1bb76b0df666b2f7cd4c812941b2dc308a168a36))
* update whiteboard — P6 partially resolved ([bc7ffcf](https://github.com/korchasa/flowai/commit/bc7ffcffd527fd618fa913e4664af527b945b00a))
* **versioning:** add draft spec for per-skill semantic versioning ([b60d3cd](https://github.com/korchasa/flowai/commit/b60d3cdcc55b7ad13dcf60464592eb6ba2448581))


### Chores

* **benchmarks:** tune scenario timeouts, interactive mode, and params ([ee2578f](https://github.com/korchasa/flowai/commit/ee2578f1eef9c5c71c377b8f06a789c64a67bab6))
* **release:** 0.3.3 ([42351c6](https://github.com/korchasa/flowai/commit/42351c655cfd9290ec17df1c661395d2be570854))
* **scripts:** add IDE environment detection utility script ([5a8679d](https://github.com/korchasa/flowai/commit/5a8679de2cfa93b34f372e209c70873ed49dba04))

### [0.3.3](https://github.com/korchasa/flowai/compare/v0.3.2...v0.3.3) (2026-03-23)


### Features

* **benchmarks:** add 25 new benchmark scenarios for framework skills ([1e2cb74](https://github.com/korchasa/flowai/commit/1e2cb7434240d0c07b34374e36ba87c3f78afc2f))
* **benchmarks:** migrate to stream-json, add NO_COLOR support, skip logic ([cf8fb0b](https://github.com/korchasa/flowai/commit/cf8fb0b3513e73981d94b8d9508ea18d875a18d4))
* **cli:** interactive update prompt with deno.lock pinning fix ([601f75f](https://github.com/korchasa/flowai/commit/601f75f80a8fc77e73902666283f5ab7593461e2))
* **framework:** add flowai-update skill and CLI IDE context guard ([95945d5](https://github.com/korchasa/flowai/commit/95945d5a9abd377629f15b902c3abb95b29dd994))
* **framework:** enrich variant analysis with Risks and Trade-offs ([a0a66b7](https://github.com/korchasa/flowai/commit/a0a66b733e83c29352880a09ef4e14f0a528900e))
* **scripts:** auto-disable ANSI colors when running under Claude Code ([252981c](https://github.com/korchasa/flowai/commit/252981c5a86731b267ce1aea287d4956c89ff58f))


### Bug Fixes

* **benchmarks:** add interactive mode to review scenarios (P3) ([3ed58ee](https://github.com/korchasa/flowai/commit/3ed58ee1ae16ae8343647c2a9e13a7269b1eac97))
* **benchmarks:** fix P5 strict checklists — skill fixes and interactive mode ([7c8830b](https://github.com/korchasa/flowai/commit/7c8830bb68b5b6229b189c1d5dbc98943f77ce9d))
* **benchmarks:** fix P6 deterministic failures in flowai-commit scenarios ([82106ad](https://github.com/korchasa/flowai/commit/82106ada5df2631758f7b14db7e9985657b89efe))
* **benchmarks:** switch engineer-skill/subagent scenarios to .cursor/ to avoid CLI write block ([f8a6709](https://github.com/korchasa/flowai/commit/f8a670952fb19f8d00a6a171589a330c1dce6813))
* **framework:** use system temp dir instead of _research_tmp in deep-research skill ([0e45167](https://github.com/korchasa/flowai/commit/0e4516750b941a71cecfe80002199369b15d247d))


### Code Refactoring

* **framework:** remove flowai-skill-ai-skel-ts (moved to ai-skel-ts library) ([23f6e5d](https://github.com/korchasa/flowai/commit/23f6e5d541bf0eab469776ee07d1637f4b37113c))
* **skills:** rename flowai-skill-manage-github-tickets-by-mcp → flowai-skill-manage-github-tickets ([3f064c6](https://github.com/korchasa/flowai/commit/3f064c6cd9a3b04fa9e44947f29935366ee28117))
* **skills:** rename flowai-skill-playwright-cli → flowai-skill-browser-automation ([c4d955b](https://github.com/korchasa/flowai/commit/c4d955bb685734c0c882eca8a9fd55cf3d6da230))


### Agent Changes

* add Benchmark TDD flow to project instructions ([2f2f2e3](https://github.com/korchasa/flowai/commit/2f2f2e39061cf8d377851f90d0e4bdcc00dbc4b5))
* **flowai-commit:** add suggest-reflect step after commit ([8cddd55](https://github.com/korchasa/flowai/commit/8cddd55441767c254a9efe7eae4d0bc962cf8ecd))


### Tests

* **flowai-review-and-commit:** add suggest-reflect benchmark scenarios ([1ebf235](https://github.com/korchasa/flowai/commit/1ebf2352d4dbda67a140cbd8fb60f908103ee9d1))


### Documentation

* clean whiteboard — only remaining TODO items ([f8304b2](https://github.com/korchasa/flowai/commit/f8304b242f582ddff1ab6bc24adbb2bac0f4871c))
* update whiteboard — ai-skel-ts removed from framework ([f85f077](https://github.com/korchasa/flowai/commit/f85f077d0774b2c058dbd9558d5ec700dc0dc066))
* update whiteboard — P4 resolved ([b3dee86](https://github.com/korchasa/flowai/commit/b3dee8619f99b14f30f27c3391747cfd5aa9a4e8))
* update whiteboard — P5 resolved ([1bb76b0](https://github.com/korchasa/flowai/commit/1bb76b0df666b2f7cd4c812941b2dc308a168a36))
* update whiteboard — P6 partially resolved ([bc7ffcf](https://github.com/korchasa/flowai/commit/bc7ffcffd527fd618fa913e4664af527b945b00a))
* **versioning:** add draft spec for per-skill semantic versioning ([b60d3cd](https://github.com/korchasa/flowai/commit/b60d3cdcc55b7ad13dcf60464592eb6ba2448581))


### Chores

* **benchmarks:** tune scenario timeouts, interactive mode, and params ([ee2578f](https://github.com/korchasa/flowai/commit/ee2578f1eef9c5c71c377b8f06a789c64a67bab6))
* **scripts:** add IDE environment detection utility script ([5a8679d](https://github.com/korchasa/flowai/commit/5a8679de2cfa93b34f372e209c70873ed49dba04))

### [0.3.2](https://github.com/korchasa/flowai/compare/v0.3.1...v0.3.2) (2026-03-20)


### Features

* **cli:** delete excluded framework resources during sync ([94bd68b](https://github.com/korchasa/flowai/commit/94bd68beede533818f137b70976a869e2f464a77))

### [0.3.1](https://github.com/korchasa/flowai/compare/v0.3.0...v0.3.1) (2026-03-20)


### Features

* **cli:** implement cross-IDE user resource sync (FR-DIST.USER-SYNC, FR-DIST.MAPPING) ([09adfdf](https://github.com/korchasa/flowai/commit/09adfdf0d7e3f62cdefc86e5a38ed9ea2dc0a6a2))
* **framework:** add clarity review criterion and TS no-nested-ternary rule ([c122a31](https://github.com/korchasa/flowai/commit/c122a31c5f631adab4e5dbfbdd3a17107006d818))
* **sync:** implement user commands synchronization across IDEs ([b5a2320](https://github.com/korchasa/flowai/commit/b5a23203a1c0383a340ee5be20910ab1013d0ff5))


### Tests

* **cli:** add commands field to FlowConfig fixtures in main_test ([38179d7](https://github.com/korchasa/flowai/commit/38179d772525ac958009aab6637f1f77cb239e68))

## 0.3.0 (2026-03-16)


### ⚠ BREAKING CHANGES

* All skill names changed from af-* to flowai-*.
Commands like /af-commit are now /flowai-commit.

Co-authored-by: Cursor <cursoragent@cursor.com>
* **rules:** Rule files moved from .mdc extension to RULE.md in directories.
Cursor IDE will automatically detect and load rules from new structure.

### Features

* add 'fail fast' strategy to AGENTS rules ([90f2b32](https://github.com/korchasa/flowai/commit/90f2b32d130e2f60dfc34533ed54ed227c9a0c19))
* add af-skill-generate-code and context-inefficiency benchmark scenario ([309ab83](https://github.com/korchasa/flowai/commit/309ab83fb3628337e2aacf62322e98805e9b7af8))
* add Cursor desktop and OpenCode guides to skills catalog ([d276c82](https://github.com/korchasa/flowai/commit/d276c82b2c97861aa8bc9dddde1ec6378a0eda17))
* add flowai-skill-playwright-cli and update requirements ([78a707b](https://github.com/korchasa/flowai/commit/78a707bc1dd4b4ccd50e773c9485b53d3641eb78))
* add how-to guide for writing DEP ([3ba2c47](https://github.com/korchasa/flowai/commit/3ba2c471f3323625bff850c054fdf07cb8b060b6))
* add new commands and enhance existing development workflows ([a0dae30](https://github.com/korchasa/flowai/commit/a0dae305be7d979da789483000b27d1a12054e7a))
* add QA command for task verification and cleanup ([59d3be4](https://github.com/korchasa/flowai/commit/59d3be4bf4569749700c73f43b93de17bdfa6e6c))
* add reflect command ([131725a](https://github.com/korchasa/flowai/commit/131725a3ec79e43bda284d0a55ad9d4d9c2261c1))
* **af-engineer-skill:** add references and scripts ([d6f29a5](https://github.com/korchasa/flowai/commit/d6f29a514f0bfec00367b8ce58d8008fe00d1ac6))
* **af-engineer-subagent:** add subagent engineering skill ([7f80f98](https://github.com/korchasa/flowai/commit/7f80f986d3a5a2f00a80802dfb9168ffb7214a56))
* **af-init:** add component inventory and dev commands configuration ([8c2e111](https://github.com/korchasa/flowai/commit/8c2e1118e09a449418e321b9869d472c6f76d9b5))
* **af-init:** add standard interface commands to project template ([21ac7a9](https://github.com/korchasa/flowai/commit/21ac7a95298e72cb98f410a1b5f578de308c7666))
* **af-init:** improve brownfield workflow and agent template ([a20ccb9](https://github.com/korchasa/flowai/commit/a20ccb98cb4808f1f07fe80aefc90f7b4d7d5ab5))
* **af-init:** move documentation generation from script to agent ([e89e02f](https://github.com/korchasa/flowai/commit/e89e02ffebf0578203aedf32e2d4668fc9d0de9f))
* **af-init:** preserve PROJECT_RULES on AGENTS regeneration ([67e18eb](https://github.com/korchasa/flowai/commit/67e18eb5b181da6233ed348dc78e40d009ce6522))
* **af-setup-code-style:** add Deno and strict TS setup skills ([0aa6e71](https://github.com/korchasa/flowai/commit/0aa6e71de005f5da0dee33164eb57ef0170cd71b))
* **af-skill-ai-skel-ts:** add AI agent scaffold skill ([99dd2f0](https://github.com/korchasa/flowai/commit/99dd2f04b28d83b8e22c02e8f0ffd8b77d28e3ce))
* **af-skill-configure-deno-commands:** add skill for standardizing deno dev commands ([11cfa67](https://github.com/korchasa/flowai/commit/11cfa673df91d00e77475935477f18ac184ff976))
* **af-skill-configure-strict-typescript:** add strict TypeScript configuration skill ([e642440](https://github.com/korchasa/flowai/commit/e642440664e7e6cbbb8709cf8fcaeff35eb95c97))
* **agents:** add flowai-console-expert subagent ([43b6f1d](https://github.com/korchasa/flowai/commit/43b6f1dbdd08cc63528d4f1c75fe775bd5e163b0))
* **agents:** add general-purpose executor agent ([9dbb83a](https://github.com/korchasa/flowai/commit/9dbb83aed727d9d9cffbdd9f0864a22126cebba7))
* **agents:** specify default models for prompt-engineer and skill-executor ([3fdc46d](https://github.com/korchasa/flowai/commit/3fdc46dc7499c5ac780730bc924f1c439af37efe))
* **bench:** implement secure dockerized execution for benchmarks ([#4](https://github.com/korchasa/flowai/issues/4)) ([8c31c9a](https://github.com/korchasa/flowai/commit/8c31c9a021bcdca087fbe0a5a07816dfe12bae46))
* **benchmarks:** add multi-IDE support via adapter pattern ([#6](https://github.com/korchasa/flowai/issues/6)) ([20511fc](https://github.com/korchasa/flowai/commit/20511fc83cc18b719abc553d1fef60caca3da0a2))
* **catalog:** add flowai-commit agent for automated commit workflow ([3201199](https://github.com/korchasa/flowai/commit/32011996d074e25debb68f953d77c11de5cdcd91))
* **catalog:** add flowai-convert-cursor-to-claude skill ([5c654a1](https://github.com/korchasa/flowai/commit/5c654a1138793b2df86698ab83665548638d654e))
* **catalog:** add flowai-execute and flowai-plan agents ([bc10689](https://github.com/korchasa/flowai/commit/bc106897a40b26335c0523a4f02d476c82da051d))
* **catalog:** add flowai-skill-deep-research skill and flowai-deep-research-worker agent ([46e6500](https://github.com/korchasa/flowai/commit/46e65000775e8d7228546d3235a60e74280b39d0))
* **catalog:** disable model invocation for engineer and setup skills ([9542504](https://github.com/korchasa/flowai/commit/9542504107da35bbef0a29d1f2cb81578b078e9d))
* command to build CLAUDE.md file using .cursor/rules ([cf61412](https://github.com/korchasa/flowai/commit/cf614122e8ab05b7c17624de5f7e0193f3471cc5))
* **commands:** add analysis and gap filling step to execution workflow ([e4a4560](https://github.com/korchasa/flowai/commit/e4a45603b46657e5862b7b329728e90b7d1122b8))
* **commands:** add docs-check command ([02496dd](https://github.com/korchasa/flowai/commit/02496dd325ebfec38052fac18829cb5eaf450574))
* **commands:** add error analysis workflow ([142a80d](https://github.com/korchasa/flowai/commit/142a80dfa95ffa96c7237a440721be95cb795c04))
* **commands:** add maintenance command ([adf433b](https://github.com/korchasa/flowai/commit/adf433bfb1979767c1c032bcc10adf8f6725d018))
* **commands:** add task-build-claude-md command with implementation script ([5a61c3c](https://github.com/korchasa/flowai/commit/5a61c3cd895cdcd1085481fa5c75389bf5db93be))
* **commands:** automate commit workflow with atomic grouping ([a9aff30](https://github.com/korchasa/flowai/commit/a9aff304e93fc4074bccee01ad8fe6f4f34d7ef4))
* **commands:** enhance init command workflow ([281ef36](https://github.com/korchasa/flowai/commit/281ef3668b0cb2afbb0222e545ff4bc554ce3bee))
* **commands:** implement GODS framework and chat-first reasoning in planning ([8e0650a](https://github.com/korchasa/flowai/commit/8e0650a6b139ddecc0f7ab297f1200f41777b548))
* **commands:** reorganize tasks and add agent rules ([06d4a9e](https://github.com/korchasa/flowai/commit/06d4a9eae38d5b15f51145e89c4c37d33f8bbf25))
* **core:** integrate AskQuestion and SwitchMode tools for interactive clarification ([983aee1](https://github.com/korchasa/flowai/commit/983aee1a3a32cb13e4fbf2ba8475911ceb675cc3))
* **cursor:** add initial task docs, rule guidelines, and design docs; update README and .gitignore ([803f98a](https://github.com/korchasa/flowai/commit/803f98aa1a34847ab69f97362de240bf72303e71))
* **deno-cli:** add skill for managing Deno capabilities via CLI ([000f935](https://github.com/korchasa/flowai/commit/000f935d9f6a704f357ae2fa0ecc34641d1b6729))
* **deno-deploy:** add local debugging protocol and unstable APIs guide ([1a51157](https://github.com/korchasa/flowai/commit/1a51157b6329de3d818376dc497bc4fee081e8a1))
* **deno-deploy:** add skill for managing Deno Deploy cloud services ([5795845](https://github.com/korchasa/flowai/commit/57958450c15edc47dc4fc0ee824e69388bd4cd5a))
* **devcontainer:** add Claude Code auth forwarding from macOS Keychain ([e4bedee](https://github.com/korchasa/flowai/commit/e4bedeeb19c029ae417d26d2b1bf33e3dff24751))
* enforce IDE-agnostic language and update skills ([d8e2702](https://github.com/korchasa/flowai/commit/d8e2702a5b199152bc2a158e6d3be690521d52ba))
* **engineer:** add OpenCode IDE support to all engineer skills and docs ([21052e0](https://github.com/korchasa/flowai/commit/21052e00d10bfaab740da2fbce7f905646e1d9f2))
* **flowai-cli:** add self-update check against JSR registry ([0b9ce3b](https://github.com/korchasa/flowai/commit/0b9ce3b4adb967fe7c17d42df30dfbdd5f015f65))
* **flowai-commit:** enforce consolidation-first commit grouping ([1ee2c06](https://github.com/korchasa/flowai/commit/1ee2c0639eb5879a140ccff8857ad6961680e97b))
* **flowai-init:** add 'no tables in chat' rule to AGENTS template ([4c3168c](https://github.com/korchasa/flowai/commit/4c3168cb87ef7fa525af9eb1079bb8b4319cd5b8))
* **flowai-init:** add CLAUDE.md symlink step and fix evidence references (FR-INIT.SYMLINK) ([373108d](https://github.com/korchasa/flowai/commit/373108d05aa6a8380c553076a1a4290869f94841))
* **flowai-init:** add Deno tooling option to interview ([00c2d87](https://github.com/korchasa/flowai/commit/00c2d87eb23438b181aa07cd82e15eeb1553a824))
* **flowai-init:** split AGENTS.md into domain-scoped files with manifest-driven generation (FR-INIT.IDEMPOTENT) ([c03c336](https://github.com/korchasa/flowai/commit/c03c3361486afb94f8d8732b22bc353f65bc8557))
* **flowai-reflect:** add undocumented discoveries and automation opportunity analysis ([fec9efa](https://github.com/korchasa/flowai/commit/fec9efa101a5aa25389e6a741d1fcbf21f47b8b4))
* **flowai-skill-executor:** add introduce-yourself step to workflow ([817105e](https://github.com/korchasa/flowai/commit/817105e1cd38f7b8fcc6742b669c06031be64b9f))
* **flowai-skill-setup-ai-ide-devcontainer:** add feature discovery step and catalog (FR-DEVCONTAINER.FEATURE-DISCOVERY) ([e1b7a19](https://github.com/korchasa/flowai/commit/e1b7a19dac5d5bd1d5924b0ab19dc372030350d7))
* **flowai-skill-setup-ai-ide-devcontainer:** complete FR-DEVCONTAINER coverage gaps (SDS, benchmarks, multi-CLI) ([73b41b5](https://github.com/korchasa/flowai/commit/73b41b5b61210a99fb383d241ba0100f9c48f638))
* implement unified benchmark trace with dashboard and skill grouping ([c6bad40](https://github.com/korchasa/flowai/commit/c6bad40c409634efbd310446a28a27d69fd592be))
* **install:** add --yes/-y flag for non-interactive execution ([19f343c](https://github.com/korchasa/flowai/commit/19f343ccd01fccccf2de5cc9032d8fd59eeb177d))
* **install:** add global installer for per-IDE agent/skill symlinks (FR-DIST) ([c7852b7](https://github.com/korchasa/flowai/commit/c7852b744e2c89309ea9a5132e4a948b11a4dc28))
* **install:** add remote execution and shell bootstrap (FR-DIST.UPDATE) ([14e7566](https://github.com/korchasa/flowai/commit/14e75668dea51af8f32cbf17cccdf6ea2265a6b8))
* integrate product vision into AGENTS.md and af-init ([#5](https://github.com/korchasa/flowai/issues/5)) ([b94c58f](https://github.com/korchasa/flowai/commit/b94c58fbe0bd3f50e4f6746e7b86574d3f7216fb))
* introduce .dev/ SPOT directory with symlink-based multi-IDE support ([0a06808](https://github.com/korchasa/flowai/commit/0a06808246fce83096927d4018d7c4a2ac1c86ff))
* **maintenance:** add deno task scripts and config ([ec05c00](https://github.com/korchasa/flowai/commit/ec05c00a561c9081509ab38ca943d8cb28c24f91))
* **mcp:** add configuration for Cloudflare browser rendering server ([9511db5](https://github.com/korchasa/flowai/commit/9511db5b4c4aa3d5862dbcff2fd349fc6c75833c))
* migrate framework Python scripts to Deno/TypeScript (FR-PY-MIGRATE) ([0870e17](https://github.com/korchasa/flowai/commit/0870e17c5360cebfa137af867adb9e0385b817bd))
* **planning:** add Plan Persistence rule to save plans to whiteboard.md ([85c40d3](https://github.com/korchasa/flowai/commit/85c40d3984863ae27a1c683a5e49c6942fd5a91a))
* replace /check with iterative /check-and-fix command ([1ac758e](https://github.com/korchasa/flowai/commit/1ac758e5ba08fbe501fb27715a8b2a986cd99d25))
* **rules:** add skill-creator guide and scripts ([214a74f](https://github.com/korchasa/flowai/commit/214a74fb24b6b91d704436f33d6dcdce14c39131))
* **settings:** update permissions and add additional directories for flowai-review-and-commit ([e0829b6](https://github.com/korchasa/flowai/commit/e0829b6f7d9d714cb60cd18a0d332d84881d2198))
* **skills:** add flowai-spec skill for phased feature specifications ([a2314a3](https://github.com/korchasa/flowai/commit/a2314a3337814d4a14136242ef7fea21633befac))
* **skills:** close FR-UNIVERSAL.SCRIPTS–FR-UNIVERSAL.DISCOVERY universal skill & script requirements ([bf7f1cb](https://github.com/korchasa/flowai/commit/bf7f1cb5279323152936c0077651fa5464d5248f))
* **skills:** enforce FR-UNIVERSAL.AGENTSKILLS agentskills.io compliance with validation and fixes ([188ebf0](https://github.com/korchasa/flowai/commit/188ebf008c7985126cc50cd6a4f693e1fb7b0cce))
* **skills:** enforce FR-UNIVERSAL.XIDE-PATHS cross-IDE script path resolution ([5ecbf09](https://github.com/korchasa/flowai/commit/5ecbf0970d3e116c78f0d98a4f6c0bdca8d7260b))
* **skill:** update flowai-skill-analyze-context to focus on total cost estimation ([79c0ba4](https://github.com/korchasa/flowai/commit/79c0ba4c76249874ccd85160d0397486a5907877))
* universal agent format + flowai-cli distribution ([#7](https://github.com/korchasa/flowai/issues/7)) ([2ba936b](https://github.com/korchasa/flowai/commit/2ba936b73c0da788a8a0022fcd33c3ff3c82168e))
* update /investigate command with iterative workflow ([e6ac7ce](https://github.com/korchasa/flowai/commit/e6ac7ce2503349f3998a96268a8c3d5cbf632aa0))
* update commands ([7a81c8c](https://github.com/korchasa/flowai/commit/7a81c8cde4c259999dc6ef851f09da4b14430801))


### Bug Fixes

* **af-init:** align documentation generation with standard schema ([2545cba](https://github.com/korchasa/flowai/commit/2545cba1c6ffe5ead9f813a906a25e377d39c8d4))
* **ci:** exclude integration tests from check (API/env dependent) ([f1d1bed](https://github.com/korchasa/flowai/commit/f1d1bedb1ae8222bd3e32258bf638f8042e61dd6))
* **ci:** pass --config to deno install --global in verify-install job ([d981bda](https://github.com/korchasa/flowai/commit/d981bda3fa1cb09073eb23e7622aae6a27ce6faf))
* **devcontainer:** switch Claude Code install to official script, expand features catalog ([94d58e5](https://github.com/korchasa/flowai/commit/94d58e5c49e8ac4611ddb40905dc3f33b260a24d))
* **docs:** correct spelling in plan.md instructions ([56a2429](https://github.com/korchasa/flowai/commit/56a242954cd1022586d4bcb11da9ca2778d11878))
* **docs:** remove extraneous command from installation instructions in README ([ac69862](https://github.com/korchasa/flowai/commit/ac69862837722ebaa19044e7b46bed42e07fd03a))
* **docs:** update AGENT.md references to AGENTS.md ([78f6e40](https://github.com/korchasa/flowai/commit/78f6e404af182e644d6fa2ada431f4b036135bca))
* **docs:** update migration instructions in migrate-run-ts.md ([e8083a0](https://github.com/korchasa/flowai/commit/e8083a0500f8aa0cded2fe350aec043b3316c31f))
* **install:** use full jsr: specifier for remote execution compatibility ([5d93a81](https://github.com/korchasa/flowai/commit/5d93a813fa8707a34bea21a59154bf35561b8b6e))
* **publish:** un-exclude generated artifacts from JSR publish ([69b9e62](https://github.com/korchasa/flowai/commit/69b9e62f81b9615e28aa6f1249f231db5213d960))
* **scripts:** use jsr: specifier in generate_agents.ts; close 10 FR-UNIVERSAL criteria ([76d3c53](https://github.com/korchasa/flowai/commit/76d3c536b559ffc9ea356aca39026b027d5ed1e5))
* **security:** bump next from ^14.0.0 to ^15.5.10 in benchmark fixture ([c0592c9](https://github.com/korchasa/flowai/commit/c0592c9229e22b22885acdf310aa223432235e50))
* **skills:** correct script path in analyze-context and remove --headed flag from playwright-cli ([3fd94dc](https://github.com/korchasa/flowai/commit/3fd94dcefe000a10c8675dca3de0fb5ab2c5c9a6))


### Tests

* **af-init:** add idempotency benchmark scenario ([342555b](https://github.com/korchasa/flowai/commit/342555b5980797f911fdb5437d0634a873e2fc66))
* **bench:** add af-init benchmarks and fix runner ([ccf714c](https://github.com/korchasa/flowai/commit/ccf714c0026d2a03e6d11b43e6a4d8ee9749978b))


### Build System

* exclude markdown files from formatting, cleanup worktrees.json ([00b6fbd](https://github.com/korchasa/flowai/commit/00b6fbd07a032de49cb3812fdfccc1ad239dece8))
* update deno.lock ([69097c7](https://github.com/korchasa/flowai/commit/69097c7a89e19a5486ee616a7a00964d6c7ae4cc))


### Agent Changes

* add evidence links to all acceptance criteria in SRS ([06ce46b](https://github.com/korchasa/flowai/commit/06ce46b4502cc101cf74d5f3574e992807c0e08c))
* add relative paths rule to AGENTS.md and template ([45090d0](https://github.com/korchasa/flowai/commit/45090d0ca82971b978e8154a7e70202fadbc2b39))
* **AGENTS:** update guidelines to include post-session review and evidence provision ([b129998](https://github.com/korchasa/flowai/commit/b129998cc5df2e7f5c94fd955a5c5be4e951c309))
* fix inconsistent punctuation in project rules ([96c6cc7](https://github.com/korchasa/flowai/commit/96c6cc759be4f5f361ca0723bbec00944c0de342))
* **flowai-commit:** add agent: commit type for AI config changes (FR-AGENT-COMMIT) ([db3cb60](https://github.com/korchasa/flowai/commit/db3cb60f13c414efebffc847f77a23b3a0fbc50e))
* **flowai-engineer-hook:** add cross-IDE hook docs and benchmarks (FR-HOOK-DOCS, FR-HOOK-SKILL, FR-CMD-UNIFY) ([7d23c9c](https://github.com/korchasa/flowai/commit/7d23c9c0674e3e8bc0c19c535ce9aad5b7315e3d))
* **flowai-review-and-commit:** implement composite review+commit command (FR-REVIEW-COMMIT) ([9621cc4](https://github.com/korchasa/flowai/commit/9621cc40f9edd54d59648ab8d3efe8e796472e3c))
* **flowai-review:** inline workflows in composite skill, add sync check and benchmarks ([e77441a](https://github.com/korchasa/flowai/commit/e77441a386f7d08def7d2c71a16f50ae58c30ad3))
* **flowai-skill-setup-ai-ide-devcontainer:** add devcontainer skill, update FR-DIST/FR-DEVCONTAINER requirements ([12778b2](https://github.com/korchasa/flowai/commit/12778b2456c068da23b691afc64791f4c91ec601))
* replace bare @std/ specifiers with jsr: for standalone script independence ([347f414](https://github.com/korchasa/flowai/commit/347f414767d15e4bd16c4db53cf07655e6ca2f79))
* replace flowai-qa with flowai-review combining QA and code review roles ([c7d2bc2](https://github.com/korchasa/flowai/commit/c7d2bc2da7a55c5f22d81b3a364a78449ee6a40f))
* resolve IDE support scope to 3 IDEs (FR-IDE-SCOPE) ([1380901](https://github.com/korchasa/flowai/commit/13809019f64d0e4498274f1e2b2a28e6886357e5))
* use portable <this-skill-dir> placeholder for bundled script paths ([2d623bc](https://github.com/korchasa/flowai/commit/2d623bc0f683d5f752d079e52edc3464b43adae8))


### Documentation

* add CODE STYLE RULES for Go (Golang) ([f3eb48e](https://github.com/korchasa/flowai/commit/f3eb48ed2e8fe312844f9be34a7d654a4638f805))
* add code-style-typescript-deno.mdc with TS strict rules and Deno import guidance ([950352c](https://github.com/korchasa/flowai/commit/950352cdb1bf8b5c19a97f2177d1c56983695047))
* add deno-cli and deno-deploy to skill coverage matrix ([41a7687](https://github.com/korchasa/flowai/commit/41a7687731416db562461e6c9a32e9fbf22e3eb7))
* add descriptions to command files for clarity and guidance ([d693965](https://github.com/korchasa/flowai/commit/d6939651e4106bed7a770ea43716d8f61c2b3b51))
* add flowai-review-and-commit command and FR-REVIEW-COMMIT/FR-INIT.SYMLINK requirements ([2738a4b](https://github.com/korchasa/flowai/commit/2738a4bdd402c92f6c2e6110c5ed248027f411f8))
* add guidelines for writing Product Requirements Documents (PRD) ([5dac365](https://github.com/korchasa/flowai/commit/5dac3654fcfb6f5b2addaed7bea734161c916667))
* add IDE comparison and research documents ([1798c61](https://github.com/korchasa/flowai/commit/1798c61c9d2c81d43e739bbdb6a21f9ee7c8edfe))
* add JSDoc to benchmark lib, rewrite scripts/AGENTS.md, clean up duplicates ([cf79b38](https://github.com/korchasa/flowai/commit/cf79b38f9bd910fd608cf8b0213d096632cddfcf))
* add local check requirement for CI/CD edits ([953f750](https://github.com/korchasa/flowai/commit/953f750147345339d4608b2caa7fb5cffa213df6))
* add logic-focused testing rule to AGENTS.md and template ([4534ab7](https://github.com/korchasa/flowai/commit/4534ab73d5224444299fea69319a351893966607))
* add maintenance report to whiteboard ([eb287d1](https://github.com/korchasa/flowai/commit/eb287d107c84df291ac4fcb83a4174988f1d791b))
* add PoC rules and update task-answer command ([f294092](https://github.com/korchasa/flowai/commit/f294092858f81e2dfe5e6672c3a286d2276f53b7))
* add Product Vision Document creation command and guidelines ([378f005](https://github.com/korchasa/flowai/commit/378f0052659c67c67a0f954756907ed50d73ad59))
* add task planning and Q&A session guidelines ([28592a3](https://github.com/korchasa/flowai/commit/28592a3c123ab36ce3d6028faae7d262d4dec9f3))
* add task-create-rule.md for Cursor IDE rule development ([7d1c75d](https://github.com/korchasa/flowai/commit/7d1c75d125d5904dee102c451475990c856ad787))
* add task-write-skill.md for IDE Skill file creation ([fbe96f2](https://github.com/korchasa/flowai/commit/fbe96f28b7e993b0b9154941d1ec8d334d3e5750))
* **af-do:** clarify skill overview description ([6728226](https://github.com/korchasa/flowai/commit/6728226572fc5a4a9cd8d2946f5bb4427ae12224))
* **agents:** clarify TDD RED step scope ([559a9b1](https://github.com/korchasa/flowai/commit/559a9b191c5b072329c70a940a3bf3569f35f7b8))
* **agents:** reformulate session-start doc reading rule ([a4241db](https://github.com/korchasa/flowai/commit/a4241db45e6623f0f535705ec88efc91d9fb2356))
* **bench:** enhance README with Docker isolation details and improved benchmark execution instructions ([cb3f50c](https://github.com/korchasa/flowai/commit/cb3f50cd5e28c5fe77b281b6fc2c546f220ca7ea))
* clarify documentation language requirements in RULE.md ([0e9b206](https://github.com/korchasa/flowai/commit/0e9b206d621702698cc9a176e559abaa702a263c))
* clarify GIT_PAGER usage in task-commit.md ([c66a70f](https://github.com/korchasa/flowai/commit/c66a70f895b801f1ef7b8a1abaee68657c8cfad9))
* cleanup docs and tighten commit workflow guidelines ([1ab7b79](https://github.com/korchasa/flowai/commit/1ab7b79381bb4e849b1939286f85efd59eb0c3a8))
* clear whiteboard after session ([d129065](https://github.com/korchasa/flowai/commit/d129065f4e7920f4697ca4f95ef2c0d3053f4055))
* **commands:** clarify commit and planning workflows ([4e9bb73](https://github.com/korchasa/flowai/commit/4e9bb732ca989f4d90ccc768f5fed135e59f014e))
* **commands:** sync task plan and do checklist ([d3a9207](https://github.com/korchasa/flowai/commit/d3a9207cbfa9c9a53a5d1d3ab520b0ce3f8cd36f))
* **cursor-desktop-guide:** add readonly field to subagent frontmatter schema ([9bf4a1f](https://github.com/korchasa/flowai/commit/9bf4a1fc4bab6dc9ba80104cd75e8c6f0ca21176))
* **cursor:** add task workflow docs and code style guidelines; remove legacy rules file ([217a4b1](https://github.com/korchasa/flowai/commit/217a4b1029da30eb92da10c5ce54254698d33ae2))
* delete CLAUDE.md ([d26d096](https://github.com/korchasa/flowai/commit/d26d0968ad231d575abcc6f948f533188b428fdf))
* enhance ides-difference documentation with dedicated AI ignore files and migration options for Claude Code ([4dcd0d5](https://github.com/korchasa/flowai/commit/4dcd0d5e7bf51007dcbf562df9b35dba36376560))
* enhance README and AGENTS.md with developer workflow and agent reference ([34e7ba7](https://github.com/korchasa/flowai/commit/34e7ba7248c482f9e9d4c96e44eb316ef54fab62))
* enhance README with comprehensive component lists and fixes ([231f8dc](https://github.com/korchasa/flowai/commit/231f8dcad37590d3ac52a86818e05de7dcd2f85b))
* enhance task planning guidelines in task-plan-with-qa.md ([39f1995](https://github.com/korchasa/flowai/commit/39f19959dece5c646648565e3035d851d15baec9))
* enhance task-execute.md for improved clarity and consistency ([6f6083b](https://github.com/korchasa/flowai/commit/6f6083bdf3fab53aa26b8455c6232d04e13c9973))
* expand documentation philosophy in README and update SRS ([4e04018](https://github.com/korchasa/flowai/commit/4e0401805ca43958c6854b397f455d880e837744))
* expand GIT_PAGER examples in RULE.md ([7d94e8d](https://github.com/korchasa/flowai/commit/7d94e8d9421845b9d874359d5b20dfd0ff8de1a9))
* expand IDE hooks comparison and add contributor dev setup to README ([3bb6914](https://github.com/korchasa/flowai/commit/3bb69142cdb5b0122e63ce6c94810149819b8319))
* **maintenance:** fix typo in todo_write tool name ([7751e2a](https://github.com/korchasa/flowai/commit/7751e2a0f99cc0199bd6670ce65149e6a7502db9))
* **maintenance:** remove explicit whiteboard.md filename references ([de7934a](https://github.com/korchasa/flowai/commit/de7934a8f2b15bbbc46403db7631b224c1899b4a))
* mark af-reflect as benchmarked in SRS ([658c8a9](https://github.com/korchasa/flowai/commit/658c8a9bf8f74fc32d60fd1406b0b81bb3d310d4))
* mark FR-HOOK-DOCS/15/16 criteria as done with evidence, clean up settings.json ([abeed16](https://github.com/korchasa/flowai/commit/abeed168a72173afb7ccaea4fd2a8081efed0e04))
* overhaul prompt engineering guides for instant and reasoning models ([77115d0](https://github.com/korchasa/flowai/commit/77115d0eef50bec7bbfa4b0c8254cc17811230eb))
* **readme:** simplify README description to refer to Cursor rules ([9bcb414](https://github.com/korchasa/flowai/commit/9bcb4146569de680d4fdb8e0a0a86ed6460c28f1))
* refine control primitives comparison documentation ([9014757](https://github.com/korchasa/flowai/commit/90147578e205b1f2478342d4244a5df8e79ff700))
* refine task planning guidelines in task-plan-with-qa.md ([2697d45](https://github.com/korchasa/flowai/commit/2697d450c6cc6c20d3eff1cd8b88243ca3ef9109))
* refresh IDE differences with footnotes and new sections ([e6d3091](https://github.com/korchasa/flowai/commit/e6d3091ed21bb881f76cb3dbcba1bae0dd9b9f81))
* reinforce GIT_PAGER usage in RULE.md ([be84ec9](https://github.com/korchasa/flowai/commit/be84ec99e845328a2fe7ae38721dc12d3417fb28))
* remove interactive clarification requirement and AskQuestion tool references ([f4f366d](https://github.com/korchasa/flowai/commit/f4f366d984bbfa3eef68e2e6d449c2e0822babec))
* remove obsolete RnD documents ([96f1cff](https://github.com/korchasa/flowai/commit/96f1cffbd98078bd58d3dc0ccc32167613b3d6a1))
* remove outdated task planning guidelines from task-plan-with-qa.md ([17655ae](https://github.com/korchasa/flowai/commit/17655aeb1ec39e7e9ed6a19647098bd1b85ce6f9))
* rename "Steps" section to "Todo List" in all command docs ([49acf23](https://github.com/korchasa/flowai/commit/49acf239daaf84c1f266d40295a563859caa90f8))
* reorganize R&D documents and add new research notes ([2e4b3a5](https://github.com/korchasa/flowai/commit/2e4b3a598aa878ae7d2dfa84c56c63d84769d2f0))
* **requirements:** add FR-INIT af-init, update FR-DOCS/FR-ONBOARD status ([820edbd](https://github.com/korchasa/flowai/commit/820edbd6d219da9416236394c2fac77cf6e875f3))
* **requirements:** mark FR-DEVCONTAINER.* as completed with evidence ([c3163bd](https://github.com/korchasa/flowai/commit/c3163bd24655affd607bbaae740939ae523aac3d))
* resolve 7 contradictions across SRS, SDS, and AGENTS.md ([e291e79](https://github.com/korchasa/flowai/commit/e291e79b8fa4e89df1bffd54cc397b19c86449b0))
* revise task-create-command documentation for clarity and structure ([dfaf635](https://github.com/korchasa/flowai/commit/dfaf63548bd2654c145d6caea81fdbd6f8f5a172))
* rewrite README with Assisted Engineering paradigm and multi-IDE focus ([7a6fdd1](https://github.com/korchasa/flowai/commit/7a6fdd12460ced0b79f587aa429f37f845126961))
* **rnd:** add Cursor subagent path to Custom Agents comparison ([abd1c2b](https://github.com/korchasa/flowai/commit/abd1c2b1c44b3d759e5af223df3ce3c43332b619))
* simplify CODE STYLE RULES for TypeScript ([46f433c](https://github.com/korchasa/flowai/commit/46f433c4658170038fbbc149de6d1e5d132d6cb4))
* standardize Key Principles bullets in README with renamed categories (Stages, Rules, Documentation, Project Maintenance, Howto) ([e5405a6](https://github.com/korchasa/flowai/commit/e5405a6a9a83891558347075eaff0e80b4675ac3))
* sync documentation with current command set and workflows ([6b07fd3](https://github.com/korchasa/flowai/commit/6b07fd3c0952444fa233ff0ab91c9ffa616f7bf5))
* sync documentation with new commands ([c091b51](https://github.com/korchasa/flowai/commit/c091b51f7ed655d5c089d486d0a8b383a49b2981))
* **task-build-claude-md:** add manual execution restrictions and checklist to CLAUDE.md build guidance ([c1d8b72](https://github.com/korchasa/flowai/commit/c1d8b7235fc93004dc7903e766a8daa0ab2a2691))
* **task-plan:** improve task planning workflow ([034f6e5](https://github.com/korchasa/flowai/commit/034f6e5cb812e51a1b80f36a00b35b10ccade8f8))
* update AGENTS.md generation instructions and checklist ([3353f3e](https://github.com/korchasa/flowai/commit/3353f3e1da4678e75a7edfd9782bc4a27af0d9db))
* update AGENTS.md with planning rules and dev commands ([1a3c7c8](https://github.com/korchasa/flowai/commit/1a3c7c89ce531026847655c6030eabf73b57319e))
* update available skills and commands in README ([ccf902b](https://github.com/korchasa/flowai/commit/ccf902b6ac717a3cbb685a3204f599b0210b8248))
* update command list and count in project documentation ([ae82a2a](https://github.com/korchasa/flowai/commit/ae82a2a491f359c226e11d4c91e6e5f5cf181d35))
* update command listings and remove references to non-existent run.ts ([fe6da16](https://github.com/korchasa/flowai/commit/fe6da16d57dda3c00c157437ec2e86930cd3f481))
* update command references in design and README ([e75e27e](https://github.com/korchasa/flowai/commit/e75e27eb7ccb1fc484c963f008f31ad9be8d07e7))
* update control primitives comparison for cursor rules ([6204350](https://github.com/korchasa/flowai/commit/6204350eb21052cb58a3b00eefaf3930059314c6))
* update documentation guidelines in RULE.md ([11ff605](https://github.com/korchasa/flowai/commit/11ff605408d53554ace1e8101350c18c8105be1f))
* update FR-INIT, FR-DIST.USER-SYNC, FR-HOOK-SKILL.3, FR-CMD-UNIFY.3 statuses based on implementation audit ([b43f3a5](https://github.com/korchasa/flowai/commit/b43f3a572593b64d059398a30790d16059b20940))
* update guide counts in requirements and design ([bc32117](https://github.com/korchasa/flowai/commit/bc32117e8bda8367befcf2efde224ca8851c9531))
* update ides-difference and whiteboard ([6e8d2bd](https://github.com/korchasa/flowai/commit/6e8d2bdd42cf7fc04b13d6b20d4787c4b93070c7))
* update planning commands and related documentation ([cb402ab](https://github.com/korchasa/flowai/commit/cb402abc74c1d91a9d39846740d2fd490513c5f9))
* update project rules and readme ([ea7ca49](https://github.com/korchasa/flowai/commit/ea7ca498d05e44c4b19b7e6a38330382ca0e35e3))
* update README for monorepo structure ([1154c0e](https://github.com/korchasa/flowai/commit/1154c0e10b78f75ddb8591afcc91ceef71daa403))
* update RULE.md to allow user language for notes ([922cb86](https://github.com/korchasa/flowai/commit/922cb8623787ddb2bbb46574fa83c7fc44f250d2))
* update RULE.md to enforce GIT_PAGER usage ([d4e2b44](https://github.com/korchasa/flowai/commit/d4e2b4426c8724d75d865cc1a07a1ced8b35ce4a))
* update SRS and SDS for af-init and dev commands configuration ([843a5f7](https://github.com/korchasa/flowai/commit/843a5f798b083ddac83898e9d3f249b1618e5ccb))
* update SRS/SDS and add product vision ([e20a34a](https://github.com/korchasa/flowai/commit/e20a34ac15ec3c35a2146d7e1954f68b9c88bdd3))
* update task planning guidelines in task-plan.md ([3e95f25](https://github.com/korchasa/flowai/commit/3e95f25c541bc4337566040d5b915f550252c7b2))
* update task-answer documentation for clarity and response handling ([e72a57b](https://github.com/korchasa/flowai/commit/e72a57b641ed924b754f0fbb510ffe2bfca766fb))
* update task-check-analyze and task-generate-agents command documentation ([8e3dcae](https://github.com/korchasa/flowai/commit/8e3dcae9a72b37e24e4b8a73730f1575be4dc976))
* update task-commit.md to enforce GIT_PAGER usage ([2d77b82](https://github.com/korchasa/flowai/commit/2d77b82ea38233b99784c1e699b9b2ca67427ccb))
* update task-execute.md to clarify documentation requirements ([9c203f3](https://github.com/korchasa/flowai/commit/9c203f3899d43034d746c0a5038542108435d1d7))
* update TS strict code style rules to emphasize pure functions and immutability ([bf2d628](https://github.com/korchasa/flowai/commit/bf2d62867e385007073ce2338f00e8c500991f4d))
* update whiteboard with deep research skill redesign plan ([d1418e4](https://github.com/korchasa/flowai/commit/d1418e47be3aa23d04ec63aeb445bf3901fe41be))


### Code Refactoring

* adapt trace generator to tasks.guru style and colors ([73b9a43](https://github.com/korchasa/flowai/commit/73b9a43aa50894be19714de04722b60edd7f7ff2))
* **af-commit:** simplify atomic commit rules for logical grouping ([40e5fc1](https://github.com/korchasa/flowai/commit/40e5fc10a875cb1e1a2313ee20751a21d6dd8993))
* **af-commit:** update commit rules and instructions ([ffd4c5f](https://github.com/korchasa/flowai/commit/ffd4c5f15a4c4463ee540554d26eae9d2e933036))
* **af-plan:** deduplicate planning rules, reference AGENTS.md ([8a2507c](https://github.com/korchasa/flowai/commit/8a2507cc6b693859fbe821945cdcccbc4a60541a))
* **agents:** remove explicit model declarations from agent frontmatter ([a584ea2](https://github.com/korchasa/flowai/commit/a584ea2e9cdcb39f1551d71ae8e05a46dc2d3035))
* **agents:** restructure to per-IDE subdirs with frontmatter validation ([e788a75](https://github.com/korchasa/flowai/commit/e788a75893adaedfe79bfc5fb8faf86a80ccb23c))
* **agents:** update flowai-skill-executor ([9d10ec4](https://github.com/korchasa/flowai/commit/9d10ec4d2e4f97cbcca63fea3bd497682af9444b))
* **catalog:** remove flowai-execute and flowai-plan agents ([b6b0463](https://github.com/korchasa/flowai/commit/b6b04634ee4bd4cb2ea81999ef9dac479046d89a))
* **catalog:** remove flowai-skill-debug-by-playwright ([643ad21](https://github.com/korchasa/flowai/commit/643ad2140750a7d7969611fed0876fc642558c9c))
* **catalog:** update flowai-do, flowai-engineer-subagent, flowai-execute, flowai-auto skills ([df3867b](https://github.com/korchasa/flowai/commit/df3867bb417688cefc7b181c9f03248124cc4238))
* **catalog:** update flowai-init skill and AGENTS template ([ea2e868](https://github.com/korchasa/flowai/commit/ea2e8684519b4a03c027cb6218f033788b1b4c8e))
* **catalog:** update flowai-maintenance and flowai-reflect skills ([20bf2db](https://github.com/korchasa/flowai/commit/20bf2db5cea22311c38231dcbc58476c627ea1b7))
* **catalog:** update flowai-skill guides ([d181c96](https://github.com/korchasa/flowai/commit/d181c96476e80b17821e34acdf0f7176e10ed824))
* **commands:** consolidate planning workflows and enhance GODS framework ([51fd403](https://github.com/korchasa/flowai/commit/51fd4033df52bc47a6ff6aa25400c3a259ba3bcd))
* **commands:** drop task prefix from command files ([fdc54ac](https://github.com/korchasa/flowai/commit/fdc54ac3c956bd74935a79667e3d94c1110288c6))
* **commands:** integrate BED-LLM algorithm details into workflow steps ([e9664e0](https://github.com/korchasa/flowai/commit/e9664e0c464896522e821b1dbd2fe6424b6fce50))
* **commands:** remove AskQuestion tool references ([f4b2091](https://github.com/korchasa/flowai/commit/f4b20915018652429aa65179c7c3bb6e65947b92))
* **commands:** remove plan-and-execute command ([834c0c8](https://github.com/korchasa/flowai/commit/834c0c882710f1125a41e708785f388d74b9eb96))
* **commands:** remove unused command files and update documentation ([121d728](https://github.com/korchasa/flowai/commit/121d728d6b5119beaba539b36e8f6aa460e919fe))
* **commands:** rename alpha-task-build-claude-md to task-build-agents-md ([25b0698](https://github.com/korchasa/flowai/commit/25b069868f213dec7da3a5fcf8938dae5fba1ca3))
* **commands:** rename validation checklist to verification ([7e1a4f1](https://github.com/korchasa/flowai/commit/7e1a4f1d409252208cace90f1dd0617100edc668))
* **commands:** reorganize investigation and analysis workflows ([c8248e9](https://github.com/korchasa/flowai/commit/c8248e9b35db1070652539088917dc86a412a19a))
* **cursor:** convert GODS rule to how-to guide ([14d8bf0](https://github.com/korchasa/flowai/commit/14d8bf0aa9c7a582da47b84c43422947cbcb62cc))
* **docs:** remove standalone vision.md, consolidate into AGENTS.md ([a867831](https://github.com/korchasa/flowai/commit/a867831bf86b3d1f596bf881e0aa3a907da293c6))
* **flowai-init:** make TDD commands in AGENTS.template generic ([6eafdad](https://github.com/korchasa/flowai/commit/6eafdadc9fa981c3d20144e0dec79ac865404b07))
* **flowai-init:** merge analyze/inventory/verify into single script output ([cf5a80e](https://github.com/korchasa/flowai/commit/cf5a80e5f8984b05985e8b9d009bd14bccbb45d6))
* **flowai-init:** replace manifest-driven generation with agent-native approach ([8273cba](https://github.com/korchasa/flowai/commit/8273cba86598b92e80a531b3ffc395daa0106f55))
* **install:** remove shell bootstrap and fix process hang on exit ([3b07b25](https://github.com/korchasa/flowai/commit/3b07b25e6160d0b7878b006ff3457fd3491addcd))
* merge flowai-cli submodule into monorepo ([df5a868](https://github.com/korchasa/flowai/commit/df5a86823b8adb161870fe30b38fd7387c16c9b4))
* **project:** reorganize file structure into .cursor/ directories ([8b46177](https://github.com/korchasa/flowai/commit/8b46177de97a71f3a7690b2b1174a53837993a24))
* reclassify skill types — engineer→skill, setup→setup-agent ([7652f61](https://github.com/korchasa/flowai/commit/7652f612d420958585c860a5592127baa164da53))
* rename af-* prefix to flowai-* ([fadf38a](https://github.com/korchasa/flowai/commit/fadf38a39b5f52fc5639057b534c659d17c24f16))
* rename agents to flowai-* convention and update references ([2e4fec6](https://github.com/korchasa/flowai/commit/2e4fec6c5a54fd4ddd9a1ecc621f27acc252aac3))
* rename catalog/ to framework/ ([8450f9e](https://github.com/korchasa/flowai/commit/8450f9ea7f885a98767abb78609705a75ff46bcf))
* rename create-deno-scripts command to create-scripts ([2b54634](https://github.com/korchasa/flowai/commit/2b5463479b844754c0601db1b88b6ef346449054))
* rename Deno skills to follow flowai-skill-* convention ([d5678d3](https://github.com/korchasa/flowai/commit/d5678d37b22d7cb4a47d1e16122669603de1cf8f))
* rename flowai-cli → flowai ([af1fbb2](https://github.com/korchasa/flowai/commit/af1fbb239d964dfcbfcc604cccf26013c2ba2d3c))
* replace flowai-skill-configure-strict-typescript with setup-code-style ([c547e51](https://github.com/korchasa/flowai/commit/c547e5149de9b114f3e3a0d8b042c588a7bd102f))
* **rules:** migrate .mdc files to directory-based RULE.md structure ([8b06dc3](https://github.com/korchasa/flowai/commit/8b06dc39d86499bbc7ec90b9940e9e4193dd1a06))
* **rules:** remove iOS-specific requirements from main-example rule ([ac85e5d](https://github.com/korchasa/flowai/commit/ac85e5d54a846c8fff05645ba1a4b1fead2eeac0))
* **skills:** generalize task management tool description ([6f04367](https://github.com/korchasa/flowai/commit/6f04367e0c7be3f240ceb7011483accaaf402a6b))
* **skills:** remove flowai-do and flowai-execute, superseded by AGENTS.md rules ([61eed19](https://github.com/korchasa/flowai/commit/61eed195b04e7afb4f1d848debf6e82950dc46c9))
* **skills:** remove obsolete flowai-auto and flowai-convert-cursor-to-claude skills ([2f1aac7](https://github.com/korchasa/flowai/commit/2f1aac7ddde2a0c6162c9943ea85269d9dd84355))
* streamline task-create-command.md for clarity and structure ([34188c1](https://github.com/korchasa/flowai/commit/34188c155e5124d4bd170c3771f7ce73459ba724))
* **task-link:** create per-item symlinks from .dev/ and framework/ into IDE dirs ([b41afc2](https://github.com/korchasa/flowai/commit/b41afc273f3f1b02ca760456e02bfef9d77b7531))
* update do command steps for clarity and verification ([5910de7](https://github.com/korchasa/flowai/commit/5910de79bef4522fe77db0a9e3a606c48e23da6e))
* update fix attempt rules to use 5-why analysis ([da37376](https://github.com/korchasa/flowai/commit/da373764702e33b20e83d9dfd76ade43bd281f0c))


### Chores

* add worktrees configuration ([16508c2](https://github.com/korchasa/flowai/commit/16508c26af4f5849eeba5b4eee99be6c9a093411))
* cleanup obsolete rules and update task command instructions ([ac045b4](https://github.com/korchasa/flowai/commit/ac045b4a74e23c1e8c9460eb936f22f333b3249b))
* **commands:** move build CLAUDE to alpha draft ([3b9d160](https://github.com/korchasa/flowai/commit/3b9d160294cf9584b0ea1ddb2ec89bf0d624b031))
* **cursor:** update commands and add Dockerfile rules ([773c1d1](https://github.com/korchasa/flowai/commit/773c1d18be321c504786a8769690dfbebaccc46b))
* maintenance sweep — refactor trace.ts, fix design.md, add AGENTS.md and JSDoc ([c8987ec](https://github.com/korchasa/flowai/commit/c8987ecd4c575bdc6bfe84f200c5ff0dabb607bc))
* remove deprecated commands and rules ([21895db](https://github.com/korchasa/flowai/commit/21895db36a5d58eee61e271bf7adf303a9b9afb5))
* remove deprecated settings.json and whiteboard.md files ([0368efd](https://github.com/korchasa/flowai/commit/0368efd6426baf2aca512c4089516bdb745ea6ff))
* remove obsolete R&D tasks format documentation ([d3cc746](https://github.com/korchasa/flowai/commit/d3cc746d08f110d08c764ea54edc8e5de256d09e))
* remove write-skill command ([4f281e1](https://github.com/korchasa/flowai/commit/4f281e1d5037f4dbbe840df074d84943b7ea3cec))
* sync framework skills/agents via flowai-cli ([3bdf132](https://github.com/korchasa/flowai/commit/3bdf1323955d680e5030084bc266c41b8234045e))
* update .gitignore and add .cursorignore ([134e6ae](https://github.com/korchasa/flowai/commit/134e6ae72b22ad6ba72d087316c4a26c46f327fd))
* update .gitignore and enhance README with new command descriptions ([5f867c4](https://github.com/korchasa/flowai/commit/5f867c45032f95b935d632fa0cb0f012de1315e2))
* update .gitignore to ignore .vscode ([553c382](https://github.com/korchasa/flowai/commit/553c382ca7bccc677a06bb090e1ef063719fbde3))
* update .gitignore to ignore documents directory ([f27d7ee](https://github.com/korchasa/flowai/commit/f27d7ee4b3090c504060ee47a8218b4202c691b1))
* update flowai-cli submodule (PATH docs) ([d9dd37c](https://github.com/korchasa/flowai/commit/d9dd37cac4264a20506112ebc0caaec9a7be90ee))
* Update project files and add README.md ([e63718b](https://github.com/korchasa/flowai/commit/e63718b689b9d3fd681f257cd872b15552bd88c9))
* update repo scaffolding and cleanup ([324ce4e](https://github.com/korchasa/flowai/commit/324ce4e59a416475269a60151340184a93f0d25b))
* update repo URL korchasa/flow → korchasa/flowai ([1cb3b17](https://github.com/korchasa/flowai/commit/1cb3b17fd9e849c3f696eca59b417682c681cabe))
* **vscode:** remove .vscode/settings.json ([5fedb82](https://github.com/korchasa/flowai/commit/5fedb82e652d8bedebe20b949679520c79d28e48))


### Styles

* **agents:** normalize markdown formatting in agent definitions ([a21f504](https://github.com/korchasa/flowai/commit/a21f504161795fbee4f90607a43d64c6831067ca))
* **benchmarks:** apply deno fmt formatting ([d9843c1](https://github.com/korchasa/flowai/commit/d9843c184b901a342e89e70437765849efae5c1f))
* **benchmarks:** fix quote consistency in consolidate scenario ([0316519](https://github.com/korchasa/flowai/commit/0316519100c74d0413b7bd6c4a3038fc166f2b6b))
* **cursor:** add dependency injection rules for TypeScript classes ([dbcff42](https://github.com/korchasa/flowai/commit/dbcff42b6f58c6bc675bc623c67d0f7a4443ad3c))
* **cursor:** unify headings and formatting in rules and commands ([cfd3514](https://github.com/korchasa/flowai/commit/cfd3514fb5b675c5e404a7dd2eb093f8fc992492))
* fix trailing whitespace in deno-cli skill ([0dd55cc](https://github.com/korchasa/flowai/commit/0dd55cc69caae03788ee05f5435160401c184afc))
* format benchmark code ([1731e2a](https://github.com/korchasa/flowai/commit/1731e2a2fc0198f528ca84461091e14a698aebe9))
* format cursor skills and agents documentation ([73ae094](https://github.com/korchasa/flowai/commit/73ae094cea2700b2c2e0de4b9fa3e87b09dca256))
* remove backticks from todo_write in SKILL.md files ([84ca0d5](https://github.com/korchasa/flowai/commit/84ca0d5d042150dc3438c0b8690e8ce837dec74f))
* remove emojis from benchmark writing skill ([3b77303](https://github.com/korchasa/flowai/commit/3b77303f4437fac04e96640b9cee359bd6d8a8bc))
* sync .claude/ from framework and apply formatting fixes ([c20a067](https://github.com/korchasa/flowai/commit/c20a067779b54f36ff719643a98e94b3f2d4ace3))


### Continuous Integration

* **release:** merge CI jobs into single pipeline with standard-version automation ([cb0fb20](https://github.com/korchasa/flowai/commit/cb0fb20d24370382a5d43361a3ee63da3725ff45))
