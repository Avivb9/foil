import { motion } from 'framer-motion';
import { Check, CreditCard, Hash, Mail, MoreHorizontal, RotateCcw, Send, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ScorePill } from '../components/spar/bits';
import { Avatar, Badge, Button, Field, IconButton, Menu, Modal, Segmented, Toggle, cx } from '../components/ui';
import { BUZZWORDS } from '../data/lexicon';
import { INVOICES, type Member } from '../data/seed';
import { relativeTime } from '../logic/format';
import { COMPONENT_KEYS, COMPONENT_LABELS, DEFAULT_WEIGHTS, scoreSnapshot } from '../logic/scoring';
import type { PressureMode, Weights } from '../logic/types';
import { useApp, type NotificationPrefs } from '../store/app';
import { toast } from '../store/ui';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing', label: 'Billing' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Settings() {
  const { tab } = useParams();
  const nav = useNavigate();
  if (!TABS.some((t) => t.id === tab)) return <Navigate to="/settings/profile" replace />;
  const active = tab as TabId;
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 sm:px-8">
      <h1 className="display text-[34px] font-semibold leading-tight">Settings</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => nav(`/settings/${t.id}`)}
              className={cx(
                'relative whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition',
                active === t.id ? 'bg-white text-sand-900 shadow-card ring-1 ring-sand-200' : 'text-sand-600 hover:bg-sand-200/50 hover:text-sand-900',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="min-w-0 space-y-6">
          {active === 'profile' && <ProfileTab />}
          {active === 'workspace' && <WorkspaceTab />}
          {active === 'scoring' && <ScoringTab />}
          {active === 'notifications' && <NotificationsTab />}
          {active === 'billing' && <BillingTab />}
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="card">
      <div className="px-6 pb-5 pt-5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-sand-500">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
      {footer && <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-sand-200/80 bg-sand-50/60 px-6 py-3">{footer}</div>}
    </section>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const dirty = JSON.stringify(form) !== JSON.stringify(profile);

  const save = () => {
    const e: typeof errors = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    setErrors(e);
    if (Object.keys(e).length) return;
    setProfile({ ...form, name: form.name.trim(), email: form.email.trim() });
    toast({ tone: 'success', title: 'Profile saved' });
  };

  return (
    <Section
      title="Profile"
      description="How you appear on spars, reports and in the activity feed."
      footer={
        <>
          <Button variant="ghost" disabled={!dirty} onClick={() => setForm(profile)}>
            Discard
          </Button>
          <Button variant="primary" disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={form.name || 'A B'} size={56} color="#c2410c" />
        <div>
          <p className="font-semibold">{form.name || 'Your name'}</p>
          <p className="text-sm text-sand-500">
            {form.title} · Admin in Northbeam
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name} htmlFor="pf-name">
          <input id="pf-name" className={cx('input', errors.name && 'input-error')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Title" htmlFor="pf-title">
          <input id="pf-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Work email" error={errors.email} htmlFor="pf-email">
          <input id="pf-email" type="email" className={cx('input', errors.email && 'input-error')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Time zone" htmlFor="pf-tz">
          <select id="pf-tz" className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
            {['Asia/Jerusalem (GMT+3)', 'Europe/London (GMT+1)', 'America/New_York (GMT-4)', 'America/Los_Angeles (GMT-7)', 'Europe/Berlin (GMT+2)'].map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </Field>
      </div>
    </Section>
  );
}

// ─── Workspace ─────────────────────────────────────────────────────────────

function WorkspaceTab() {
  const workspaceName = useApp((s) => s.workspaceName);
  const setWorkspaceName = useApp((s) => s.setWorkspaceName);
  const members = useApp((s) => s.members);
  const updateMember = useApp((s) => s.updateMember);
  const removeMember = useApp((s) => s.removeMember);
  const resetAll = useApp((s) => s.resetAll);
  const profile = useApp((s) => s.profile);
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState(workspaceName);
  const [inviteOpen, setInviteOpen] = useState(params.get('invite') === '1');
  const [resetOpen, setResetOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (params.get('invite') === '1') {
      setInviteOpen(true);
      params.delete('invite');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const roles: Member['role'][] = ['Admin', 'Editor', 'Viewer'];

  return (
    <>
      <Section
        title="Workspace"
        description="Shared by everyone on your team."
        footer={
          <Button
            variant="primary"
            disabled={name.trim() === workspaceName || name.trim().length < 2}
            onClick={() => {
              setWorkspaceName(name.trim());
              toast({ tone: 'success', title: 'Workspace renamed' });
            }}
          >
            Save
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Workspace name" htmlFor="ws-name-set" error={name.trim().length < 2 ? 'Name must be at least 2 characters' : null}>
            <input id="ws-name-set" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Workspace URL" htmlFor="ws-url" hint="Contact support to change it.">
            <input id="ws-url" className="input bg-sand-50 text-sand-500" readOnly value={`foil.app/${workspaceName.toLowerCase().replace(/\s+/g, '-')}`} />
          </Field>
        </div>
      </Section>

      <Section title={`Members · ${members.length}`} description="Editors can run spars and create reports. Viewers can read and comment.">
        <div className="-mx-6 -mt-2 mb-3 flex justify-end px-6">
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
            Invite
          </Button>
        </div>
        <ul className="-mx-6 divide-y divide-sand-200/70 border-t border-sand-200/70">
          {members.map((m) => {
            const isMe = m.email === profile.email || m.name === profile.name;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <Avatar name={m.name} size={34} color={isMe ? '#c2410c' : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {m.name}
                    {isMe && <span className="text-xs text-sand-400">(you)</span>}
                    {m.status === 'Invited' && <Badge tone="amber">Invited</Badge>}
                  </p>
                  <p className="truncate text-xs text-sand-500">
                    {m.email} · {m.title}
                  </p>
                </div>
                <span className="hidden w-24 text-xs text-sand-400 sm:block">{m.status === 'Invited' ? `sent ${relativeTime(m.lastActive)}` : `active ${relativeTime(m.lastActive)}`}</span>
                {m.role === 'Owner' || isMe ? (
                  <span className="w-24 text-right text-[13px] font-medium text-sand-600">{m.role}</span>
                ) : (
                  <Menu
                    align="right"
                    width="w-40"
                    trigger={({ toggle }) => (
                      <button onClick={toggle} className="w-24 rounded-md px-2 py-1 text-right text-[13px] font-medium text-sand-700 hover:bg-sand-100">
                        {m.role} ▾
                      </button>
                    )}
                    items={roles.map((r) => ({
                      label: r,
                      checked: r === m.role,
                      onSelect: () => {
                        updateMember(m.id, { role: r });
                        toast({ title: `${m.name} is now ${r === 'Admin' ? 'an' : 'a'} ${r}` });
                      },
                    }))}
                  />
                )}
                {!isMe && m.role !== 'Owner' ? (
                  <Menu
                    align="right"
                    width="w-44"
                    trigger={({ toggle }) => (
                      <IconButton label={`Options for ${m.name}`} onClick={toggle} className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </IconButton>
                    )}
                    items={[
                      ...(m.status === 'Invited'
                        ? [{ label: 'Resend invite', icon: <Send className="h-4 w-4" />, onSelect: () => toast({ tone: 'success', title: `Invite resent to ${m.email}` }) }]
                        : [{ label: 'Send message', icon: <Mail className="h-4 w-4" />, onSelect: () => (window.location.href = `mailto:${m.email}`) }]),
                      {
                        label: m.status === 'Invited' ? 'Revoke invite' : 'Remove',
                        icon: <Trash2 className="h-4 w-4" />,
                        danger: true,
                        onSelect: () => {
                          removeMember(m.id);
                          toast({ title: m.status === 'Invited' ? `Invite to ${m.email} revoked` : `${m.name} removed from ${workspaceName}` });
                        },
                      },
                    ]}
                  />
                ) : (
                  <span className="w-8" />
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Sample data" description="Restore the seeded spars, personas, reports and settings. Useful before a walkthrough.">
        <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => setResetOpen(true)}>
          Reset workspace data
        </Button>
      </Section>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset workspace data?"
        description="Your spars, versions, reports, personas and weights go back to the original sample set. This can’t be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              data-autofocus
              onClick={() => {
                resetAll();
                setResetOpen(false);
                toast({ tone: 'success', title: 'Workspace restored', body: 'Sample spars and reports are back.' });
                nav('/');
              }}
            >
              Reset data
            </Button>
          </>
        }
      />
    </>
  );
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inviteMember = useApp((s) => s.inviteMember);
  const members = useApp((s) => s.members);
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Member['role']>('Editor');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setEmails('');
      setErr(null);
      setRole('Editor');
    }
  }, [open]);
  const submit = () => {
    const list = emails.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean);
    if (!list.length) return setErr('Add at least one email address');
    const bad = list.find((e) => !EMAIL_RE.test(e));
    if (bad) return setErr(`“${bad}” isn’t a valid email`);
    const dup = list.find((e) => members.some((m) => m.email.toLowerCase() === e.toLowerCase()));
    if (dup) return setErr(`${dup} is already in the workspace`);
    list.forEach((e) => inviteMember(e, role));
    toast({ tone: 'success', title: `${list.length} invite${list.length > 1 ? 's' : ''} sent`, body: `They’ll join as ${role}s.` });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite teammates"
      description="They’ll get an email with a link to join Northbeam."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Send className="h-4 w-4" />} onClick={submit}>
            Send invites
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <Field label="Email addresses" error={err} hint="Separate multiple addresses with commas." htmlFor="inv-emails">
          <textarea
            id="inv-emails"
            rows={2}
            className={cx('input resize-none', err && 'input-error')}
            value={emails}
            onChange={(e) => {
              setEmails(e.target.value);
              setErr(null);
            }}
            placeholder="jordan@northbeam.io, sam@northbeam.io"
          />
        </Field>
        <Field label="Role">
          <div>
            <Segmented
              layoutId="inv-role"
              value={role}
              onChange={setRole}
              options={[
                { value: 'Admin', label: 'Admin' },
                { value: 'Editor', label: 'Editor' },
                { value: 'Viewer', label: 'Viewer' },
              ]}
            />
          </div>
        </Field>
      </div>
    </Modal>
  );
}

// ─── Scoring ───────────────────────────────────────────────────────────────

function ScoringTab() {
  const weights = useApp((s) => s.weights);
  const setWeights = useApp((s) => s.setWeights);
  const defaultMode = useApp((s) => s.defaultMode);
  const setDefaultMode = useApp((s) => s.setDefaultMode);
  const spars = useApp((s) => s.spars);
  const [draft, setDraft] = useState<Weights>(weights);
  const total = COMPONENT_KEYS.reduce((a, k) => a + draft[k], 0);
  const dirty = COMPONENT_KEYS.some((k) => draft[k] !== weights[k]);
  const isDefault = COMPONENT_KEYS.every((k) => draft[k] === DEFAULT_WEIGHTS[k]);

  const preview = useMemo(
    () =>
      spars.slice(0, 6).map((s) => {
        const src = s.lastRun ?? { company: s.company, fields: s.draft, mode: s.mode };
        return { s, now: scoreSnapshot(src, weights).overall, next: scoreSnapshot(src, draft).overall };
      }),
    [spars, weights, draft],
  );

  return (
    <>
      <Section
        title="Component weights"
        description="How much each Dunford component counts toward the overall score. Weights are normalized, so they don’t have to add up to 100."
        footer={
          <>
            <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} disabled={isDefault} onClick={() => setDraft({ ...DEFAULT_WEIGHTS })}>
              Reset to defaults
            </Button>
            <Button
              variant="primary"
              disabled={!dirty || total === 0}
              onClick={() => {
                setWeights(draft);
                toast({ tone: 'success', title: 'Weights saved', body: 'Every spar and report now uses the new weights.' });
              }}
            >
              Save weights
            </Button>
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            {COMPONENT_KEYS.map((k) => (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <label htmlFor={`w-${k}`} className="font-medium text-sand-800">
                    {COMPONENT_LABELS[k]}
                  </label>
                  <span className="tabular-nums text-sand-500">
                    <span className="font-semibold text-sand-900">{draft[k]}</span> · {total ? Math.round((draft[k] / total) * 100) : 0}%
                  </span>
                </div>
                <input
                  id={`w-${k}`}
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
                  className="w-full accent-ember-500"
                />
              </div>
            ))}
            {total === 0 && <p className="text-sm font-medium text-red-600">At least one component needs a weight above zero.</p>}
          </div>
          <div className="rounded-xl bg-sand-50 p-4">
            <p className="label mb-3">Preview: effect on your spars</p>
            <ul className="space-y-2.5">
              {preview.map(({ s, now, next }) => (
                <li key={s.id} className="flex items-center gap-2 text-[13px]">
                  <span className="flex-1 truncate font-medium">{s.company}</span>
                  <span className="tabular-nums text-sand-400">{now}</span>
                  <span className="text-sand-300">→</span>
                  <ScorePill score={next} />
                  <span className={cx('w-8 text-right text-xs font-semibold tabular-nums', next - now > 0 ? 'text-emerald-600' : next - now < 0 ? 'text-red-600' : 'text-sand-400')}>
                    {next - now > 0 ? '+' : ''}
                    {next - now || '±0'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Default pressure mode" description="Used for new spars. You can change it per spar.">
        <Segmented<PressureMode>
          layoutId="def-mode"
          value={defaultMode}
          onChange={(m) => {
            setDefaultMode(m);
            toast({ title: `New spars start in ${m} mode` });
          }}
          options={[
            { value: 'friendly', label: 'Friendly' },
            { value: 'tough', label: 'Tough' },
            { value: 'brutal', label: 'Brutal' },
          ]}
        />
        <p className="mt-3 text-[13px] text-sand-500">Brutal applies penalties at 1.4× and bonuses at 0.9×. Friendly applies penalties at 0.7×.</p>
      </Section>

      <Section title="What the model checks" description="Every point comes from a visible rule. These are the signals behind each score.">
        <ul className="grid gap-3 text-[13px] text-sand-700 sm:grid-cols-2">
          {[
            ['Buzzwords', 'Costs points wherever they appear. Soft ones (platform, solution, scalable) cost half.'],
            ['Numbers and proof', 'Rewards a quantified outcome, a proof source (median, across N customers) and a payback line.'],
            ['Target specificity', 'Looks for a buyer role, company size or stage, an industry and their tech environment.'],
            ['Category clarity', 'Matches against 40+ categories buyers already budget for. Superlatives cost points.'],
            ['Differentiation', 'Rewards a mechanism (“by…”, “using your own…”) and penalizes overlap with the alternatives text.'],
            ['Readability', 'Words per sentence and buzzword density adjust the overall score by −9 to +2.'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-lg border border-sand-200 bg-white p-3">
              <p className="font-semibold text-sand-900">{t}</p>
              <p className="mt-0.5 text-sand-600">{d}</p>
            </li>
          ))}
        </ul>
        <p className="label mb-2 mt-5">Buzzword list</p>
        <div className="flex flex-wrap gap-1.5">
          {BUZZWORDS.map((b) => (
            <span key={b} className="rounded bg-ember-50 px-1.5 py-0.5 text-xs font-medium text-ember-700 ring-1 ring-inset ring-ember-200">
              {b}
            </span>
          ))}
        </div>
      </Section>
    </>
  );
}

// ─── Notifications ─────────────────────────────────────────────────────────

const NOTIF_ROWS: { key: keyof NotificationPrefs; title: string; body: string }[] = [
  { key: 'sparComplete', title: 'Spar finished', body: 'When a spar you started finishes running.' },
  { key: 'dealbreakers', title: 'New deal-breakers', body: 'When a persona flags a deal-breaker on a spar you own.' },
  { key: 'reportShared', title: 'Reports shared with you', body: 'When a teammate shares a report.' },
  { key: 'mentions', title: 'Mentions and comments', body: 'When someone mentions you on a spar or report.' },
  { key: 'weeklyDigest', title: 'Weekly positioning digest', body: 'Monday summary of scores, lifts and open objections.' },
  { key: 'productUpdates', title: 'Product updates', body: 'New personas, lenses and scoring changes.' },
];

function NotificationsTab() {
  const prefs = useApp((s) => s.notificationPrefs);
  const setPrefs = useApp((s) => s.setNotificationPrefs);
  const [slack, setSlack] = useState(false);
  const [connecting, setConnecting] = useState(false);
  return (
    <>
      <Section title="Email and in-app" description="Choose what Foil tells you about.">
        <ul className="-mx-6 divide-y divide-sand-200/70 border-t border-sand-200/70">
          {NOTIF_ROWS.map((r) => (
            <li key={r.key} className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-sand-500">{r.body}</p>
              </div>
              <Toggle
                checked={prefs[r.key]}
                label={r.title}
                onChange={(v) => {
                  setPrefs({ [r.key]: v });
                  toast({ title: `${r.title} ${v ? 'on' : 'off'}` });
                }}
              />
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Slack" description="Post spar results and deal-breakers to a channel.">
        {slack ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="green" dot>
              Connected to #pmm-launches
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSlack(false);
                toast({ title: 'Slack disconnected' });
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            icon={<Hash className="h-4 w-4" />}
            loading={connecting}
            onClick={() => {
              setConnecting(true);
              window.setTimeout(() => {
                setConnecting(false);
                setSlack(true);
                toast({ tone: 'success', title: 'Slack connected', body: 'Posting to #pmm-launches.' });
              }, 1100);
            }}
          >
            Connect Slack
          </Button>
        )}
      </Section>
    </>
  );
}

// ─── Billing ───────────────────────────────────────────────────────────────

function BillingTab() {
  const members = useApp((s) => s.members);
  const reports = useApp((s) => s.reports);
  const [plansOpen, setPlansOpen] = useState(false);
  const [invoice, setInvoice] = useState<(typeof INVOICES)[number] | null>(null);
  const seats = members.length;
  const usage = [
    { label: 'Spar runs this month', used: 38, limit: 100 },
    { label: 'Seats', used: seats, limit: 10 },
    { label: 'Custom personas', used: 0, limit: 10 },
  ];
  return (
    <>
      <section className="card overflow-hidden">
        <div className="grain flex flex-wrap items-center justify-between gap-4 bg-sand-900 px-6 py-5 text-sand-50">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-400">Current plan</p>
            <p className="display mt-1 text-2xl font-semibold">Team</p>
            <p className="text-sm text-sand-300">$49 per seat / month · billed monthly · renews Oct 1, 2026</p>
          </div>
          <div className="text-right">
            <p className="display text-3xl font-semibold">${seats * 49}</p>
            <p className="text-xs text-sand-400">per month for {seats} seats</p>
          </div>
        </div>
        <div className="grid gap-5 px-6 py-5 sm:grid-cols-3">
          {usage.map((u) => (
            <div key={u.label}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-sand-600">{u.label}</span>
                <span className="font-semibold tabular-nums">
                  {u.used} / {u.limit}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200">
                <motion.div className="h-full rounded-full bg-ember-500" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (u.used / u.limit) * 100)}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          ))}
          <p className="text-xs text-sand-500 sm:col-span-3">Reports and share links are unlimited on Team ({reports.length} created).</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-sand-200/80 bg-sand-50/60 px-6 py-3">
          <Button onClick={() => setPlansOpen(true)}>Compare plans</Button>
        </div>
      </section>

      <Section title="Payment method">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-10 w-14 items-center justify-center rounded-md bg-gradient-to-br from-sand-800 to-sand-950 text-[11px] font-bold italic text-white">VISA</span>
          <div className="flex-1">
            <p className="text-sm font-medium">Visa ending in 4242</p>
            <p className="text-xs text-sand-500">Expires 08/2028 · billing@northbeam.io</p>
          </div>
          <Button icon={<CreditCard className="h-4 w-4" />} onClick={() => toast({ tone: 'info', title: 'Payment details are managed by the workspace owner', body: 'We’ve let Maya Chen know you asked for a change.' })}>
            Update
          </Button>
        </div>
      </Section>

      <Section title="Invoices">
        <table className="-mx-6 w-[calc(100%+3rem)] text-sm">
          <thead>
            <tr className="border-y border-sand-200/80 bg-sand-50/70 text-left text-[11.5px] font-semibold uppercase tracking-wide text-sand-500">
              <th className="px-6 py-2.5">Invoice</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Seats</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-6 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.id} className="border-b border-sand-100 last:border-0">
                <td className="px-6 py-3 font-mono text-[12.5px]">{inv.id}</td>
                <td className="px-3 py-3 text-sand-600">{new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className="px-3 py-3 text-sand-600">{inv.seats}</td>
                <td className="px-3 py-3 font-medium tabular-nums">${inv.amount.toFixed(2)}</td>
                <td className="px-3 py-3">
                  <Badge tone="green">{inv.status}</Badge>
                </td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => setInvoice(inv)} className="text-[13px] font-medium text-ember-600 hover:text-ember-700">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Modal open={plansOpen} onClose={() => setPlansOpen(false)} title="Plans" width="max-w-3xl">
        <div className="grid gap-3 pb-3 md:grid-cols-3">
          {[
            { name: 'Solo', price: '$0', note: 'For one PMM', features: ['3 spars a month', 'Default five personas', 'Markdown export'] },
            { name: 'Team', price: '$49', note: 'per seat / month', features: ['100 spar runs a month', 'Custom personas and lenses', 'Share links and PDF', 'Editable scoring weights'], current: true },
            { name: 'Enterprise', price: 'Custom', note: 'Annual contract', features: ['Unlimited runs', 'SSO and SCIM', 'Custom lens templates', 'Dedicated positioning coach'] },
          ].map((p) => (
            <div key={p.name} className={cx('flex flex-col rounded-xl border p-4', p.current ? 'border-ember-300 bg-ember-50/40 ring-2 ring-ember-100' : 'border-sand-200 bg-white')}>
              <p className="flex items-center justify-between font-semibold">
                {p.name} {p.current && <Badge tone="ember">Current</Badge>}
              </p>
              <p className="display mt-2 text-2xl font-semibold">{p.price}</p>
              <p className="text-xs text-sand-500">{p.note}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-[13px] text-sand-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4"
                variant={p.current ? 'secondary' : p.name === 'Enterprise' ? 'primary' : 'ghost'}
                disabled={p.current}
                onClick={() => {
                  setPlansOpen(false);
                  toast(
                    p.name === 'Enterprise'
                      ? { tone: 'success', title: 'Request sent to sales', body: 'Someone will reach out to aviv@northbeam.io within one business day.' }
                      : { tone: 'info', title: 'Plan changes need the workspace owner', body: 'Maya Chen has been notified.' },
                  );
                }}
              >
                {p.current ? 'Your plan' : p.name === 'Enterprise' ? 'Talk to sales' : 'Switch to Solo'}
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!invoice}
        onClose={() => setInvoice(null)}
        title={invoice ? `Invoice ${invoice.id}` : ''}
        footer={
          <Button variant="primary" onClick={() => window.print()}>
            Print invoice
          </Button>
        }
      >
        {invoice && (
          <div className="space-y-3 pb-2 text-sm">
            <div className="flex justify-between text-sand-600">
              <span>Billed to</span>
              <span className="text-right text-sand-900">Northbeam · billing@northbeam.io</span>
            </div>
            <div className="flex justify-between text-sand-600">
              <span>Date</span>
              <span className="text-sand-900">{new Date(invoice.date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
            </div>
            <div className="rounded-lg border border-sand-200">
              <div className="flex justify-between border-b border-sand-200 px-3 py-2">
                <span>
                  Foil Team × {invoice.seats} seats
                </span>
                <span className="tabular-nums">${invoice.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 font-semibold">
                <span>Total paid</span>
                <span className="tabular-nums">${invoice.amount.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-sand-500">Paid with Visa ending in 4242.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
