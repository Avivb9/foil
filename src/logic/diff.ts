export type DiffOp = { type: 'same' | 'add' | 'del'; text: string };

function tokenize(s: string): string[] {
  // keep whitespace as its own token so the diff can be re-joined exactly
  return s.match(/\[[^\]]*\]|\s+|[^\s]+/g) ?? [];
}

/** Word-level LCS diff between two statements. */
export function diffWords(before: string, after: string): DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  const push = (type: DiffOp['type'], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += text;
    else ops.push({ type, text });
  };
  while (i < n && j < m) {
    if (norm(a[i]) === norm(b[j])) {
      push('same', b[j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('del', a[i++]);
    } else {
      push('add', b[j++]);
    }
  }
  while (i < n) push('del', a[i++]);
  while (j < m) push('add', b[j++]);
  // whitespace-only add/del runs read better as "same"
  return ops.map((o) => (o.type !== 'same' && !o.text.trim() ? { type: 'same', text: ' ' } : o));
}

const norm = (t: string) => (/^\s+$/.test(t) ? ' ' : t.toLowerCase());

export function diffStats(ops: DiffOp[]) {
  const count = (t: DiffOp['type']) =>
    ops.filter((o) => o.type === t).reduce((s, o) => s + (o.text.trim() ? o.text.trim().split(/\s+/).length : 0), 0);
  return { removed: count('del'), added: count('add') };
}
