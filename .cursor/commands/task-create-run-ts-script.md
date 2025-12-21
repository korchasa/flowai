---
description: Create comprehensive run.ts script for project automation with check command stages
---

# Create Run Script

## Overview
Create a comprehensive `run.ts` script for project automation following the project's specification and documentation requirements.

## Todo List
1. **Read specifications**
   - Review project documentation and requirements
   - Understand the project's technology stack and build process
   - Identify all required automation commands

2. **Generate run.ts file**
   - Create `run.ts` in the project root
   - Implement as a single, independently executable TypeScript file
   - Base implementation on Deno framework (<https://deno.land>)

3. **Implement required commands**
   - `init` - Install project dependencies
   - `test-one <test path>` - Run specific test by path
   - `cleanup` - Clean the project directory
   - `dev` - Run project in development mode

4. **Implement check command with stages**
   - `check` command with sequential stages:
     - `clean` - Clean the project
     - `compile` - Compile the project
     - `comment-scan` - Scan for TODOs, FIXMEs, debug prints, and linter suppressions
     - `format` - Format code with project formatter
     - `lint` - Lint code with project linter
     - `test` - Run all unit, integration, and acceptance tests
     - `analyze` - Run static analysis

5. **Test and validate**
   - Execute `./run.ts <command> [options]` for each command
   - Verify all commands are executable and functional
   - Fix any errors or issues discovered during testing

## Checklist
- [ ] Project specifications and documentation reviewed
- [ ] `run.ts` file created in project root
- [ ] File is single, independently executable TypeScript file
- [ ] Deno framework properly implemented
- [ ] `init` command implemented (dependency installation)
- [ ] `test-one <test path>` command implemented (specific test execution)
- [ ] `cleanup` command implemented (project cleanup)
- [ ] `dev` command implemented (development mode)
- [ ] `check` command implemented with all stages:
  - [ ] `clean` stage
  - [ ] `compile` stage
  - [ ] `comment-scan` stage
  - [ ] `format` stage
  - [ ] `lint` stage
  - [ ] `test` stage
  - [ ] `analyze` stage
- [ ] All commands tested and verified working
- [ ] Errors fixed and functionality validated
