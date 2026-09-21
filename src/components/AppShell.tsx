import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  BookOpen,
  Check,
  ChevronsUpDown,
  CircleUser,
  FileText,
  Keyboard,
  LayoutList,
  LogOut,
  MessageSquareWarning,
  Plus,
  Search,
  Settings,
  Share2,
  TrendingUp,
  UserPlus,
  Users,
  Mail,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { relativeTime } from '../logic/format';
import { useApp } from '../store/app';
import { toast, useUI } from '../store/ui';
import { CommandPalette } from './CommandPalette';
import { Logo, LogoMark } from './Logo';
import { Avatar, Button, Field, Kbd, Menu, Modal, cx, modKey } from './ui';

const NAV = [
  { to: '/', label: 'Spars', icon: LayoutList, end: true },
  { to: '/spars/new', label: 'New spar', icon: Plus },
  { to: '/personas', label: 'Personas', icon: Users },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { shortcutsOpen, setShortcuts, setPalette } = useUI();

  // scroll to top on navigation
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [loc.pathname]);

  // single-key shortcuts (ignored while typing)
  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (useUI.getState().introOpen || useUI.getState().paletteOpen) return;
      const k = e.key.toLowerCase();
      if (k === '?') setShortcuts(true);
      else if (k === '/') {
        e.preventDefault();
        setPalette(true);
      } else if (k === 'n') nav('/spars/new');
      else if (k === 'g') pendingG = Date.now();
      else if (Date.now() - pendingG < 900) {
        if (k === 's') nav('/');
        if (k === 'p') nav('/personas');
        if (k === 'r') nav('/reports');
        if (k === 'e') nav('/settings/profile');
        pendingG = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav, setShortcuts, setPalette]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcuts(false)} />
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────

function Sidebar() {
  const sparCount = useApp((s) => s.spars.length);
  const reportCount = useApp((s) => s.reports.length);
  const members = useApp((s) => s.members.length);
  const openIntro = useUI((s) => s.openIntro);
  const loc = useLocation();

  return (
    <aside className="no-print flex w-[68px] shrink-0 flex-col border-r border-sand-800 bg-sand-950 text-sand-300 lg:w-60">
      <div className="flex h-14 items-center px-4 lg:px-5">
        <span className="hidden lg:block">
          <Logo dark />
        </span>
        <span className="lg:hidden">
          <LogoMark />
        </span>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 px-2.5" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => {
          const isNew = to === '/spars/new';
          const settingsActive = to === '/settings' && loc.pathname.startsWith('/settings');
          const sparActive = to === '/' && (loc.pathname === '/' || (loc.pathname.startsWith('/spars/') && loc.pathname !== '/spars/new'));
          return (
            <NavLink
              key={to}
              to={to === '/settings' ? '/settings/profile' : to}
              end={end}
              title={label}
              className={({ isActive }) => {
                const active = isActive || settingsActive || sparActive;
                return cx(
                  'group relative flex h-9 items-center justify-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition lg:justify-start',
                  active ? 'bg-white/[0.08] text-white' : 'text-sand-400 hover:bg-white/[0.04] hover:text-sand-100',
                );
              }}
            >
              {({ isActive }) => {
                const active = isActive || settingsActive || sparActive;
                return (
                  <>
                    {active && <motion.span layoutId="nav-active" className="absolute left-0 top-2 h-5 w-[3px] rounded-r-full bg-ember-500" />}
                    <span className={cx('flex h-5 w-5 items-center justify-center', isNew && 'rounded-md bg-ember-500 text-white')}>
                      <Icon className={isNew ? 'h-3.5 w-3.5' : 'h-[17px] w-[17px]'} />
                    </span>
                    <span className="hidden flex-1 lg:block">{label}</span>
                    {to === '/' && <span className="hidden text-xs tabular-nums text-sand-500 lg:block">{sparCount}</span>}
                    {to === '/reports' && <span className="hidden text-xs tabular-nums text-sand-500 lg:block">{reportCount}</span>}
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-2 p-3">
        <NavLink to="/settings/billing" className="hidden rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 transition hover:bg-white/[0.06] lg:block">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-sand-200">Team plan</span>
            <span className="text-sand-500">{members} seats</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-ember-600 to-ember-400" />
          </div>
          <p className="mt-1.5 text-[11px] text-sand-500">38 of 100 spar runs this month</p>
        </NavLink>
        <button
          onClick={openIntro}
          title="About Foil"
          className="flex h-9 w-full items-center justify-center gap-3 rounded-lg px-2.5 text-[13px] text-sand-400 transition hover:bg-white/[0.04] hover:text-sand-100 lg:justify-start"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden lg:block">About Foil</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Topbar ────────────────────────────────────────────────────────────────

function Topbar() {
  const workspaceName = useApp((s) => s.workspaceName);
  const profile = useApp((s) => s.profile);
  const setPalette = useUI((s) => s.setPalette);
  const openIntro = useUI((s) => s.openIntro);
  const setShortcuts = useUI((s) => s.setShortcuts);
  const nav = useNavigate();
  const [createWs, setCreateWs] = useState(false);

  return (
    <header className="no-print flex h-14 shrink-0 items-center gap-3 border-b border-sand-200/80 bg-[#f6f2ea]/90 px-4 backdrop-blur sm:px-6">
      <Menu
        width="w-64"
        trigger={({ toggle, open }) => (
          <button onClick={toggle} aria-expanded={open} className="flex h-9 items-center gap-2 rounded-lg px-2 transition hover:bg-sand-200/60">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-600 to-indigo-700 text-[11px] font-bold text-white">
              {workspaceName.charAt(0)}
            </span>
            <span className="text-sm font-semibold text-sand-900">{workspaceName}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-sand-400" />
          </button>
        )}
        items={[
          { label: 'Workspaces', heading: true },
          { label: workspaceName, icon: <Check className="h-4 w-4 text-ember-500" />, hint: 'Team', onSelect: () => toast({ title: `You’re already in ${workspaceName}` }) },
          { divider: true, label: '' },
          { label: 'Workspace settings', icon: <Settings className="h-4 w-4" />, onSelect: () => nav('/settings/workspace') },
          { label: 'Invite teammates', icon: <UserPlus className="h-4 w-4" />, onSelect: () => nav('/settings/workspace?invite=1') },
          { label: 'Create workspace', icon: <Plus className="h-4 w-4" />, onSelect: () => setCreateWs(true) },
        ]}
      />

      <button
        onClick={() => setPalette(true)}
        className="ml-1 flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-sand-200 bg-white/70 px-3 text-left text-sm text-sand-400 transition hover:border-sand-300 hover:bg-white"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">Search spars, reports…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell />
        <Menu
          align="right"
          width="w-64"
          header={
            <div className="flex items-center gap-3 border-b border-sand-200/80 px-2.5 pb-3 pt-2">
              <Avatar name={profile.name} size={36} color="#c2410c" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sand-900">{profile.name}</p>
                <p className="truncate text-xs text-sand-500">{profile.title} · {workspaceName}</p>
              </div>
            </div>
          }
          trigger={({ toggle, open }) => (
            <button onClick={toggle} aria-expanded={open} aria-label="User menu" className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-sand-200/60">
              <Avatar name={profile.name} size={28} color="#c2410c" />
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-[13px] font-semibold text-sand-900">{profile.name}</span>
                <span className="block text-[11px] text-sand-500">{profile.title}</span>
              </span>
            </button>
          )}
          items={[
            { label: 'Profile', icon: <CircleUser className="h-4 w-4" />, onSelect: () => nav('/settings/profile') },
            { label: 'Settings', icon: <Settings className="h-4 w-4" />, onSelect: () => nav('/settings/workspace') },
            { label: 'Keyboard shortcuts', icon: <Keyboard className="h-4 w-4" />, hint: '?', onSelect: () => setShortcuts(true) },
            { label: 'About Foil', icon: <BookOpen className="h-4 w-4" />, onSelect: openIntro },
            { divider: true, label: '' },
            { label: 'Sign out', icon: <LogOut className="h-4 w-4" />, onSelect: () => nav('/signin') },
          ]}
        />
      </div>
      <CreateWorkspaceModal open={createWs} onClose={() => setCreateWs(false)} />
    </header>
  );
}

function CreateWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setName('');
      setErr(null);
    }
  }, [open]);
  const submit = () => {
    if (name.trim().length < 2) return setErr('Give the workspace a name (2+ characters).');
    onClose();
    toast({ tone: 'success', title: `Request sent for “${name.trim()}”`, body: 'Maya Chen (workspace owner) will approve the new workspace.' });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a workspace"
      description="Workspaces keep spars, personas and reports separate, e.g. one per product line or client."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Request workspace
          </Button>
        </>
      }
    >
      <Field label="Workspace name" error={err} htmlFor="ws-name">
        <input
          id="ws-name"
          className={cx('input', err && 'input-error')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="e.g. Northbeam EMEA"
        />
      </Field>
    </Modal>
  );
}

const NOTIF_ICONS: Record<string, ReactNode> = {
  share: <Share2 className="h-3.5 w-3.5" />,
  score: <TrendingUp className="h-3.5 w-3.5" />,
  objection: <MessageSquareWarning className="h-3.5 w-3.5" />,
  digest: <Mail className="h-3.5 w-3.5" />,
  member: <UserPlus className="h-3.5 w-3.5" />,
};

function NotificationBell() {
  const notifications = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markNotificationRead);
  const markAll = useApp((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-sand-600 transition hover:bg-sand-200/60 hover:text-sand-900"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#f6f2ea]">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-50 mt-1.5 w-[360px] overflow-hidden rounded-xl border border-sand-200 bg-[#fffdf9] shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-sand-200/80 px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <button
                onClick={() => {
                  markAll();
                  toast({ title: 'All caught up', tone: 'success' });
                }}
                disabled={!unread}
                className="text-xs font-medium text-ember-600 hover:text-ember-700 disabled:text-sand-400"
              >
                Mark all as read
              </button>
            </div>
            <ul className="max-h-[380px] overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                      nav(n.href);
                    }}
                    className="flex w-full gap-3 border-b border-sand-100 px-4 py-3 text-left transition last:border-0 hover:bg-sand-50"
                  >
                    <span className={cx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-sand-100 text-sand-500' : 'bg-ember-100 text-ember-600')}>
                      {NOTIF_ICONS[n.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cx('truncate text-[13px]', n.read ? 'text-sand-700' : 'font-semibold text-sand-900')}>{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-sand-500">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-sand-400">{relativeTime(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-sand-200/80 bg-sand-50/60 px-4 py-2.5 text-center">
              <button
                onClick={() => {
                  setOpen(false);
                  nav('/settings/notifications');
                }}
                className="text-xs font-medium text-sand-600 hover:text-sand-900"
              >
                Notification settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: [string, ReactNode][] = [
    ['Command palette', <><Kbd>{modKey}</Kbd><Kbd>K</Kbd></>],
    ['Search', <Kbd>/</Kbd>],
    ['New spar', <Kbd>N</Kbd>],
    ['Go to Spars', <><Kbd>G</Kbd><Kbd>S</Kbd></>],
    ['Go to Personas', <><Kbd>G</Kbd><Kbd>P</Kbd></>],
    ['Go to Reports', <><Kbd>G</Kbd><Kbd>R</Kbd></>],
    ['Start spar (in a spar)', <><Kbd>{modKey}</Kbd><Kbd>↵</Kbd></>],
    ['Show shortcuts', <Kbd>?</Kbd>],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" width="max-w-md">
      <ul className="divide-y divide-sand-200/70 pb-2">
        {rows.map(([label, keys]) => (
          <li key={label} className="flex items-center justify-between py-2.5 text-sm text-sand-700">
            {label}
            <span className="flex gap-1">{keys}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
