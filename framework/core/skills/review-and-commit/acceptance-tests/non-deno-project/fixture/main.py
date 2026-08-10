"""Simple text statistics utility."""


def word_count(text: str) -> int:
    """Return the number of whitespace-separated words in text."""
    if not text:
        return 0
    return len(text.split())


def char_count(text: str, include_whitespace: bool = True) -> int:
    """Return the number of characters in text."""
    if include_whitespace:
        return len(text)
    return len(text.replace(" ", "").replace("\t", "").replace("\n", ""))


if __name__ == "__main__":
    sample = "hello world"
    print(f"words: {word_count(sample)}")
    print(f"chars: {char_count(sample)}")
