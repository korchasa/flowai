---
alwaysApply: true
---
## CODE STYLE RULES FOR TYPESCRIPT

- NO FALLBACKS/HACKS WITHOUT EXPLICIT REQUEST. "FAIL FAST, FAIL CLEARLY."
- USE TYPED CONSTANTS/ENUMS INSTEAD OF MAGIC NUMBERS/STRINGS
- FUNCTIONS ≤100 LINES; BREAK COMPLEX LOGIC INTO HELPERS
- TREAT LINTER/COMPILER WARNINGS AS ERRORS
- MAIN/EXPORTED FUNCTIONS FIRST, AUXILIARIES LAST
- PARAMETER STYLE: `{ REQUIRED, OPTIONAL = "DEFAULT" }`
- DOCUMENT EVERY FILE, CLASS, AND METHOD/FUNCTION (FOCUS ON RESPONSIBILITY AND IMPLEMENTATION)
- TESTABILITY IS MORE IMPORTANT THAN PERFORMANCE AND ENCAPSULATION
- CODE ORDER IN FILES: imports, constants, types, interfaces, classes, main, public functions, private functions, tests

### TypeScript
- Strict mode (`strict: true`)
- Interfaces > types for objects
- Union types over enums for simple cases
- Pass all class dependencies via constructors or factory methods.
- Pass dependencies for specific method calls via method parameters.
- Prioritize pure functions for business logic; separate state mutation from logic.
- Enforce immutability: use `readonly`, `Readonly<T>`, and `ReadonlyArray<T>`.
- Avoid `any`; use `unknown` for truly unknown types
- Use utility types (`Partial`, `Pick`, etc.)
- Don't use index files to import modules
- Use a similar strong inline type style for parameter passing to methods and functions:
```ts
export async function fetchData(
  {
    url,
    method = 'GET',
    retries = 3,
    requestData,
  }: Readonly<{
    url: string;
    method?: 'GET' | 'POST';
    retries?: number;
    requestData: RequestData;
  }>
): Promise<readonly ResponseData[]> {
  // ...
}
```


#### Testing
- Don't change prod code to pass tests
- Unit tests for pure functions
- Integration tests for interactions
- E2E for critical flows
- Given-When-Then test names
- Test errors/edge cases; mock dependencies
- Target 60% coverage
- Keep a test pyramid (~70% unit, ~25% integration, ≤5% e2e); don’t push everything into e2e.
- Behavior-first tests; avoid locking to internals.
- Co-locate tests next to source (*.test.ts); keep fixtures in __fixtures__.
- Fail fast on unhandledRejection/console.error.
- Deterministic time/IDs/randomness; no wall-clock dependencies.
- Use fake timers deliberately; avoid arbitrary sleeps.
- Include negative paths (validation, auth, limits, idempotency, duplicate updates).
- Split unit/integration in CI; publish coverage reports.

### File Organization
- Feature-based folders
- Separate concerns: services, adapters, utils, types, tests
- Shallow structure (≤3 levels)
- Consistent naming

### Documentation
- Document every file, class, method, and function with TSDoc.
- Focus on responsibility (what it does/is for) and implementation details or peculiarities.
- DO NOT document parameters and return values (TypeScript types already provide this information).
- English comments only
- Intent/invariants when code unclear; no redundant comments
- Document complex logic/architecture
- Updated READMEs; inline comments for non-obvious code

### Performance
- Avoid synchronous heavy CPU on request path; offload to workers.
- Use caches for repeated computations where safe.
- Apply circuit breakers/timeouts for external I/O.

### Security
- Input validation/sanitization
- Secure secrets via env vars; never hardcode tokens/keys
- Avoid logging secrets/PII; scrub identifiers in error logs
- Limit file sizes/types for uploads; scan where applicable
- Keep dependencies updated regularly
