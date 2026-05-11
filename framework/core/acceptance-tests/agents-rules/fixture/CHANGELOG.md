# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.8.9](https://github.com/korchasa/ai-skel-ts/compare/v0.8.8...v0.8.9) (2026-04-07)


### Documentation

* document OpenRouter timeout support in design.md and requirements.md ([d40c8d1](https://github.com/korchasa/ai-skel-ts/commit/d40c8d17ff2aca5523784aa070aa21a178723724))

### [0.8.8](https://github.com/korchasa/ai-skel-ts/compare/v0.8.7...v0.8.8) (2026-03-01)


### Features

* **openrouter:** add timeout support to OpenRouter requester ([3b0a40a](https://github.com/korchasa/ai-skel-ts/commit/3b0a40ae3fe39539881439e97cb252f0131a014e)), closes [#9](https://github.com/korchasa/ai-skel-ts/issues/9)

### [0.8.7](https://github.com/korchasa/ai-skel-ts/compare/v0.8.6...v0.8.7) (2026-02-28)


### Features

* **llm:** make validation retry count configurable via maxValidationRetries URI parameter ([8aeb99a](https://github.com/korchasa/ai-skel-ts/commit/8aeb99a6c375e4dacb428006cbf8fe8af1cdd195)), closes [#7](https://github.com/korchasa/ai-skel-ts/issues/7)

### [0.8.6](https://github.com/korchasa/ai-skel-ts/compare/v0.8.5...v0.8.6) (2026-02-28)


### Features

* **llm:** add YAML debug file logging for streaming requests ([814896f](https://github.com/korchasa/ai-skel-ts/commit/814896f547780fe6253ccece453397efcaa12379)), closes [#5](https://github.com/korchasa/ai-skel-ts/issues/5)


### Bug Fixes

* **llm:** prevent unhandled AbortError when timeout fires after promise settled ([2a48992](https://github.com/korchasa/ai-skel-ts/commit/2a489921ad6bb8c1b9b25f9c4f4f7712ace7180c)), closes [#6](https://github.com/korchasa/ai-skel-ts/issues/6)

### [0.8.5](https://github.com/korchasa/ai-skel-ts/compare/v0.8.4...v0.8.5) (2026-02-25)


### Bug Fixes

* **openrouter:** switch non-streaming to OpenResponses API and fix tool calling input format ([9def44a](https://github.com/korchasa/ai-skel-ts/commit/9def44adec0b37c810f52af808c24384fe4edc4a))

### [0.8.4](https://github.com/korchasa/ai-skel-ts/compare/v0.8.3...v0.8.4) (2026-02-24)


### Code Refactoring

* **llm:** rename internal createLlmRequester to createVercelRequester to eliminate name collision with the unified factory ([2b3c990](https://github.com/korchasa/ai-skel-ts/commit/2b3c99028452ff895b37ce24cc840afe769a97fe))

### [0.8.3](https://github.com/korchasa/ai-skel-ts/compare/v0.8.2...v0.8.3) (2026-02-24)

### [0.8.2](https://github.com/korchasa/ai-skel-ts/compare/v0.8.1...v0.8.2) (2026-02-24)


### Bug Fixes

* **llm:** accumulate tokens and costs from failed validation attempts during retry loops ([ee85a51](https://github.com/korchasa/ai-skel-ts/commit/ee85a5108ef414f7889941eba6a01d904a695c7e))

### [0.8.1](https://github.com/korchasa/ai-skel-ts/compare/v0.8.0...v0.8.1) (2026-02-22)


### Features

* **llm:** add unified createLlmRequester factory routing by provider (FR-LLM-14) ([bda1692](https://github.com/korchasa/ai-skel-ts/commit/bda16927327664a961115e68db361e9ab645a448))
* **llm:** make ModelURI protocol-agnostic, toString() emits provider/model format ([8c441f4](https://github.com/korchasa/ai-skel-ts/commit/8c441f4ff4f856234e5865a530804a5dee464cd7))


### Code Refactoring

* **llm:** wire unified factory into public API and update all call sites ([71179cd](https://github.com/korchasa/ai-skel-ts/commit/71179cd5f4a45a2cdac108f4082730db891db313))

## [0.8.0](https://github.com/korchasa/ai-skel-ts/compare/v0.7.29...v0.8.0) (2026-02-22)


### ⚠ BREAKING CHANGES

* createLlmRequester() with openrouter URI now throws an error
directing users to createOpenRouterRequester() from the native module.

- Remove @openrouter/ai-sdk-provider from deno.json imports
- Remove createOpenRouter import and openrouter case in createModelInstance()
- Migrate llm.acceptance.test.ts to use createOpenRouterRequester() directly

### Features

* **openrouter:** add streaming support via .stream LlmStreamer ([f81ead5](https://github.com/korchasa/ai-skel-ts/commit/f81ead5279aded788f9e09dbba306f157e5e45df))
* **session:** implement real LLM call in SummaryGenerator via LlmRequester ([6188d3a](https://github.com/korchasa/ai-skel-ts/commit/6188d3a576f8f159d845da2a22cad009061ac3a8))


### build

* remove @openrouter/ai-sdk-provider dependency ([636c05e](https://github.com/korchasa/ai-skel-ts/commit/636c05ef73c4934580b6850e11f2ec450e063190))


### Documentation

* **requirements:** mark implemented requirements with checkboxes ([d5702d5](https://github.com/korchasa/ai-skel-ts/commit/d5702d5c7dd95d2fac1bd00ccfa4f920604726d9))


### Styles

* fix duplicate list item prefix in AGENTS.md ([e4f6fec](https://github.com/korchasa/ai-skel-ts/commit/e4f6fec368783807dc633a32eed0236d3c094b64))

### [0.7.29](https://github.com/korchasa/ai-skel-ts/compare/v0.7.28...v0.7.29) (2026-02-17)


### Features

* **llm,agent:** add real-time streaming support ([8cba758](https://github.com/korchasa/ai-skel-ts/commit/8cba7582a382904bebd5e9d9d3c59a2627513f18))
* **openrouter:** add native OpenRouter SDK module ([3b16ead](https://github.com/korchasa/ai-skel-ts/commit/3b16eadb3900bf09f4e18a7260710b9357231852))


### Documentation

* rewrite README for JSR, quick start, and current API ([2bf1039](https://github.com/korchasa/ai-skel-ts/commit/2bf103995197062ecdbbed18f2142eab1f373fae))


### Tests

* **llm:** update existing tests for LlmEngine interface changes ([14d72b9](https://github.com/korchasa/ai-skel-ts/commit/14d72b9343e4b1e5481e21a3c8a2954f2d3cc185))

### [0.7.28](https://github.com/korchasa/ai-skel-ts/compare/v0.7.27...v0.7.28) (2026-02-07)


### Features

* export ZodError, ZodType, and ZodIssue from mod.ts ([8fe5f18](https://github.com/korchasa/ai-skel-ts/commit/8fe5f18cfcfcb3c1e674a25c4331af8310236fb9))


### Documentation

* add JSR-compatible module and symbol documentation ([09cd4ce](https://github.com/korchasa/ai-skel-ts/commit/09cd4ce62d887b3f42eb94e61064069c7ef4a13e))

### [0.7.27](https://github.com/korchasa/ai-skel-ts/compare/v0.7.26...v0.7.27) (2026-02-07)


### Chores

* update @modelcontextprotocol/sdk to version 1.26.0 ([d40af63](https://github.com/korchasa/ai-skel-ts/commit/d40af634e6cc9dd5e5119cd282c3e5be42cfd035))


### Code Refactoring

* migrate from process.env to Deno.env and improve type safety ([682691d](https://github.com/korchasa/ai-skel-ts/commit/682691d7099f0bae9a7d35d6b3f914c5459ec65a))


### Tests

* update tests to use Deno-compatible syntax and improve coverage ([7400a50](https://github.com/korchasa/ai-skel-ts/commit/7400a50bcc361f44671f72a79386644ca7cc2471))

### [0.7.26](https://github.com/korchasa/ai-skel-ts/compare/v0.7.25...v0.7.26) (2026-02-07)

### [0.7.25](https://github.com/korchasa/ai-skel-ts/compare/v0.7.24...v0.7.25) (2026-02-07)


### Bug Fixes

* **test:** skip acceptance tests in CI if API key is missing ([19e5e65](https://github.com/korchasa/ai-skel-ts/commit/19e5e658ce2b71819a61ef83630f2fbba6704e6f))


### Documentation

* **agent:** update agent rules for error analysis ([8bb0f97](https://github.com/korchasa/ai-skel-ts/commit/8bb0f975633bb1a98d32a2e67d58b0481c10e6f9))

### [0.7.24](https://github.com/korchasa/ai-skel-ts/compare/v0.7.21...v0.7.24) (2026-02-07)


### Features

* export z, Tool, and LlmSettings for consumer compatibility ([07a5e30](https://github.com/korchasa/ai-skel-ts/commit/07a5e302ff0b9d32e251b5a4610cd4925823f129))


### Chores

* bump version to 0.7.23 for JSR verification ([ccd202d](https://github.com/korchasa/ai-skel-ts/commit/ccd202d816b253d2d27d6f1429e195d94de7e3fa))


### Continuous Integration

* add debug logging and verbose mode to JSR publish step ([0083a99](https://github.com/korchasa/ai-skel-ts/commit/0083a999eefe350b4e32616f0e9f83c02f39c7df))
* remove GitHub Packages publication ([4d71689](https://github.com/korchasa/ai-skel-ts/commit/4d71689984afbdae3939eaee31d3a42e4cd235b0))

### [0.7.21](https://github.com/korchasa/ai-skel-ts/compare/v0.7.20...v0.7.21) (2026-02-04)


### Bug Fixes

* **ci:** use [@main](https://github.com/main) for jsr-io/publish action ([668b156](https://github.com/korchasa/ai-skel-ts/commit/668b156818828d39de7cb4a43c118a2d95b2294c))

### [0.7.20](https://github.com/korchasa/ai-skel-ts/compare/v0.7.19...v0.7.20) (2026-02-04)


### Bug Fixes

* **ci:** add --allow-dirty to jsr publish ([1442575](https://github.com/korchasa/ai-skel-ts/commit/14425759e6d42ba8a431ccf9fcf84f025c6979df))

### [0.7.19](https://github.com/korchasa/ai-skel-ts/compare/v0.7.18...v0.7.19) (2026-02-04)


### Bug Fixes

* **jsr:** resolve slow types and missing license for JSR ([22ca63a](https://github.com/korchasa/ai-skel-ts/commit/22ca63a52d15024ad20ad1ee294bc9794a78efc4))

### [0.7.18](https://github.com/korchasa/ai-skel-ts/compare/v0.7.17...v0.7.18) (2026-02-04)

### [0.7.17](https://github.com/korchasa/ai-skel-ts/compare/v0.7.16...v0.7.17) (2026-02-04)


### Features

* **ci:** add JSR publication to CI/CD workflow ([71a51a8](https://github.com/korchasa/ai-skel-ts/commit/71a51a8fb1088f360ef2f843b0393d5e0a11e7d3))


### Chores

* resolve version conflict in package-lock.json ([230a9bf](https://github.com/korchasa/ai-skel-ts/commit/230a9bf8a0b20ea0583966ec33f1a8360b30212f))

### [0.7.16](https://github.com/korchasa/ai-skel-ts/compare/v0.7.14...v0.7.16) (2026-02-03)

### [0.7.14](https://github.com/korchasa/ai-skel-ts/compare/v0.7.12...v0.7.14) (2026-02-03)

### [0.7.12](https://github.com/korchasa/ai-skel-ts/compare/v0.7.11...v0.7.12) (2026-02-03)

### [0.7.11](https://github.com/korchasa/ai-skel-ts/compare/v0.7.10...v0.7.11) (2026-01-29)


### Code Refactoring

* **fetchers:** cleanup unused variables and parameters ([9ec6c83](https://github.com/korchasa/ai-skel-ts/commit/9ec6c83b207406813901fd0143f24d62418d64e8))
* **llm:** remove unused parameters and variables ([cb1763f](https://github.com/korchasa/ai-skel-ts/commit/cb1763fa46a243ab7374b0337512ddb4a57d38f4))
* **mcp:** remove unused import and property ([134f722](https://github.com/korchasa/ai-skel-ts/commit/134f72283b663f95f5fedee7dde7ac2559f6f16e))


### Tests

* cleanup unused variables and imports in tests ([163590c](https://github.com/korchasa/ai-skel-ts/commit/163590c54df78e11c47905a1930f635f52743873))

### [0.7.10](https://github.com/korchasa/ai-skel-ts/compare/v0.7.8...v0.7.10) (2026-01-29)


### Chores

* **release:** 0.7.9 ([2eda99d](https://github.com/korchasa/ai-skel-ts/commit/2eda99def9cf0ba08bec2459af9e5d1ccbbc1eae))


### Documentation

* update LlmRequester and AgentParams to reflect mandatory parameters ([ea9517f](https://github.com/korchasa/ai-skel-ts/commit/ea9517fc6edaa66a416bf0e42e72088ae2809e20))


### Code Refactoring

* **agent:** make all AgentParams mandatory and update llm call ([1773b0e](https://github.com/korchasa/ai-skel-ts/commit/1773b0edc414ab18dea6be97718e2235fc0fb61d))
* **llm:** make all LlmRequester parameters mandatory ([2f8ee75](https://github.com/korchasa/ai-skel-ts/commit/2f8ee75aaf3e82b4aafc7bec04774184e7f3f6f9))


### Tests

* update all call sites for mandatory parameters ([10ebce5](https://github.com/korchasa/ai-skel-ts/commit/10ebce50b1c5076cb00e007ea3c2b9ea5487e9b2))

### [0.7.9](https://github.com/korchasa/ai-skel-ts/compare/v0.7.8...v0.7.9) (2026-01-18)

### [0.7.8](https://github.com/korchasa/ai-skel-ts/compare/v0.7.7...v0.7.8) (2026-01-18)


### Features

* **logger:** change default log level to debug ([42f57bc](https://github.com/korchasa/ai-skel-ts/commit/42f57bcf2a549b56649d878e75eda3c5eb85342a))


### Bug Fixes

* **example:** correct CostTracker and Logger initialization ([014e4ee](https://github.com/korchasa/ai-skel-ts/commit/014e4eeb8094c91b9310c26411e0652e91f9811d))


### Documentation

* update default log level to debug in documentation ([300357f](https://github.com/korchasa/ai-skel-ts/commit/300357fff1b428ad773f35ac1cef8dc0540777cc))

### [0.7.7](https://github.com/korchasa/ai-skel-ts/compare/v0.7.6...v0.7.7) (2026-01-18)


### Features

* **llm:** group multiple retries into a single YAML log file ([a990543](https://github.com/korchasa/ai-skel-ts/commit/a990543fcae00352e520c4e8cea7367bb6de1cda))


### Chores

* **tasks:** migrate run wrapper to deno tasks ([abbed8b](https://github.com/korchasa/ai-skel-ts/commit/abbed8b3f91a83dde803188e137ba3247d11b407))


### Documentation

* add AGENTS.md for AI agent instructions ([bff17e0](https://github.com/korchasa/ai-skel-ts/commit/bff17e0871daf6844e9478bf8a316f2d01e3069c))

### [0.7.6](https://github.com/korchasa/ai-skel-ts/compare/v0.7.5...v0.7.6) (2026-01-13)


### Bug Fixes

* **llm:** prevent process crash on throwing abort listeners ([715b280](https://github.com/korchasa/ai-skel-ts/commit/715b280930d71ffb126cf68f30e3d65d0983f89c))

### [0.7.5](https://github.com/korchasa/ai-skel-ts/compare/v0.7.4...v0.7.5) (2026-01-13)


### Bug Fixes

* **logging:** prevent serialization crashes and reduce JSDOM noise ([408eb65](https://github.com/korchasa/ai-skel-ts/commit/408eb65bb194c38c7a055b8092189959e2a559b2))

### [0.7.4](https://github.com/korchasa/ai-skel-ts/compare/v0.7.3...v0.7.4) (2026-01-12)


### Features

* **agent:** enhance tool calling support and history preservation ([7c3ce67](https://github.com/korchasa/ai-skel-ts/commit/7c3ce6717e8efbebc035505334da37b35f743f58))


### Documentation

* update README with local tools support information ([d279f19](https://github.com/korchasa/ai-skel-ts/commit/d279f19e2c1429bccf9404031ae714e06da115e6))

### [0.7.3](https://github.com/korchasa/ai-skel-ts/compare/v0.7.2...v0.7.3) (2026-01-12)


### Features

* **agent:** support local tools injection ([d642a6a](https://github.com/korchasa/ai-skel-ts/commit/d642a6a69d62bef7c0d9cd6c5619b120df0526cf))


### Documentation

* **ai-context:** consolidate AI context into README and update documents ([0cabafe](https://github.com/korchasa/ai-skel-ts/commit/0cabafef99516d1e655465a1b95d680ee25fa8d9))
* **readme:** add Agent section with usage examples and description ([f7cf4f1](https://github.com/korchasa/ai-skel-ts/commit/f7cf4f1a9358f9e1b81d3811f75be436bbdcb09e))

## [0.7.0](https://github.com/korchasa/ai-skel-ts/compare/v0.6.0...v0.7.0) (2026-01-11)


### ⚠ BREAKING CHANGES

* **agent:** LlmRequester return type renamed to GenerateResult and
parameters changed to support messages and tools.

### Features

* **agent:** implement stateful Agent with MCP and history compaction ([3ef2052](https://github.com/korchasa/ai-skel-ts/commit/3ef20526784c609c28a62d06e0cf284f5936995a))

## [0.6.0](https://github.com/korchasa/ai-skel-ts/compare/v0.5.1...v0.6.0) (2026-01-10)


### ⚠ BREAKING CHANGES

* **llm:** refactor ModelURI to use strict protocol://provider/model scheme

### Code Refactoring

* **llm:** refactor ModelURI to use strict protocol://provider/model scheme ([816b3b8](https://github.com/korchasa/ai-skel-ts/commit/816b3b8c2a263130dbced7123c93e1aa57a41791))


### Continuous Integration

* add refactor and build to releasable commit types ([e9c9507](https://github.com/korchasa/ai-skel-ts/commit/e9c9507c4e673f8b8692222bcaf7a0f8049c3466))

### [0.5.1](https://github.com/korchasa/ai-skel-ts/compare/v0.5.0...v0.5.1) (2026-01-10)


### Bug Fixes

* **llm:** add missing newline in createLlmRequester function for improved readability ([671daa0](https://github.com/korchasa/ai-skel-ts/commit/671daa0cafcaa836f3ae3e9545ba3e2378513dfe))

## [0.5.0](https://github.com/korchasa/ai-skel-ts/compare/v0.4.5...v0.5.0) (2026-01-10)


### ⚠ BREAKING CHANGES

* **llm:** LlmRequesterParams.modelUri now requires a ModelURI instance. Use ModelURI.parse(uri) to migrate existing string identifiers.

### Code Refactoring

* **llm:** replace manual URI parsing with ModelURI class ([5f84d9e](https://github.com/korchasa/ai-skel-ts/commit/5f84d9e23ff779981887a6b007e33b879b1db757))


### Tests

* **llm:** rename modelUri variable to modelUriString in acceptance test ([5406deb](https://github.com/korchasa/ai-skel-ts/commit/5406debdb9f18bb741ec77ab16b3c5a9f024c376))

### [0.4.5](https://github.com/korchasa/ai-skel-ts/compare/v0.4.4...v0.4.5) (2026-01-09)


### Features

* **llm:** enhance response logging with finishReason at info level ([42a9020](https://github.com/korchasa/ai-skel-ts/commit/42a90200823614a59139b19124a234187b7c19d9))

### [0.4.4](https://github.com/korchasa/ai-skel-ts/compare/v0.4.3...v0.4.4) (2026-01-08)


### Features

* **llm:** refine debug log parameters ([23fc1e7](https://github.com/korchasa/ai-skel-ts/commit/23fc1e7a055b2f1916dff0df75e22e5e889085dd))

### [0.4.3](https://github.com/korchasa/ai-skel-ts/compare/v0.4.2...v0.4.3) (2026-01-08)


### Features

* **llm:** add detailed debug logging for requests and responses ([7f5b996](https://github.com/korchasa/ai-skel-ts/commit/7f5b99640e896bb39fa1c4e5f1a665aebea6bb21))


### Documentation

* **README:** add model URI parameters section with detailed descriptions ([2e1c5c6](https://github.com/korchasa/ai-skel-ts/commit/2e1c5c6aef40a640e2c419ede842c4f7db980a02))

### [0.4.2](https://github.com/korchasa/ai-skel-ts/compare/v0.4.1...v0.4.2) (2026-01-08)


### Features

* **llm:** support AI SDK warning suppression via URI parameter ([dae2b9c](https://github.com/korchasa/ai-skel-ts/commit/dae2b9c1ad63b54cbd2c53c4e49f1b1096d8ac4d))

### [0.4.1](https://github.com/korchasa/ai-skel-ts/compare/v0.4.0...v0.4.1) (2026-01-08)


### Features

* **llm:** add timeout parameter for LLM requests ([b0d4a17](https://github.com/korchasa/ai-skel-ts/commit/b0d4a1770f41818058af545d29bc611123d48961))

## [0.4.0](https://github.com/korchasa/ai-skel-ts/compare/v0.3.11...v0.4.0) (2026-01-07)


### ⚠ BREAKING CHANGES

* **fetchers:** Public fetcher API renamed. fetchText -> fetch, fetchTextFromURL -> fetchFromURL. JinaScraper fetchMarkdown -> fetch, searchMarkdown -> search. Result field content renamed to text.

### Features

* trigger release 0.4.0 ([07a1a34](https://github.com/korchasa/ai-skel-ts/commit/07a1a3469f50e274545bb1b5217ad01388d382b2))


### Code Refactoring

* **fetchers:** rename fetch methods and include HTML in results ([400509b](https://github.com/korchasa/ai-skel-ts/commit/400509bceb34eac168b7788607e7f0469fc296f2))

### [0.3.11](https://github.com/korchasa/ai-skel-ts/compare/v0.3.10...v0.3.11) (2026-01-07)


### Bug Fixes

* **ci:** update default acceptance test model in CI workflow ([e47ad32](https://github.com/korchasa/ai-skel-ts/commit/e47ad3290903fc5afa65fdbbb6ee608cc73beb46))

### [0.3.10](https://github.com/korchasa/ai-skel-ts/compare/v0.3.9...v0.3.10) (2026-01-07)


### Features

* **ci:** make acceptance test model configurable via environment variable ([10603b5](https://github.com/korchasa/ai-skel-ts/commit/10603b521513afc81632e15f994b3a8001dcbf69))

### [0.3.9](https://github.com/korchasa/ai-skel-ts/compare/v0.3.8...v0.3.9) (2026-01-07)


### Features

* **brave-search:** add 429 retries and rate-limited batch search ([fd0a2e9](https://github.com/korchasa/ai-skel-ts/commit/fd0a2e91400ad144633d1138034afc7f1ccfdfd7))

### [0.3.8](https://github.com/korchasa/ai-skel-ts/compare/v0.3.7...v0.3.8) (2026-01-06)


### Features

* Improve raw response logging and error handling for LLM and Brave Search requests, capturing full raw text, parsing errors, and API status messages. ([f570735](https://github.com/korchasa/ai-skel-ts/commit/f570735585e68620f018719c1fd9a335579d2d4a))
* Standardize and verify raw response debug logging across LLM and Brave fetcher components. ([238cc63](https://github.com/korchasa/ai-skel-ts/commit/238cc639bd809d8fa10f2da7ab846a8c0c954bdd))

### [0.3.7](https://github.com/korchasa/ai-skel-ts/compare/v0.3.6...v0.3.7) (2026-01-06)


### Features

* **fetchers:** add Brave Search API client with web search capabilities ([73b6468](https://github.com/korchasa/ai-skel-ts/commit/73b6468637b581bcb0f289debaeb95711121bfd8))


### Chores

* **tsconfig:** change noEmit option to true ([daaeb14](https://github.com/korchasa/ai-skel-ts/commit/daaeb14a978f0c8d7b917b45adc31db605ab18b6))

### [0.3.6](https://github.com/korchasa/ai-skel-ts/compare/v0.3.5...v0.3.6) (2026-01-06)


### Features

* **llm:** refine LLM module documentation and enhance generation logic ([1926dbc](https://github.com/korchasa/ai-skel-ts/commit/1926dbc110b3c42f274ec98cb13e12c00ad18e33))

### [0.3.5](https://github.com/korchasa/ai-skel-ts/compare/v0.3.4...v0.3.5) (2026-01-06)


### Features

* **llm:** enhance generation logic with improved error handling and logging ([d9d7ade](https://github.com/korchasa/ai-skel-ts/commit/d9d7ade30170349f768b98423c1bf24d047cfe0b))
* **llm:** refactor generation logic to use generateText for improved output handling ([17fb1a1](https://github.com/korchasa/ai-skel-ts/commit/17fb1a1c75e859b3fd96137b175eb1b0de44af67))

### [0.3.4](https://github.com/korchasa/ai-skel-ts/compare/v0.3.3...v0.3.4) (2026-01-06)


### Features

* **llm:** add support for CallSettings parameters via URI and per-request overrides ([930d7d4](https://github.com/korchasa/ai-skel-ts/commit/930d7d4b7ae017ea19d259124d7eab2d28d0f7d3))

### [0.3.3](https://github.com/korchasa/ai-skel-ts/compare/v0.3.2...v0.3.3) (2026-01-05)


### Features

* **fetchers:** implement fetchContent and searchContent methods in JinaScraper ([f9f0330](https://github.com/korchasa/ai-skel-ts/commit/f9f033092256570134ccffb9159f9f7a24a9d6d3))

### [0.3.2](https://github.com/korchasa/ai-skel-ts/compare/v0.3.1...v0.3.2) (2026-01-05)


### Bug Fixes

* **fetchers:** clarify API key error handling in JinaScraper ([1c97c54](https://github.com/korchasa/ai-skel-ts/commit/1c97c54949013df0733b924f235794bbc14bd536))

### [0.3.1](https://github.com/korchasa/ai-skel-ts/compare/v0.3.0...v0.3.1) (2026-01-05)


### Features

* add pre-commit hook that runs ./run check ([6277b02](https://github.com/korchasa/ai-skel-ts/commit/6277b0296203ce5bc4eba8d9c0cc17c329fa0705))
* **fetchers:** enhance JinaScraper and Downloader with debug logging capabilities ([4e578ad](https://github.com/korchasa/ai-skel-ts/commit/4e578ada6a9a869c00f6ad37bbf2da0297c9c380))

## [0.3.0](https://github.com/korchasa/ai-skel-ts/compare/v0.2.11...v0.3.0) (2026-01-04)


### ⚠ BREAKING CHANGES

* Module structure and API changes

### Features

* add Jina Scraper module ([e3d2942](https://github.com/korchasa/ai-skel-ts/commit/e3d29425244fe2cbde35208e0d5b12e4d979b103))


### Code Refactoring

* **llm:** rename google provider to gemini ([d5b4150](https://github.com/korchasa/ai-skel-ts/commit/d5b415074f3dfa5be636ebf7f66cf03de2df60be))

### [0.2.11](https://github.com/korchasa/ai-skel-ts/compare/v0.2.10...v0.2.11) (2026-01-04)


### Features

* **llm:** support provider-specific environment variables for API keys ([7cdc3e9](https://github.com/korchasa/ai-skel-ts/commit/7cdc3e9c6dad410828508bd4ebe6e38365cd0936))

### [0.2.10](https://github.com/korchasa/ai-skel-ts/compare/v0.2.9...v0.2.10) (2025-12-28)


### Features

* **test:** add acceptance tests for LLM module with real OpenRouter API ([0bc0cab](https://github.com/korchasa/ai-skel-ts/commit/0bc0cab67d6823e42c347767baeb0592e45cd300))


### Chores

* **ci:** add OpenRouter API key to environment variables for checks ([34ffdde](https://github.com/korchasa/ai-skel-ts/commit/34ffdded75d08d5e07408d3e19f483bd55db3540))

### [0.2.9](https://github.com/korchasa/ai-skel-ts/compare/v0.2.8...v0.2.9) (2025-12-28)


### Bug Fixes

* enhance openrouter chat call to include usage tracking ([9b103f3](https://github.com/korchasa/ai-skel-ts/commit/9b103f3dc3a684389e3249ff1a23cd5bf862838d))

### [0.2.8](https://github.com/korchasa/ai-skel-ts/compare/v0.2.7...v0.2.8) (2025-12-28)


### Bug Fixes

* pass explicit tag name to github release action ([bfc717c](https://github.com/korchasa/ai-skel-ts/commit/bfc717ca412fcd57e87129cf322a7bd41d0e284b))

### [0.2.7](https://github.com/korchasa/ai-skel-ts/compare/v0.2.6...v0.2.7) (2025-12-28)


### Bug Fixes

* re-trigger automatic release after cleaning up tags ([f9a396b](https://github.com/korchasa/ai-skel-ts/commit/f9a396b0dbc05668519f9702699b415cacdf7ca6))
* trigger automatic release pipeline ([f4a2edc](https://github.com/korchasa/ai-skel-ts/commit/f4a2edccd8a582d4c946ba3214a6a22239fb27b4))
* update release workflow to use setup-node for authentication ([1353a9c](https://github.com/korchasa/ai-skel-ts/commit/1353a9c09560e0d030b24becc5cf6e9d44893f8e))


### Chores

* simplify CI/CD to a single auto-release workflow ([2296cb5](https://github.com/korchasa/ai-skel-ts/commit/2296cb55770f82f7c95de4a1e28f956b34410460))
* unify all workflows into a single ci.yml pipeline ([7b8ab53](https://github.com/korchasa/ai-skel-ts/commit/7b8ab53f981b950ef72023a9156c8af5ddc9e424))

### [0.2.5](https://github.com/korchasa/ai-skel-ts/compare/v0.2.4...v0.2.5) (2025-12-28)


### Bug Fixes

* add workflow_dispatch trigger to Release workflow for manual runs ([fc69439](https://github.com/korchasa/ai-skel-ts/commit/fc69439966f00fb3bfc77d4360d4ba17ca6d506c))

### [0.2.4](https://github.com/korchasa/ai-skel-ts/compare/v0.2.3...v0.2.4) (2025-12-28)


### Bug Fixes

* clean up release workflow and trigger new release ([8f41c24](https://github.com/korchasa/ai-skel-ts/commit/8f41c240aa9561d9015e57247890498408601a31))
* final attempt to trigger clean release workflow ([9706a1a](https://github.com/korchasa/ai-skel-ts/commit/9706a1accbaad9b0adc9ae40a928d70ba44a84be))
* update release workflow to fix authentication issues ([6c67a83](https://github.com/korchasa/ai-skel-ts/commit/6c67a838c1cff49122f1b6967f35091eddd24db7))


### Code Refactoring

* separate tag creation and release publication workflows ([7b5244a](https://github.com/korchasa/ai-skel-ts/commit/7b5244acb30811eb8e5155f6717ee2df52cec076))

### [0.2.3](https://github.com/korchasa/ai-skel-ts/compare/v0.2.2...v0.2.3) (2025-12-28)


### Bug Fixes

* add package build and publish steps to release workflow ([ad3ae24](https://github.com/korchasa/ai-skel-ts/commit/ad3ae24a5e3edb95e5eaec457808a90286b390f0))
* trigger package publication for v0.2.2 ([46a96e1](https://github.com/korchasa/ai-skel-ts/commit/46a96e1265c7805bc8065cb4de81120e30b7b56d))

### [0.2.2](https://github.com/korchasa/ai-skel-ts/compare/v0.2.0...v0.2.2) (2025-12-28)


### Features

* add test feature for automatic release testing ([32a038e](https://github.com/korchasa/ai-skel-ts/commit/32a038e81e3b7f88f143481a36f877230d5e6fa5))


### Bug Fixes

* convert .versionrc to JSON format for ES module compatibility ([e0d77a2](https://github.com/korchasa/ai-skel-ts/commit/e0d77a21c646d4c57d6bf969de110ecab6cd16d4))
* correct YAML syntax in release workflow ([21e4892](https://github.com/korchasa/ai-skel-ts/commit/21e489223e7f5d79b79f77a878f05a3ad6e57d17))


### Continuous Integration

* add automated release workflow with standard-version ([5969daf](https://github.com/korchasa/ai-skel-ts/commit/5969dafc51d2aa5bd9f367ef69aaa28a2946524b))
* add automated release workflow with standard-version ([d645030](https://github.com/korchasa/ai-skel-ts/commit/d645030dae77adc6361a638b3365d4b013b8bcd3))
* add automatic release triggers on push to main ([d06096a](https://github.com/korchasa/ai-skel-ts/commit/d06096a21707332feede84b130669433faaaac7b))


### Chores

* add .versionrc.js configuration for commit message types and URLs ([7c6c988](https://github.com/korchasa/ai-skel-ts/commit/7c6c98885f0eae4554885373a8484fa63565505f))
* add task file document to .gitignore ([596e41c](https://github.com/korchasa/ai-skel-ts/commit/596e41c31e17e7886243b558e4efddd73b2095a5))
* clean up duplicate workflow files ([8e5c591](https://github.com/korchasa/ai-skel-ts/commit/8e5c5915107695d3397f8330b3cf176c25f18f73))
* **release:** 0.2.1 ([1b140f0](https://github.com/korchasa/ai-skel-ts/commit/1b140f00c81a0a335ebe825f9fdbe0e2c586b355))
* remove CHANGELOG.md file ([042941c](https://github.com/korchasa/ai-skel-ts/commit/042941cb4d73242c4f0b1430685db61a864f1548))
* remove test file ([1c2b297](https://github.com/korchasa/ai-skel-ts/commit/1c2b2970499975c977570172b3dcb32f9fdeb562))
* remove task file document ([a07f0e5](https://github.com/korchasa/ai-skel-ts/commit/a07f0e57aff275a3d6c927b3ec30d46e5591265c))


### Documentation

* enhance LlmRequester and tryGenerateJson documentation to include Zod validation self-correction examples ([6b5aa56](https://github.com/korchasa/ai-skel-ts/commit/6b5aa56470b35028af6c94ca6cbf0883b02500fb))
