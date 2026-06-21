"""Iterative, loop-based spintax resolver — safe for arbitrarily deep nesting.

Syntax:
    {option_a|option_b|option_c}

Supports arbitrary nesting depth without recursion:
    {Get |{Buy |Receive }}{fuel |coupons }
    Hello {dear {friend|colleague}|{good |}sir}! {How are you?|Hope you're well!}

Why iterative (not recursive)?
    Python's default recursion limit is 1 000.  A spintax template that nests
    100+ levels — common in bulk-messaging toolkits — will crash a recursive
    resolver with RecursionError.  This implementation uses an explicit stack
    (character-level scanning) and a separate innermost-group collapse loop,
    neither of which touches the call stack for nesting depth.

Public API (backward-compatible)
----------------------------------
resolve(text, seed)          -> str     — pick random variant
count_variants(text)         -> int     — product of all group sizes
preview_all(text, limit)     -> list[str]
has_spintax(text)            -> bool
validate(text)               -> (bool, str)
"""
from __future__ import annotations

import random
from typing import Callable


# ─────────────────────────────────────────────────────────────────────────────
# Core resolver — character-level iterative parser
# ─────────────────────────────────────────────────────────────────────────────

def resolve(text: str, seed: int | None = None) -> str:
    """Resolve all spintax groups in *text* by randomly picking one option each.

    Algorithm
    ---------
    The function works in two nested loops — no recursion is ever used:

    Outer loop: repeat until no '{' remains in the string.
    Inner loop (stack scan): walk the string character by character, pushing '{'
        positions onto an explicit stack.  The moment a '}' is found the most
        recently pushed '{' is popped, giving us the innermost unresolved group.
        That group is resolved (one option chosen at random), the substring is
        replaced, and we restart the inner scan from the beginning so that the
        newly revealed parent groups are processed in the correct inside-out order.

    Depth safety
    ------------
    Because each iteration of the outer loop is guaranteed to remove at least one
    '{...}' pair, the outer loop terminates in at most len(text) iterations even
    for pathological inputs.  The inner scan is O(n) per pass where n is the
    current string length.  Total complexity is O(n²) worst-case — acceptable for
    the message sizes this module handles (< 10 KB).

    Args:
        text:  Input string potentially containing spintax groups.
        seed:  Optional integer seed for reproducible output (useful for tests).
    """
    if "{" not in text:
        return text

    rng: random.Random | type[random.Random]
    if seed is not None:
        rng = random.Random(seed)
    else:
        rng = random  # type: ignore[assignment]

    chooser: Callable[[list[str]], str] = lambda opts: rng.choice(opts)

    max_passes = len(text) + 1  # safety ceiling — each pass eliminates ≥1 group
    for _ in range(max_passes):
        if "{" not in text:
            break

        # Inner scan: find the innermost {…} group using an explicit stack
        stack: list[int] = []   # positions of unmatched '{'
        resolved_this_pass = False

        i = 0
        while i < len(text):
            ch = text[i]

            if ch == "{":
                stack.append(i)

            elif ch == "}" and stack:
                open_pos = stack.pop()
                # text[open_pos+1 : i] is the innermost unresolved group body
                body    = text[open_pos + 1 : i]
                options = body.split("|")
                chosen  = chooser(options)
                # Replace the group (including braces) with the chosen option
                text    = text[:open_pos] + chosen + text[i + 1 :]
                # Restart the inner scan from the beginning of the replacement
                # so any braces that were inside 'chosen' are picked up correctly.
                resolved_this_pass = True
                break  # restart inner while-loop (outer for-loop continues)

            i += 1

        if not resolved_this_pass:
            # No matched pair found despite '{' being present → malformed input.
            # Return the partially resolved string rather than looping forever.
            break

    return text


# ─────────────────────────────────────────────────────────────────────────────
# Variant counting
# ─────────────────────────────────────────────────────────────────────────────

def count_variants(text: str) -> int:
    """Count the total number of distinct output variants (product of group sizes).

    Uses the same iterative stack scan as resolve() so it is also recursion-safe.
    The count is calculated on the *original* template (not resolved copies) so
    nested groups are accounted for correctly via multiplication.

    Example:
        count_variants("{a|b} {c|d|e}")  → 2 * 3 = 6
        count_variants("{a|{b|c}}")      → 2 (outer) * 2 (inner) = 4
        count_variants("plain text")     → 1
    """
    total  = 1
    stack: list[int] = []

    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "{":
            stack.append(i)
        elif ch == "}" and stack:
            open_pos = stack.pop()
            body  = text[open_pos + 1 : i]
            total *= len(body.split("|"))
        i += 1

    return total


# ─────────────────────────────────────────────────────────────────────────────
# Preview helpers
# ─────────────────────────────────────────────────────────────────────────────

def preview_all(text: str, limit: int = 8) -> list[str]:
    """Generate up to *limit* distinct random variants for UI preview.

    Tries up to limit × 10 resolutions to collect distinct results, then stops
    regardless so callers are never blocked on degenerate templates.
    """
    seen:   set[str]  = set()
    result: list[str] = []
    max_tries = limit * 10

    for _ in range(max_tries):
        if len(result) >= limit:
            break
        v = resolve(text)
        if v not in seen:
            seen.add(v)
            result.append(v)

    return result


def has_spintax(text: str) -> bool:
    """Return True if *text* contains at least one spintax group."""
    # Quick scan: look for '{' followed eventually by '|' before '}'
    depth = 0
    for ch in text:
        if ch == "{":
            depth += 1
        elif ch == "}" and depth > 0:
            depth -= 1
        elif ch == "|" and depth > 0:
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Validator
# ─────────────────────────────────────────────────────────────────────────────

def validate(text: str) -> tuple[bool, str]:
    """Validate spintax syntax — check for balanced braces and non-empty groups.

    Returns:
        (True, "")           if the template is well-formed.
        (False, <reason>)    describing the first problem found.

    Checks performed (all O(n), no recursion):
        1. Every '{' has a matching '}'.
        2. Every '}' has a matching '{'.
        3. Every group body contains at least one '|' (otherwise it is a no-op
           rather than a spintax group and is likely a typo).
        4. No group option is empty (e.g. "{a||b}" or "{|a}").
    """
    stack:    list[int] = []   # positions of open braces
    warnings: list[str] = []

    i = 0
    while i < len(text):
        ch = text[i]

        if ch == "{":
            stack.append(i)

        elif ch == "}":
            if not stack:
                return False, f"Unexpected '}}' at position {i} — no matching '{{'."
            open_pos = stack.pop()
            body     = text[open_pos + 1 : i]

            if "|" not in body:
                warnings.append(
                    f"Group at position {open_pos} has no '|' separator: {{{body!r}}}"
                )
            else:
                for part in body.split("|"):
                    if part == "":
                        warnings.append(
                            f"Empty option in group at position {open_pos}: {{{body!r}}}"
                        )
                        break

        i += 1

    if stack:
        positions = ", ".join(str(p) for p in stack)
        return False, f"Unclosed '{{' at position(s): {positions}."

    if warnings:
        return False, "; ".join(warnings)

    return True, ""
