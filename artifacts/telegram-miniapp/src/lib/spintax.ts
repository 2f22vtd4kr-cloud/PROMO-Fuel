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
