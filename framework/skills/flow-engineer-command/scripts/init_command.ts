#!/usr/bin/env -S deno run -A
/**
 * Command Initializer - Creates a new command from template
 *
 * Usage:
 *     init_command.ts <command-name> --path <path>
 *
 * Examples:
 *     init_command.ts flow-new-command --path skills/public
 *     init_command.ts flow-api-helper --path skills/private
 *     init_command.ts flow-custom-command --path /custom/location
 */

import { join, resolve } from "jsr:@std/path";

const SKILL_TEMPLATE = `---
name: {command_name}
description: [TODO: Complete and informative explanation of what the command does and when to use it. Include WHEN to use this command - specific scenarios, file types, or tasks that trigger it.]
---

# {command_title}

## Overview

[TODO: 1-2 sentences explaining what this command enables]

## Structuring This Command

[TODO: Choose the structure that best fits this command's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Works well when there are clear step-by-step procedures
- Example: DOCX command with "Workflow Decision Tree" → "Reading" → "Creating" → "Editing"
- Structure: ## Overview → ## Workflow Decision Tree → ## Step 1 → ## Step 2...

**2. Task-Based** (best for tool collections)
- Works well when the command offers different operations/capabilities
- Example: PDF command with "Quick Start" → "Merge PDFs" → "Split PDFs" → "Extract Text"
- Structure: ## Overview → ## Quick Start → ## Task Category 1 → ## Task Category 2...

**3. Reference/Guidelines** (best for standards or specifications)
- Works well for brand guidelines, coding standards, or requirements
- Example: Brand styling with "Brand Guidelines" → "Colors" → "Typography" → "Features"
- Structure: ## Overview → ## Guidelines → ## Specifications → ## Usage...

**4. Capabilities-Based** (best for integrated systems)
- Works well when the command provides multiple interrelated features
- Example: Product Management with "Core Capabilities" → numbered capability list
- Structure: ## Overview → ## Core Capabilities → ### 1. Feature → ### 2. Feature...

Patterns can be mixed and matched as needed. Most commands combine patterns (e.g., start with task-based, add workflow for complex operations).

Delete this entire "Structuring This Command" section when done - it's just guidance.]

## [TODO: Replace with the first main section based on chosen structure]

[TODO: Add content here. See examples in existing commands:
- Code samples for technical commands
- Decision trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/templates/references as needed]

## Resources

This command includes example resource directories that demonstrate how to organize different types of bundled resources:

### scripts/
Executable code (Python/Bash/etc.) that can be run directly to perform specific operations.

**Examples from other commands:**
- PDF command: \`fill_fillable_fields.py\`, \`extract_form_field_info.py\` - utilities for PDF manipulation
- DOCX command: \`document.py\`, \`utilities.py\` - Python modules for document processing

**Appropriate for:** Python scripts, shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by AssistFlow for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform AssistFlow's process and thinking.

**Examples from other commands:**
- Product management: \`communication.md\`, \`context_building.md\` - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that AssistFlow should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output AssistFlow produces.

**Examples from other commands:**
- Brand guidelines: logo.png, slides_template.pptx
- Frontend builder: hello-world/ directory with HTML/React boilerplate
- Typography: custom-font.ttf, font-family.woff2

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Any unneeded directories can be deleted.** Not every command requires all three types of resources.
`;

const EXAMPLE_SCRIPT = `#!/usr/bin/env python3
"""
Example helper script for {command_name}

This is a placeholder script that can be executed directly.
Replace with actual implementation or delete if not needed.

Example real scripts from other commands:
- pdf/scripts/fill_fillable_fields.py - Fills PDF form fields
- pdf/scripts/convert_pdf_to_images.py - Converts PDF pages to images
"""

def main():
    print("This is an example script for {command_name}")
    # TODO: Add actual script logic here
    # This could be data processing, file conversion, API calls, etc.

if __name__ == "__main__":
    main()
`;

const EXAMPLE_REFERENCE = `# Reference Documentation for {command_title}

This is a placeholder for detailed reference documentation.
Replace with actual reference content or delete if not needed.

Example real reference docs from other commands:
- product-management/references/communication.md - Comprehensive guide for status updates
- product-management/references/context_building.md - Deep-dive on gathering context
- bigquery/references/ - API references and query examples

## When Reference Docs Are Useful

Reference docs are ideal for:
- Comprehensive API documentation
- Detailed workflow guides
- Complex multi-step processes
- Information too lengthy for main SKILL.md
- Content that's only needed for specific use cases

## Structure Suggestions

### API Reference Example
- Overview
- Authentication
- Endpoints with examples
- Error codes
- Rate limits

### Workflow Guide Example
- Prerequisites
- Step-by-step instructions
- Common patterns
- Troubleshooting
- Best practices
`;

const EXAMPLE_ASSET = `# Example Asset File

This placeholder represents where asset files would be stored.
Replace with actual asset files (templates, images, fonts, etc.) or delete if not needed.

Asset files are NOT intended to be loaded into context, but rather used within
the output AssistFlow produces.

Example asset files from other commands:
- Brand guidelines: logo.png, slides_template.pptx
- Frontend builder: hello-world/ directory with HTML/React boilerplate
- Typography: custom-font.ttf, font-family.woff2
- Data: sample_data.csv, test_dataset.json

## Common Asset Types

- Templates: .pptx, .docx, boilerplate directories
- Images: .png, .jpg, .svg, .gif
- Fonts: .ttf, .otf, .woff, .woff2
- Boilerplate code: Project directories, starter files
- Icons: .ico, .svg
- Data files: .csv, .json, .xml, .yaml

Note: This is a text placeholder. Actual assets can be any file type.
`;

function titleCaseCommandName(commandName: string): string {
  return commandName.split("-").map((w) =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
}

export function initCommand(commandName: string, path: string): string | null {
  const commandDir = resolve(path, commandName);

  // Check if directory already exists
  try {
    Deno.statSync(commandDir);
    console.log(`❌ Error: Command directory already exists: ${commandDir}`);
    return null;
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      console.log(`❌ Error creating directory: ${e}`);
      return null;
    }
  }

  // Create command directory
  try {
    Deno.mkdirSync(commandDir, { recursive: true });
    console.log(`✅ Created command directory: ${commandDir}`);
  } catch (e) {
    console.log(`❌ Error creating directory: ${e}`);
    return null;
  }

  // Create SKILL.md from template
  const commandTitle = titleCaseCommandName(commandName);
  const commandContent = SKILL_TEMPLATE
    .replaceAll("{command_name}", commandName)
    .replaceAll("{command_title}", commandTitle);

  const skillMdPath = join(commandDir, "SKILL.md");
  try {
    Deno.writeTextFileSync(skillMdPath, commandContent);
    console.log("✅ Created SKILL.md");
  } catch (e) {
    console.log(`❌ Error creating SKILL.md: ${e}`);
    return null;
  }

  // Create resource directories with example files
  try {
    // Create scripts/ directory with example script
    const scriptsDir = join(commandDir, "scripts");
    Deno.mkdirSync(scriptsDir, { recursive: true });
    const exampleScriptPath = join(scriptsDir, "example.py");
    Deno.writeTextFileSync(
      exampleScriptPath,
      EXAMPLE_SCRIPT.replaceAll("{command_name}", commandName),
    );
    Deno.chmodSync(exampleScriptPath, 0o755);
    console.log("✅ Created scripts/example.py");

    // Create references/ directory with example reference doc
    const referencesDir = join(commandDir, "references");
    Deno.mkdirSync(referencesDir, { recursive: true });
    const exampleReferencePath = join(referencesDir, "api_reference.md");
    Deno.writeTextFileSync(
      exampleReferencePath,
      EXAMPLE_REFERENCE.replaceAll("{command_title}", commandTitle),
    );
    console.log("✅ Created references/api_reference.md");

    // Create assets/ directory with example asset placeholder
    const assetsDir = join(commandDir, "assets");
    Deno.mkdirSync(assetsDir, { recursive: true });
    const exampleAssetPath = join(assetsDir, "example_asset.txt");
    Deno.writeTextFileSync(exampleAssetPath, EXAMPLE_ASSET);
    console.log("✅ Created assets/example_asset.txt");
  } catch (e) {
    console.log(`❌ Error creating resource directories: ${e}`);
    return null;
  }

  // Print next steps
  console.log(
    `\n✅ Command '${commandName}' initialized successfully at ${commandDir}`,
  );
  console.log("\nNext steps:");
  console.log(
    "1. Edit SKILL.md to complete the TODO items and update the description",
  );
  console.log(
    "2. Customize or delete the example files in scripts/, references/, and assets/",
  );
  console.log("3. Run the validator when ready to check the command structure");

  return commandDir;
}

function main(): void {
  if (Deno.args.length < 3 || Deno.args[1] !== "--path") {
    console.log("Usage: init_command.ts <command-name> --path <path>");
    console.log("\nCommand name requirements:");
    console.log("  - Hyphen-case identifier (e.g., 'flow-data-analyzer')");
    console.log("  - Lowercase letters, digits, and hyphens only");
    console.log("  - Max 40 characters");
    console.log("  - Must match directory name exactly");
    console.log("\nExamples:");
    console.log("  init_command.ts flow-new-command --path skills/public");
    console.log("  init_command.ts flow-api-helper --path skills/private");
    console.log(
      "  init_command.ts flow-custom-command --path /custom/location",
    );
    Deno.exit(1);
  }

  const commandName = Deno.args[0];
  const path = Deno.args[2];

  console.log(`🚀 Initializing command: ${commandName}`);
  console.log(`   Location: ${path}`);
  console.log();

  const result = initCommand(commandName, path);

  if (result) {
    Deno.exit(0);
  } else {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
