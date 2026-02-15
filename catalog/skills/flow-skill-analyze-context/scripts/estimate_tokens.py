import sys
import os
import json
import hashlib

def estimate_tokens(text):
    """
    Estimate tokens based on character type.
    ASCII (English/Code) ~= 0.25 tokens/char (4 chars/token)
    Non-ASCII (Russian/Other) ~= 0.6 tokens/char (1.6 chars/token)
    """
    ascii_count = 0
    non_ascii_count = 0
    
    for char in text:
        if ord(char) < 128:
            ascii_count += 1
        else:
            non_ascii_count += 1
            
    # Heuristic weights
    tokens = (ascii_count * 0.25) + (non_ascii_count * 0.6)
    return int(tokens)

def get_file_hash(content):
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def analyze_files(file_paths):
    results = {
        "total_tokens": 0,
        "files": [],
        "duplicates": [],
        "by_extension": {}
    }
    
    seen_hashes = {}
    
    for path in file_paths:
        path = path.strip()
        if not path or not os.path.exists(path):
            continue
            
        if os.path.isdir(path):
            # Skip directories if passed directly, or walk them? 
            # For context analysis, we usually care about specific files.
            # But let's support shallow walk if needed.
            continue

        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            tokens = estimate_tokens(content)
            file_hash = get_file_hash(content)
            ext = os.path.splitext(path)[1] or "no_ext"
            
            file_info = {
                "path": path,
                "tokens": tokens,
                "size_bytes": len(content.encode('utf-8'))
            }
            
            results["files"].append(file_info)
            results["total_tokens"] += tokens
            
            # Extension stats
            if ext not in results["by_extension"]:
                results["by_extension"][ext] = 0
            results["by_extension"][ext] += tokens
            
            # Duplicate detection
            if file_hash in seen_hashes:
                original = seen_hashes[file_hash]
                results["duplicates"].append({
                    "original": original,
                    "duplicate": path,
                    "tokens": tokens
                })
            else:
                seen_hashes[file_hash] = path
                
        except Exception as e:
            # Ignore read errors (binary files etc)
            continue

    # Sort files by tokens descending
    results["files"].sort(key=lambda x: x["tokens"], reverse=True)
    
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No files provided"}))
        sys.exit(1)
        
    files = sys.argv[1:]
    analysis = analyze_files(files)
    print(json.dumps(analysis, indent=2))
