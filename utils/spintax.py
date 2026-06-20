"""Robust iterative nested spintax resolver.

Syntax:
  {option1|option2|option3}

Supports arbitrary nesting:
  Hello {dear {friend|colleague}|hi there}! {How are you?|Hope you're well!}

Usage:
  from utils.spintax import resolve, count_variants, preview_all
  text = resolve("{Hello|Hi|Hey} {world|there}!")
"""
import random
import re


_INNERMOST = re.compile(r'\{([^{}]+)\}')


def resolve(text: str, seed: int | None = None) -> str:
    """Resolve all spintax patterns in text by picking a random option from each.

    Handles nested patterns iteratively (inside-out), up to 50 passes.
    """
    if seed is not None:
        rng = random.Random(seed)
    else:
        rng = random

    for _ in range(50):
        m = _INNERMOST.search(text)
        if not m:
            break
        options = m.group(1).split("|")
        chosen  = rng.choice(options)
        text    = text[: m.start()] + chosen + text[m.end() :]
    return text


def count_variants(text: str) -> int:
    """Count total number of distinct variants (product of all group sizes)."""
    result = 1
    for m in _INNERMOST.finditer(text):
        result *= len(m.group(1).split("|"))
    return result


def preview_all(text: str, limit: int = 8) -> list[str]:
    """Generate up to `limit` distinct random variants for preview."""
    seen   = set()
    result = []
    tries  = 0
    max_tries = limit * 10
    while len(result) < limit and tries < max_tries:
        v = resolve(text)
        if v not in seen:
            seen.add(v)
            result.append(v)
        tries += 1
    return result


def has_spintax(text: str) -> bool:
    """Return True if text contains any spintax expression."""
    return bool(_INNERMOST.search(text))


def validate(text: str) -> tuple[bool, str]:
    """Validate spintax syntax.

    Returns (is_valid, error_message).
    """
    depth = 0
    for i, ch in enumerate(text):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth < 0:
                return False, f"Unexpected '}}' at position {i}"
    if depth != 0:
        return False, f"Unclosed '{{' — {depth} unclosed brace(s)"
    return True, ""
