---
name: flow-skill-configure-strict-typescript
description: Configures the project for strict TypeScript mode and enforces specific coding standards. Use when the user asks to configure "strict typescript" or enforce strict typing rules.
---

# Configure Strict TypeScript

## Instructions

This skill helps you configure a project for strict TypeScript compliance and enforces specific coding standards.

### 1. Configure `deno.json`

Update `deno.json` to enforce strict mode and linting rules.

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "include": [
        "explicit-function-return-type",
        "no-explicit-any",
        "eqeqeq"
      ]
    }
  }
}
```

### 2. Enforce Coding Standards

When writing or refactoring code, adhere to these rules:

*   **No Fallbacks/Hacks**: Fail fast and clearly.
*   **Typed Constants**: Use typed constants/enums instead of magic numbers/strings.
*   **Function Length**: Keep functions ≤100 lines.
*   **Parameter Style**: Use strict inline type style for parameters:
    ```ts
    export function example({ required, optional = "default" }: Readonly<{ required: string; optional?: string }>) { ... }
    ```
*   **Immutability**: Use `readonly`, `Readonly<T>`, and `ReadonlyArray<T>`.
*   **No `any`**: Use `unknown` if necessary.

### 3. File Organization

Ensure the project follows this structure:
*   Shallow structure (≤3 levels).
*   Code order: imports, constants, types, interfaces, classes, main, public functions, private functions, tests.

### 4. Documentation

*   Document every file, class, and exported function with TSDoc.
*   Focus on **responsibility** (why) and **implementation details** (how).
*   Do NOT document types that are obvious from the signature.

### 5. Update Project Documentation

Update the project's `AGENTS.md` to reflect the enforced standards.

1.  **Read** `AGENTS.md`.
2.  **Add or Update** the following sections (create them if they don't exist):

    ```markdown
    ## Code Standards
    - **Strict TypeScript**: Enabled (`strict: true`, `noImplicitAny`, etc.).
    - **Linting**: Recommended rules + `explicit-function-return-type`, `no-explicit-any`, `eqeqeq`.
    - **Immutability**: Prefer `readonly`, `Readonly<T>`, `ReadonlyArray<T>`.
    - **Parameters**: Use strict inline type style for object parameters.
    - **No Magic Values**: Use typed constants/enums.

    ## File Organization
    - **Structure**: Shallow (≤3 levels).
    - **Order**: Imports -> Constants -> Types -> Interfaces -> Classes -> Main -> Public -> Private -> Tests.
    ```
