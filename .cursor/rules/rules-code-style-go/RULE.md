---
alwaysApply: true
---
## CODE STYLE RULES FOR GO (GOLANG)

- NO FALLBACKS/HACKS WITHOUT EXPLICIT REQUEST. "FAIL FAST, FAIL CLEARLY."
- USE TYPED CONSTANTS/ENUMS INSTEAD OF MAGIC NUMBERS/STRINGS
- FUNCTIONS ≤100 LINES; BREAK COMPLEX LOGIC INTO HELPERS
- TREAT LINTER WARNINGS AS ERRORS
- EXPORTED FUNCTIONS FIRST, AUXILIARIES LAST
- DOCUMENT ALL EXPORTED TYPES AND FUNCTIONS WITH GODOC
- TESTABILITY IS MORE IMPORTANT THAN PERFORMANCE AND ENCAPSULATION

### Go Specifics
- Formatting: Always use `gofmt` or `goimports`.
- Error Handling:
  - Handle errors explicitly (`if err != nil`).
  - Use `fmt.Errorf("doing action: %w", err)` to wrap errors with context.
  - Avoid `panic` in library code; return errors instead.
- Naming:
  - PascalCase for exported (public) symbols.
  - camelCase for unexported (private) symbols.
  - Short, descriptive variable names (`ctx`, `err`, `mu`, `wg`).
  - Interface names should end in `er` (e.g., `Reader`, `Writer`) if simple.
- Context:
  - Pass `context.Context` as the first argument to functions performing I/O or long-running tasks.
  - Never store `Context` in structs; pass it explicitly.
- Interfaces:
  - Define interfaces where they are used (consumer-defined).
  - Keep interfaces small and focused (Single Responsibility).
  - Accept interfaces, return structs.
- Concurrency:
  - Use channels for communication, mutexes for state.
  - Always handle goroutine lifecycle; avoid leaks.
  - Use `sync.WaitGroup` or `errgroup` to wait for goroutines.

### Project Structure
- Standard Go Project Layout (if applicable):
  - `/cmd`: Main applications.
  - `/internal`: Private application and library code.
  - `/pkg`: Library code ok to use by external applications.
- Modules: Use `go.mod` and `go.sum` for dependency management.
- Configuration: Use environment variables or configuration files (e.g., standard `flag` or popular libraries).

### Testing
- Don't change prod code to pass tests.
- Use Table-Driven Tests for testing multiple inputs/outputs.
- Co-locate tests: `foo_test.go` next to `foo.go`.
- Use the standard `testing` package.
- Use `t.Parallel()` for parallel test execution where safe.
- Test coverage target: ~60-70%.
- Naming: `TestFunction_Scenario` or `TestFunction/Scenario`.

### Documentation
- Godoc comments for ALL exported types, variables, and functions.
- Comments should start with the name of the symbol.
  - `// DoSomething does something...`
- Use "English comments only".
- Document complex logic/architecture in README or separate docs.

### Performance & Security
- Avoid premature optimization. Measure first (pprof).
- Use `strings.Builder` for efficient string concatenation.
- Sanitize external inputs.
- No sensitive data in logs.
- Use standard crypto libraries; avoid rolling your own.

