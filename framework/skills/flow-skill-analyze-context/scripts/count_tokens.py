import sys

def count_tokens(text):
    """
    Estimate tokens based on character count using a multiplier.
    Multiplier: 0.3 (approx 3.3 chars per token)
    """
    char_count = len(text)
    # Heuristic: 1 token ~= 3.3 chars (0.3 multiplier)
    token_count = int(char_count * 0.3)
    return char_count, token_count

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
    else:
        # Read from stdin if no args
        try:
            text = sys.stdin.read()
        except Exception:
            text = ""
            
    char_count, token_count = count_tokens(text)
    
    print(f"Characters: {char_count}")
    print(f"Estimated Tokens: {token_count} (Multiplier: 0.3)")
