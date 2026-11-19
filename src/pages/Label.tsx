import { useCallback, useEffect, useMemo, useState } from 'react';

type Label = 'met' | 'not_met' | 'unclear';
interface Item {
  id: string;
  vendor: string;
  reqId: string;
  reqText: string;
  passages: { url: string; text: string }[];
}

const OPTIONS: { key: string; value: Label; label: string; hint: string; cls: string }[] = [
  { key: '1', value: 'met', label: 'Met', hint: 'An excerpt clearly shows they offer it', cls: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
  { key: '2', value: 'not_met', label: 'Not met', hint: 'An excerpt clearly shows they don’t', cls: 'border-rose-500 bg-rose-50 text-rose-900' },
  { key: '3', value: 'unclear', label: 'Unclear', hint: 'The excerpts don’t settle it', cls: 'border-amber-500 bg-amber-50 text-amber-900' },
];

// stable shuffle so vendors and requirements are interleaved, same order on every visit
function seededOrder<T extends { id: string }>(xs: T[]): T[] {
  const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return [...xs].sort((a, b) => h(a.id) - h(b.id));
}

export default function LabelPage() {
  const review = new URLSearchParams(window.location.search).has('review');
  const [items, setItems] = useState<Item[]>([]);
  const [labels, setLabels] = useState<Record<string, { label: Label; note: string | null }>>({});
  const [reference, setReference] = useState<Record<string, { label: Label; note: string | null }>>({});
  const [i, setI] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dev/evalset')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        const ordered = seededOrder(d.items as Item[]);
        setItems(ordered);
        setLabels(d.labels ?? {});
        setReference(review ? d.reference ?? {} : {});
        const firstOpen = ordered.findIndex((it) => !d.labels?.[it.id]);
        setI(firstOpen === -1 ? 0 : firstOpen);
      })
      .catch((e) => setError(`Could not load items (${e.message}).`));
  }, []);

  const item = items[i];
  const done = useMemo(() => items.filter((it) => labels[it.id]).length, [items, labels]);

  useEffect(() => {
    setNote(item ? labels[item.id]?.note ?? '' : '');
  }, [item, labels]);

  const save = useCallback(
    async (value: Label) => {
      if (!item || saving) return;
      setSaving(true);
      setError(null);
      try {
        const r = await fetch('/api/dev/labels', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ itemId: item.id, label: value, note: note.trim() || undefined }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setLabels((l) => ({ ...l, [item.id]: { label: value, note: note.trim() || null } }));
        setI((x) => Math.min(x + 1, items.length - 1));
      } catch (e) {
        setError(`Not saved (${(e as Error).message}). Try again.`);
      } finally {
        setSaving(false);
      }
    },
    [item, items.length, note, saving],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const opt = OPTIONS.find((o) => o.key === e.key);
      if (opt) save(opt.value);
      if ((e.key === 'a' || e.key === 'Enter') && item && reference[item.id]) save(reference[item.id].label);
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
      if (e.key === 'ArrowRight') setI((x) => Math.min(items.length - 1, x + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, items.length, item, reference]);

  if (error && !items.length) return <div className="p-10 text-rose-700">{error}</div>;
  if (!item) return <div className="p-10 text-neutral-500">Loading…</div>;

  const current = labels[item.id]?.label;
  const allDone = done === items.length;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <header className="mb-6">
          <div className="flex items-baseline justify-between">
            <h1 className="font-display text-2xl">Foil · {review ? 'review the answer key' : 'answer key'}</h1>
            <span className="font-mono text-sm text-neutral-500">
              {done}/{items.length} labelled
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded bg-neutral-200">
            <div className="h-1.5 rounded bg-ember-500 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            {review ? <>Each card has a suggested answer. If you agree, press <kbd>A</kbd> (or Enter). If not, pick the right one: </> : <>For each card, pick: </>}
            <kbd>1</kbd> met · <kbd>2</kbd> not met · <kbd>3</kbd> unclear. Judge <b>only from the excerpts</b>, not from what you know about the product.
          </p>
          {allDone && (
            <p className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
              All {items.length} labelled. You can close this tab, or go back and change any answer.
            </p>
          )}
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-1 font-mono text-xs uppercase tracking-wide text-neutral-500">
            Item {i + 1} of {items.length} · {item.vendor}
          </div>
          <h2 className="font-display text-xl leading-snug">{item.reqText}</h2>

          <div className="mt-5 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {item.passages.length === 0 && <p className="text-sm italic text-neutral-500">No excerpts were found for this requirement.</p>}
            {item.passages.map((p, k) => (
              <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <a href={p.url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-neutral-500 hover:underline">
                  {p.url}
                </a>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>

          {reference[item.id] && (
            <div className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-neutral-300 bg-neutral-100 p-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">Suggested answer</div>
                <div className="mt-0.5 font-medium">{OPTIONS.find((o) => o.value === reference[item.id].label)?.label}</div>
                {reference[item.id].note && <div className="mt-1 text-sm text-neutral-600">{reference[item.id].note}</div>}
              </div>
              <button
                onClick={() => save(reference[item.id].label)}
                disabled={saving}
                className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                <kbd className="mr-1.5 rounded bg-white/20 px-1 font-mono text-xs">A</kbd>Agree
              </button>
            </div>
          )}
          {review && <div className="mt-3 text-xs text-neutral-500">Or choose a different answer:</div>}
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => save(o.value)}
                disabled={saving}
                className={`rounded-lg border-2 px-4 py-3 text-left transition ${current === o.value ? o.cls : 'border-neutral-200 hover:border-neutral-400'}`}
              >
                <div className="font-medium">
                  <kbd className="mr-2 rounded bg-neutral-100 px-1.5 font-mono text-xs">{o.key}</kbd>
                  {o.label}
                </div>
                <div className="mt-0.5 text-xs text-neutral-500">{o.hint}</div>
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (why, or what a real buyer would ask)"
            className="mt-4 w-full rounded-lg border border-neutral-200 p-2 text-sm"
            rows={2}
          />
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

          <div className="mt-4 flex justify-between text-sm">
            <button onClick={() => setI((x) => Math.max(0, x - 1))} className="text-neutral-500 hover:text-neutral-900">
              ← Back
            </button>
            <button onClick={() => setI((x) => Math.min(items.length - 1, x + 1))} className="text-neutral-500 hover:text-neutral-900">
              Skip →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
