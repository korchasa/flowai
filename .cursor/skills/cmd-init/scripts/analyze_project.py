import os
import json
import sys

def analyze_project(root_dir):
    files = []
    file_tree = []
    readme_content = ""
    
    for r, d, f in os.walk(root_dir):
        if '.git' in r or 'node_modules' in r or '.cursor' in r or 'dist' in r or 'build' in r:
            continue
        
        # Build file tree for context
        rel_dir = os.path.relpath(r, root_dir)
        if rel_dir == ".":
            rel_dir = ""
        
        for file in f:
            full_path = os.path.join(r, file)
            files.append(full_path)
            
            if rel_dir:
                file_tree.append(os.path.join(rel_dir, file))
            else:
                file_tree.append(file)
                
            # Capture README content
            if file.lower() == 'readme.md' and not readme_content:
                try:
                    with open(full_path, 'r', encoding='utf-8') as rf:
                        readme_content = rf.read()
                except:
                    pass

    is_new = False
    
    stack = []
    if os.path.exists(os.path.join(root_dir, 'package.json')):
        stack.append('Node.js')
    if os.path.exists(os.path.join(root_dir, 'deno.json')):
        stack.append('Deno')
    if os.path.exists(os.path.join(root_dir, 'go.mod')):
        stack.append('Go')
    if os.path.exists(os.path.join(root_dir, 'Cargo.toml')):
        stack.append('Rust')
    if os.path.exists(os.path.join(root_dir, 'requirements.txt')) or os.path.exists(os.path.join(root_dir, 'pyproject.toml')):
        stack.append('Python')
    if os.path.exists(os.path.join(root_dir, 'Package.swift')):
        stack.append('Swift')

    # If no stack detected and few files, it's definitely new/empty
    if not stack and len(files) < 5:
        is_new = True
    
    return {
        "is_new": is_new,
        "stack": stack,
        "files_count": len(files),
        "root_dir": root_dir,
        "readme_content": readme_content,
        "file_tree": file_tree[:200] # Limit tree size to avoid huge JSON
    }

if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    result = analyze_project(root)
    print(json.dumps(result, indent=2))
