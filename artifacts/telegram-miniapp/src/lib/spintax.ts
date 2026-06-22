/**
 * Client-side spintax resolver for preview in the Mini App.
 * Mirrors the Python utils/spintax.py interface.
 */

const INNERMOST = /\{([^{}]+)\}/g;

export function resolve(text: string): string {
  let result = text;
  for (let i = 0; i < 50; i++) {
    const m = result.match(/\{([^{}]+)\}/);
    if (!m || m.index === undefined) break;
    const options = m[1].split("|");
    const chosen  = options[Math.floor(Math.random() * options.length)];
    result = result.slice(0, m.index) + chosen + result.slice(m.index + m[0].length);
  }
  return result;
}

export function preview_all(text: string, limit = 4): string[] {
  const seen   = new Set<string>();
  const result: string[] = [];
  let tries = 0;
  while (result.length < limit && tries < limit * 12) {
    const v = resolve(text);
    if (!seen.has(v)) {
      seen.add(v);
      result.push(v);
    }
    tries++;
  }
  return result;
}

export function hasSpintax(text: string): boolean {
  return /\{[^{}]+\}/.test(text);
}

export function validate(text: string): { ok: boolean; error?: string } {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth < 0) return { ok: false, error: `Лишняя } на позиции ${i}` };
    }
  }
  if (depth !== 0) return { ok: false, error: `Незакрытых скобок: ${depth}` };
  return { ok: true };
}

export interface SpintaxStats {
  groups: number;    // total number of {…} groups anywhere in the text
  estimated: number; // estimated unique message permutations (may slightly over-count nested groups)
  valid: boolean;    // brackets are balanced
}

/**
 * Counts {…} groups and estimates unique message permutations.
 * Works by iteratively resolving innermost groups and multiplying option counts.
 * Caps at 99 999 for display purposes.
 */
export function spintaxStats(text: string): SpintaxStats {
  const v = validate(text);

  // Count all { occurrences = number of groups
  let groups = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") groups++;
  }

  if (!v.ok || groups === 0) return { groups, estimated: 1, valid: v.ok };

  // Estimate combos: iteratively expand innermost {a|b|c} groups
  let combos = 1;
  let temp = text;
  let iters = 0;
  while (/\{[^{}]*\}/.test(temp) && iters < 30) {
    temp = temp.replace(/\{([^{}]+)\}/g, (_, inner) => {
      combos *= inner.split("|").length;
      return "\x00"; // neutral placeholder
    });
    iters++;
  }

  return { groups, estimated: Math.min(combos, 99_999), valid: true };
}
