# YOU MUST

- STRICTLY FOLLOW YOUR ROLE.
- START PROCESSING USER INPUT BY READING THE DOCUMENTATION IN `./documents` AT BEGIN OF THE TASK.
- FINISH PROCESSING USER INPUT BY RUNNING `deno task check` AND FIXING ALL FOUND ERRORS, WARNINGS, AND LINTING PROBLEMS.
- YOU WILL BE REWARDED FOR FOLLOWING INSTRUCTIONS AND GOOD ANSWERS.
- DO NOT USE STUBS IN THE CODE, AS I HAVE NO FINGERS, AND THIS IS A TRAUMA.
- ALWAYS INDEPENDENTLY CHECK HYPOTHESES.
- ALWAYS CHECK THE CHANGES MADE BY RUNNING THE APPROPRIATE TESTS OR SCRIPTS.
- ALWAYS KEEP THE PROJECT IN WORKING CONDITION: WITHOUT ERRORS, WARNINGS, AND PROBLEMS IN THE FORMATER AND LINTER OUTPUT
- STRICTLY FOLLOW TDD RULES.
- ANSWER IN LANGUAGE OF THE USER QUERY.
- WRITE ALL DOCUMENTATION IN ENGLISH IN COMPRESSED STYLE.
- IF YOU SEE CONTRADICTIONS IN THE REQUEST OR CONTEXT, SAY ABOUT THEM, ASK THE NECESSARY QUESTIONS AND STOP.
- DO NOT USE STUBS, "CRUTCHES", DECEPTIONS, OR OTHER PREMODS TO BYPASS CHECKS.

## Project Information

- Project Name: {{PROJECT_NAME}}

## Project Vision

{{PROJECT_VISION}}

## Project tooling Stack

{{TOOLING_STACK}}

## Development Commands

{{DEVELOPMENT_COMMANDS}}

## Architecture

{{ARCHITECTURE}}

## Key Decisions

{{KEY_DECISIONS}}

## DOCUMENTATION STRUCTURE AND RULES (directory `documents`)

REMEMBER: AFTER EACH MEMORY RESET, YOU START COMPLETELY FROM SCRATCH. DOCUMENTATION IS THE ONLY LINK TO PREVIOUS WORK. IT MUST BE MAINTAINED WITH ACCURACY AND CLARITY, AS EFFECTIVENESS ENTIRELY DEPENDS ON ITS ACCURACY.

### Hierarchy and purpose

- Product Vision (VISION): The starting point and most important document. Defines the "Why" and "For Whom". Answers the questions: what is the long-term goal and value. Stored in `AGENTS.md`.
- Software Requirements Specification (SRS): Is the primary source of truth for the project. Answers the questions: what are we doing and why. Depends on Product Vision.
- Software Design Specification (SDS): Is a source of project implementation details. Depends on Software Requirements Specification (SRS). Answers the question: how we do it.
- File Structure Map: A map of the project's file structure and its purpose.
- Whiteboard: A temporary notes file for in-progress notes.

### Documentation Rules

- Application MUST STRICTLY COMPLY with the VISION, SRS and SDS.
- VISION is read-only
- When adding a new requirement or updating existing ones: update SRS (if needed) -> update SDS -> implementation.
- Implemented requirements and acceptance criteria should be marked with [x] before the requirement and criterion title. Not implemented ones should be marked with [ ] or omitted.

### Software Requirements Specification (SRS) Format (file @documents/requirements.md)

```markdown
# Software Requirements Specification (SRS)

## 1. Introduction

- **Project description:**
- **Definitions and abbreviations:**

## 2. General description

- **System context:** (diagram or environment description)
- **Assumptions and constraints:**
- **Assumptions:**

## 3. Functional requirements

### 3.1 Requirement FR-1

- **Description:**
- **Use case scenario:** [with links to bdd/gherkin files, if used in project]
- **Acceptance criteria:**

### 3.2 Requirement FR-2

...

## 4. Non-functional requirements

- **Performance:**
- **Reliability:**
- **Security:**
- **Scalability:**
- **Availability/UX:**

## 5. Interfaces

- **APIs and integrations:**
- **Protocols and data formats:**
- **UI/UX constraints:**

## 6. Acceptance criteria

- The system is considered accepted if the following are met: ...
```

### Software Design Specification (SDS) Format (file @documents/design.md)

```markdown
# Software Design Specification (SDS)

## 1. Introduction

- **Document purpose:**
- **Relation to SRS:** (links to requirements)

## 2. System Architecture

- **Overview diagram:** (C4/UML/block diagram)
- **Main subsystems and their roles:**

## 3. Components

### 3.1 Component A

- **Purpose:**
- **Interfaces:** (API, input/output)
- **Dependencies:**

### 3.2 Component B

...

## 4. Data and Storage

- **Entities and attributes:**
- **ER diagram:**
- **Migration policies:**

## 5. Algorithms and Logic

- **Key algorithms:** (pseudocode or diagram)
- **Business rules:**

## 6. Non-functional Aspects

- **Scalability:**
- **Fault tolerance:**
- **Security:**
- **Monitoring and logging:**

## 7. Constraints and Trade-offs

- What has been simplified
- What has been deferred to future versions
```

### Whiteboard Format (file @documents/whiteboard.md)

- Temporary notes
- Ongoing plans and progress marks.
- The only file for in-progress notes.
- Must be cleaned up after new session starts.

### How to write in compressed style (apply to all documentation)

Following the rules:

- Remove history: Remove history, updates, and changelog.
- Use only english in all files.
- Use combined extractive & abstractive summarization: First, extract ALL facts, then compress them into concise, coherent content WITHOUT LOSING ANY FACTS.
- Prioritize essential information: Filter out fluff, redundancies, and unnecessary explanations. Use high-information words.
- Utilize compact formats: Use lists, tables, YAML, or Mermaid diagrams whenever possible.
- Optimize lexicon: Remove stopwords and replace them with shorter synonyms without losing meaning.
- Apply entity compression: After the first mention, use widespread abbreviations and acronyms.
- Avoid filler phrases: Use direct language and eliminate repetitive or superfluous wording.
- Structure clearly: Organize content with headings and clear sections for better readability and efficiency.
- Lemmatize words: Reduce words to their base forms when applicable.
- Prefer special symbols, numerals, ligatures, etc.: REPLACE words with them when its relevant.

## Code Documentation Rules (apply to all code)

- **Module Documentation**: Each module must have an `AGENTS.md` file describing its responsibility and key decisions.
- **Code Comments**: Each class, method, and function must be accompanied by comments describing its responsibility in the format accepted for the language (e.g., JSDoc for TS/JS, GoDoc for Go).
- **No Trivial Comments**: Do not describe obvious things (e.g., "Constructor", "Getters/Setters"). Focus on "Why" and "How" if it's non-trivial.

## TDD FLOW

1. **Red**
   - Write a simple test for new behavior or to reproduce a bug.
   - Run it with `deno test <test_id>`.

2. **Green**
   - Write just enough code to pass the test.
   - Run `deno test <test_id>` again to confirm it passes.

3. **Refactor**
   - Improve code and tests without changing what they do.
   - Remove duplicates and make things clearer.
   - Run `deno test <test_id>` to ensure it still works.

4. **Final Check**
   - Run `deno fmt && deno lint && deno test` to make sure everything is correct.
   - Fix all problems, including lint errors and warnings.

### Test Rules

- Put tests in the same package as the code being tested. It's okay to test private methods.
- Don't write code just to satisfy tests unless it fixes real issues.
- Don't use stubs—write real, working code.
- You can rerun specific tests to save time, but always run all tests before finishing.
