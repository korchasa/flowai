import os
import json
import sys
import shutil

def generate_agents(project_info_path, interview_data_path, template_path, output_path, rules_src_dir, rules_dest_dir):
    with open(project_info_path, 'r') as f:
        project_info = json.load(f)
    
    interview_data = {}
    if os.path.exists(interview_data_path):
        try:
            with open(interview_data_path, 'r') as f:
                interview_data = json.load(f)
        except:
            pass # Ignore if empty or invalid

    root_dir = project_info.get('root_dir', os.getcwd())
    is_greenfield = project_info.get('is_new', False)
    
    # Merge info
    project_name = interview_data.get('project_name', os.path.basename(root_dir))
    
    # Determine stack
    stack = project_info['stack']
    if 'stack' in interview_data:
        # Merge and dedupe
        stack = list(set(stack + interview_data.get('stack', [])))
    
    tooling_stack_str = "- " + "\n- ".join(stack) if stack else "- Unknown"
    
    # Development commands (simple inference)
    dev_commands = []
    if 'Deno' in stack:
        dev_commands.append("- `deno task start` (check deno.json)")
        dev_commands.append("- `deno task check` (check deno.json)")
        dev_commands.append("- `deno task test` (check deno.json)")
    if 'Node.js' in stack:
        dev_commands.append("- `npm start` (check package.json)")
        dev_commands.append("- `npm test` (check package.json)")
    if 'Go' in stack:
        dev_commands.append("- `go run .`")
        dev_commands.append("- `go test ./...`")
        
    dev_commands_str = "\n".join(dev_commands) if dev_commands else "- No commands detected"

    # Architecture (simple inference)
    architecture = "- To be determined"
    if 'architecture' in interview_data:
        architecture = interview_data['architecture']
    
    # Key Decisions
    key_decisions = "- To be determined"
    if 'key_decisions' in interview_data:
        key_decisions = interview_data['key_decisions']

    # Rule Selection
    selected_rules = []
    
    # Default rules
    selected_rules.append('rules-autonomous')
    selected_rules.append('rules-zen')
    selected_rules.append('af-skill-working-with-git')
    selected_rules.append('rules-run-commands')
    
    if 'Deno' in stack:
        selected_rules.append('rules-code-style-ts-deno')
    if 'Node.js' in stack: 
        selected_rules.append('rules-code-style-fullstack')
    if 'Go' in stack:
        selected_rules.append('rules-code-style-go')
    if 'Swift' in stack:
        selected_rules.append('rules-code-style-swift')
        
    if 'tdd' in interview_data.get('preferences', []):
        selected_rules.append('rules-tdd')
        
    # Copy rules
    if not os.path.exists(rules_dest_dir):
        os.makedirs(rules_dest_dir)
        
    copied_rules = []
    for rule_dir in selected_rules:
        src = os.path.join(rules_src_dir, rule_dir)
        dest = os.path.join(rules_dest_dir, rule_dir)
        if os.path.exists(src):
            if os.path.exists(dest):
                 shutil.rmtree(dest)
            shutil.copytree(src, dest)
            copied_rules.append(rule_dir)
            
    # Read Template
    with open(template_path, 'r') as f:
        template = f.read()
        
    # Fill Template
    content = template.replace('{{PROJECT_NAME}}', project_name)
    content = content.replace('{{TOOLING_STACK}}', tooling_stack_str)
    content = content.replace('{{DEVELOPMENT_COMMANDS}}', dev_commands_str)
    content = content.replace('{{ARCHITECTURE}}', architecture)
    content = content.replace('{{KEY_DECISIONS}}', key_decisions)
    
    # Write output
    with open(output_path, 'w') as f:
        f.write(content)

    # --- New Features Implementation ---

    # 1. Generate documents/ structure
    docs_dir = os.path.join(root_dir, 'documents')
    if not os.path.exists(docs_dir):
        os.makedirs(docs_dir)
        print("Created documents/ directory")

    # Create placeholder files
    placeholders = {
        'vision.md': '# Project Vision\n\nDescribe the high-level goals and vision of the project here.',
        'requirements.md': '# Requirements\n\nList the functional and non-functional requirements.',
        'architecture.md': '# Architecture\n\nDescribe the system architecture.'
    }
    
    # For Brownfield: Populate architecture.md with discovery info
    if not is_greenfield:
        placeholders['architecture.md'] += f"\n\n## Discovered Structure\n\n```\n" + "\n".join(project_info.get('file_tree', [])) + "\n```"
        if project_info.get('readme_content'):
             placeholders['architecture.md'] += "\n\n## README Summary\n\n" + project_info.get('readme_content')[:1000] + "\n..."

    for filename, content in placeholders.items():
        path = os.path.join(docs_dir, filename)
        if not os.path.exists(path):
            with open(path, 'w') as f:
                f.write(content)
            print(f"Created {filename}")

    # 5. Generate .cursorignore
    cursorignore_path = os.path.join(root_dir, '.cursorignore')
    if not os.path.exists(cursorignore_path):
        ignore_content = ".git/\n.cursor/\nnode_modules/\ndist/\nbuild/\ncoverage/\n*.lock\n"
        if 'Python' in stack:
            ignore_content += "__pycache__/\n*.pyc\nvenv/\n.env\n"
        if 'Go' in stack:
            ignore_content += "vendor/\n"
        
        with open(cursorignore_path, 'w') as f:
            f.write(ignore_content)
        print("Created .cursorignore")

    # Greenfield specific scaffolding
    if is_greenfield:
        # 2. Basic Configs
        gitignore_path = os.path.join(root_dir, '.gitignore')
        if not os.path.exists(gitignore_path):
            with open(gitignore_path, 'w') as f:
                f.write("node_modules/\n.DS_Store\n.env\ndist/\n")
            print("Created .gitignore")
            
        editorconfig_path = os.path.join(root_dir, '.editorconfig')
        if not os.path.exists(editorconfig_path):
            editorconfig_content = """root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
"""
            with open(editorconfig_path, 'w') as f:
                f.write(editorconfig_content)
            print("Created .editorconfig")

        # 3. Init Task Runner (Basic Deno or NPM)
        if 'Deno' in stack and not os.path.exists(os.path.join(root_dir, 'deno.json')):
            deno_config = {
                "tasks": {
                    "start": "echo 'Not implemented'",
                    "check": "deno lint && deno fmt --check",
                    "test": "deno test"
                }
            }
            with open(os.path.join(root_dir, 'deno.json'), 'w') as f:
                json.dump(deno_config, f, indent=2)
            print("Created deno.json")
            
        elif 'Node.js' in stack and not os.path.exists(os.path.join(root_dir, 'package.json')):
             # Minimal package.json
             pkg_config = {
                 "name": project_name.lower().replace(" ", "-"),
                 "version": "0.1.0",
                 "scripts": {
                     "start": "echo 'Not implemented'",
                     "test": "echo 'Error: no test specified' && exit 1"
                 }
             }
             with open(os.path.join(root_dir, 'package.json'), 'w') as f:
                 json.dump(pkg_config, f, indent=2)
             print("Created package.json")

    print(f"Generated AGENTS.md at {output_path}")
    print(f"Copied rules: {', '.join(copied_rules)}")

if __name__ == "__main__":
    # Args: project_info.json interview_data.json template.md output.md rules_src rules_dest
    if len(sys.argv) < 7:
        print("Usage: generate_agents.py <project_info> <interview_data> <template> <output> <rules_src> <rules_dest>")
        sys.exit(1)
        
    generate_agents(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
