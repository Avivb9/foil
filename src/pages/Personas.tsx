import { AnimatePresence, motion } from 'framer-motion';
import { Eye, MoreHorizontal, Pencil, Plus, RotateCcw, ShieldAlert, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PersonaCard } from '../components/spar/panels';
import { Avatar, Badge, Button, Field, IconButton, Menu, Modal, Toggle, cx } from '../components/ui';
import { LENSES, LENS_ORDER } from '../data/personas';
import { generateObjections } from '../logic/objections';
import { COMPONENT_LABELS } from '../logic/scoring';
import type { ComponentKey, Lens, Persona } from '../logic/types';
import { useApp } from '../store/app';
import { toast } from '../store/ui';

/** Which Dunford components each lens puts pressure on. */
const LENS_COVERS: Record<Lens, ComponentKey[]> = {
  budget: ['value'],
  differentiation: ['unique', 'alternatives'],
  technical: ['unique'],
  clarity: ['target', 'category'],
  category: ['category'],
  procurement: ['target', 'value'],
  legal: ['value', 'category'],
};

export default function Personas() {
  const personas = useApp((s) => s.personas);
  const toggle = useApp((s) => s.togglePersona);
  const removePersona = useApp((s) => s.removePersona);
  const resetPersonas = useApp((s) => s.resetPersonas);
  const spars = useApp((s) => s.spars);
  const weights = useApp((s) => s.weights);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Persona | null>(null);
  const [preview, setPreview] = useState<Persona | null>(null);
  const [previewSpar, setPreviewSpar] = useState(spars[0]?.id ?? '');
  const [confirmReset, setConfirmReset] = useState(false);

  const enabled = personas.filter((p) => p.enabled);
  const covered = useMemo(() => new Set(enabled.flatMap((p) => LENS_COVERS[p.lens])), [enabled]);
  const uncovered = (Object.keys(COMPONENT_LABELS) as ComponentKey[]).filter((k) => !covered.has(k));

  const onToggle = (p: Persona) => {
    if (p.enabled && enabled.length === 1) {
      toast({ tone: 'error', title: 'Keep at least one persona on the panel' });
      return;
    }
    toggle(p.id);
    toast({ title: p.enabled ? `${p.name} left the panel` : `${p.name} joined the panel` });
  };

  const sp = spars.find((s) => s.id === previewSpar);
  const previewObjection = preview && sp ? generateObjections(sp.company, sp.draft, sp.mode, [preview], weights)[0] : null;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-20 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[34px] font-semibold leading-tight">Personas</h1>
          <p className="mt-1 max-w-2xl text-sm text-sand-600">
            Your buyer-side panel. Each persona reads your positioning through one lens and attacks the component that lens cares about.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Menu
            align="right"
            width="w-52"
            trigger={({ toggle: t }) => (
              <IconButton label="More" onClick={t} className="border border-sand-200 bg-white shadow-card">
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            )}
            items={[{ label: 'Reset to default panel', icon: <RotateCcw className="h-4 w-4" />, onSelect: () => setConfirmReset(true) }]}
          />
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Add persona
          </Button>
        </div>
      </div>

      <div className="card mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
        <div>
          <p className="label">On the panel</p>
          <p className="display mt-0.5 text-2xl font-semibold">
            {enabled.length}
            <span className="font-sans text-sm font-medium text-sand-400"> of {personas.length}</span>
          </p>
        </div>
        <div className="flex -space-x-2">
          {enabled.map((p) => (
            <Avatar key={p.id} name={p.name} color={p.color} size={32} ring />
          ))}
        </div>
        <div className="min-w-[240px] flex-1">
          <p className="label mb-1.5">Component coverage</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((k) => (
              <Badge key={k} tone={covered.has(k) ? 'green' : 'neutral'} dot>
                {COMPONENT_LABELS[k]}
              </Badge>
            ))}
          </div>
        </div>
        {uncovered.length > 0 && (
          <p className="flex items-center gap-1.5 text-[12.5px] text-amber-800">
            <ShieldAlert className="h-4 w-4" /> Nobody is attacking {uncovered.map((k) => COMPONENT_LABELS[k].toLowerCase()).join(' or ')}.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {personas.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={cx('card flex flex-col p-5 transition', !p.enabled && 'opacity-60')}
            >
              <div className="flex items-start gap-3">
                <Avatar name={p.name} color={p.color} size={44} className={cx(!p.enabled && 'grayscale')} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-sand-900">
                    {p.name}
                    {p.custom && <Badge tone="violet">Custom</Badge>}
                  </p>
                  <p className="truncate text-[13px] text-sand-500">{p.role}</p>
                </div>
                <Toggle checked={p.enabled} onChange={() => onToggle(p)} label={`${p.name} on the panel`} />
              </div>
              <div className="mt-4 rounded-lg bg-sand-50 px-3 py-2.5">
                <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-sand-500">
                  <span>Lens · {LENSES[p.lens].label}</span>
                  <span className="normal-case tracking-normal text-sand-400">attacks {LENSES[p.lens].attacks.toLowerCase()}</span>
                </p>
                <p className="display mt-1 text-[15px] italic leading-snug text-sand-800">“{LENSES[p.lens].question}”</p>
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-sand-600">{p.bio}</p>
              <div className="mt-4 flex items-center gap-1 border-t border-sand-200/80 pt-3">
                <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setPreview(p)}>
                  Preview reaction
                </Button>
                <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(p)}>
                  Edit
                </Button>
                {p.custom && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      removePersona(p.id);
                      toast({ title: `${p.name} removed` });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          <motion.button
            layout
            key="add"
            onClick={() => setAdding(true)}
            className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-sand-300 text-sand-500 transition hover:border-ember-300 hover:bg-ember-50/40 hover:text-ember-700"
          >
            <UserPlus className="h-6 w-6" />
            <span className="mt-2 text-sm font-semibold">Add a persona</span>
            <span className="mt-0.5 max-w-[220px] text-center text-xs">Procurement, Legal, or anyone else who can kill a deal</span>
          </motion.button>
        </AnimatePresence>
      </div>

      <PersonaModal open={adding} onClose={() => setAdding(false)} />
      <PersonaModal open={!!editing} persona={editing ?? undefined} onClose={() => setEditing(null)} />

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        width="max-w-2xl"
        title={preview ? `How ${preview.name.split(' ')[0]} reacts` : ''}
        description="Generated from the current draft of the spar you pick. Nothing is saved."
      >
        <div className="space-y-3 pb-3">
          <select value={previewSpar} onChange={(e) => setPreviewSpar(e.target.value)} className="input" aria-label="Spar to preview against">
            {spars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company} · {s.product}
              </option>
            ))}
          </select>
          {preview && previewObjection && <PersonaCard key={`${preview.id}-${previewSpar}`} persona={preview} objection={previewObjection} stream />}
        </div>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset to the default panel?"
        description="Removes custom personas and turns the five default personas back on."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              data-autofocus
              onClick={() => {
                resetPersonas();
                setConfirmReset(false);
                toast({ tone: 'success', title: 'Panel reset to the default five' });
              }}
            >
              Reset panel
            </Button>
          </>
        }
      />
    </div>
  );
}

function PersonaModal({ open, onClose, persona }: { open: boolean; onClose: () => void; persona?: Persona }) {
  const addPersona = useApp((s) => s.addPersona);
  const updatePersona = useApp((s) => s.updatePersona);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [lens, setLens] = useState<Lens>('procurement');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<{ name?: string; role?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName(persona?.name ?? '');
    setRole(persona?.role ?? '');
    setLens(persona?.lens ?? 'procurement');
    setBio(persona?.bio ?? '');
    setErrors({});
  }, [open, persona]);

  const submit = () => {
    const e: typeof errors = {};
    if (name.trim().split(/\s+/).length < 2) e.name = 'Use a first and last name so the panel feels real';
    if (role.trim().length < 3) e.role = 'Describe their role, e.g. “Head of Procurement at a bank”';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (persona) {
      updatePersona(persona.id, { name: name.trim(), role: role.trim(), lens, bio: bio.trim() || persona.bio });
      toast({ tone: 'success', title: `${name.trim()} updated` });
    } else {
      const p = addPersona({ name, role, lens, bio });
      toast({ tone: 'success', title: `${p.name} joined the panel`, body: `They’ll attack through the ${LENSES[lens].label} lens on your next spar.` });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={persona ? `Edit ${persona.name}` : 'Add persona'}
      description={persona ? undefined : 'Pick a lens. The lens decides which component they attack and which objection templates they use.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {persona ? 'Save changes' : 'Add to panel'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} htmlFor="pm-name">
            <input id="pm-name" className={cx('input', errors.name && 'input-error')} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rachel Kim" />
          </Field>
          <Field label="Role" error={errors.role} htmlFor="pm-role">
            <input id="pm-role" className={cx('input', errors.role && 'input-error')} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Head of Procurement" />
          </Field>
        </div>
        <Field label="Lens" htmlFor="pm-lens" hint={`Attacks ${LENSES[lens].attacks.toLowerCase()}: “${LENSES[lens].question}”`}>
          <select id="pm-lens" className="input" value={lens} onChange={(e) => setLens(e.target.value as Lens)}>
            {LENS_ORDER.map((l) => (
              <option key={l} value={l}>
                {LENSES[l].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What they care about" htmlFor="pm-bio" hint="Optional. Shown on their card.">
          <textarea id="pm-bio" rows={2} className="input resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Won’t sign anything without a security review and a price range." />
        </Field>
      </div>
    </Modal>
  );
}
