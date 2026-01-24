import sys
import subprocess
import os
import shutil
import tempfile
import argparse

def validate_mermaid(file_path):
    """
    Validates a Mermaid file using the official mermaid-cli (mmdc) via npx.
    """
    # Check for npx
    npx_path = shutil.which('npx')
    if not npx_path:
        print("Error: 'npx' is not found. Please install Node.js and npm to validate Mermaid diagrams.")
        return False

    # Create a temporary output file
    # mmdc requires an output file extension to determine the format (e.g. .svg)
    with tempfile.NamedTemporaryFile(suffix='.svg', delete=False) as temp_out:
        temp_out_path = temp_out.name

    try:
        # Construct the command
        # -p @mermaid-js/mermaid-cli: Use the mermaid-cli package
        # mmdc: The command to run
        # -i file_path: Input file
        # -o temp_out_path: Output file
        cmd = [npx_path, '-y', '-p', '@mermaid-js/mermaid-cli', 'mmdc', '-i', file_path, '-o', temp_out_path]
        
        # Run the command
        # We capture stdout/stderr to show validation errors
        print(f"Validating {file_path}...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Syntax is valid.")
            return True
        else:
            print(f"❌ Syntax Error in {file_path}:")
            # Filter out npm noise if possible, but showing stderr is usually best
            print(result.stderr)
            return False

    except Exception as e:
        print(f"Error running validation: {e}")
        return False
    finally:
        # Cleanup temp file
        if os.path.exists(temp_out_path):
            try:
                os.remove(temp_out_path)
            except:
                pass

def main():
    parser = argparse.ArgumentParser(description='Validate Mermaid diagram syntax.')
    parser.add_argument('file', help='Path to the mermaid file (.mmd, .md)')
    args = parser.parse_args()
    
    file_path = args.file
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
        
    success = validate_mermaid(file_path)
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
