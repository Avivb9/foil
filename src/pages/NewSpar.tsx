import { motion } from 'framer-motion';
import { ArrowRight, Copy, FileEdit, FlaskConical } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Field, Segmented, cx } from '../components/ui';
import { EMPTY_FIELDS, EXAMPLES } from '../data/examples';
import type { PressureMode } from '../logic/types';
import { useApp } from '../store/app';
import { toast } from '../store/ui';

const SEGMENTS = ['Security operations', 'Finance operations', 'Data infrastructure', 'Revenue enablement', 'Logistics', 'HR and people', 'Developer tools', 'Other'];

type Start = 'blank' | 'example' | 'copy';

export default function NewSpar() {
  const nav = useNavigate();
  const createSpar = useApp((s) => s.createSpar);
  const spars = useApp((s) => s.spars);
  const defaultMode = useApp((s) => s.defaultMode);
  const [company, setCompany] = useState('');
  const [product, setProduct] = useState('');
  const [segment, setSegment] = useState(SEGMENTS[0]);
  const [start, setStart] = useState<Start>('blank');
  const [exampleId, setExampleId] = useState('weak');
  const [copyId, setCopyId] = useState(spars[0]?.id ?? '');
  const [mode, setMode] = useState<PressureMode>(defaultMode);
  const [errors, setErrors] = useState<{ company?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = company.trim() || (start === 'example' ? 'Kestrel' : '');
    if (!name) return setErrors({ company: 'Name the company or product you’re positioning' });
    if (name.length > 40) return setErrors({ company: 'Keep the name under 40 characters' });
    setSubmitting(true);
    const fields =
      start === 'example' ? { ...EXAMPLES.find((x) => x.id === exampleId)!.fields } : start === 'copy' ? { ...(spars.find((s) => s.id === copyId)?.draft ?? EMPTY_FIELDS) } : { ...EMPTY_FIELDS };
    window.setTimeout(() => {
      const id = createSpar({ company: name, product: product || name, segment, fields, mode });
      toast({ tone: 'success', title: `${name} spar created`, body: start === 'blank' ? 'Fill in the five components, then start the spar.' : 'Press Start spar when you’re ready.' });
      nav(`/spars/${id}`);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-8">
      <h1 className="display text-[34px] font-semibold">New spar</h1>
      <p className="mt-1 text-sm text-sand-600">Set up the positioning you want the panel to attack. You can change everything later.</p>

      <form onSubmit={submit} className="card mt-6 space-y-6 p-6" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company or product" error={errors.company} htmlFor="ns-company" hint="Used in the statement: “[Company] is a …”">
            <input
              id="ns-company"
              autoFocus
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setErrors({});
              }}
              placeholder="e.g. Kestrel"
              className={cx('input', errors.company && 'input-error')}
            />
          </Field>
          <Field label="Product line" htmlFor="ns-product" hint="Optional">
            <input id="ns-product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Kestrel Triage" className="input" />
          </Field>
          <Field label="Segment" htmlFor="ns-seg">
            <select id="ns-seg" value={segment} onChange={(e) => setSegment(e.target.value)} className="input">
              {SEGMENTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Pressure mode" hint="How hard the panel pushes. Tough is a real buying committee.">
            <div>
              <Segmented
                layoutId="ns-mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'friendly', label: 'Friendly' },
                  { value: 'tough', label: 'Tough' },
                  { value: 'brutal', label: 'Brutal' },
                ]}
              />
            </div>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-sand-800">Starting point</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Choice active={start === 'blank'} onClick={() => setStart('blank')} icon={<FileEdit className="h-4 w-4" />} title="Blank" body="Write the five components from scratch." />
            <Choice active={start === 'example'} onClick={() => setStart('example')} icon={<FlaskConical className="h-4 w-4" />} title="Example" body="Start from a Kestrel sample." />
            <Choice active={start === 'copy'} onClick={() => setStart('copy')} icon={<Copy className="h-4 w-4" />} title="Copy a spar" body="Reuse another spar’s latest draft." />
          </div>
          {start === 'example' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2">
              {EXAMPLES.map((ex) => (
                <label key={ex.id} className={cx('flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition', exampleId === ex.id ? 'border-ember-300 bg-ember-50/50' : 'border-sand-200 hover:border-sand-300')}>
                  <input type="radio" name="ex" checked={exampleId === ex.id} onChange={() => setExampleId(ex.id)} className="mt-1 accent-ember-500" />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {ex.label} <Badge tone={ex.quality === 'Weak' ? 'red' : ex.quality === 'Okay' ? 'amber' : 'green'}>{ex.quality}</Badge>
                    </span>
                    <span className="text-xs text-sand-500">{ex.description}</span>
                  </span>
                </label>
              ))}
            </motion.div>
          )}
          {start === 'copy' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
              <select value={copyId} onChange={(e) => setCopyId(e.target.value)} className="input" aria-label="Spar to copy">
                {spars.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company} · {s.product}
                  </option>
                ))}
              </select>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-sand-200/80 pt-5">
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting} icon={!submitting && <ArrowRight className="h-4 w-4" />}>
            Create spar
          </Button>
        </div>
      </form>
    </div>
  );
}

function Choice({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx('rounded-xl border p-4 text-left transition', active ? 'border-ember-400 bg-ember-50/60 ring-2 ring-ember-100' : 'border-sand-200 bg-white hover:border-sand-300')}
    >
      <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', active ? 'bg-ember-500 text-white' : 'bg-sand-100 text-sand-600')}>{icon}</span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs text-sand-500">{body}</p>
    </button>
  );
}
