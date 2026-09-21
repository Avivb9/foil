import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { DEFAULT_PERSONAS, PERSONA_COLORS } from '../data/personas';
import {
  CURRENT_USER,
  WORKSPACE_NAME,
  buildMembers,
  buildNotifications,
  buildReports,
  buildSpars,
  type AppNotification,
  type Member,
} from '../data/seed';
import { EMPTY_FIELDS } from '../data/examples';
import { DEFAULT_WEIGHTS } from '../logic/scoring';
import type { Fields, Lens, Persona, PressureMode, Report, RunSnapshot, Spar, Weights } from '../logic/types';

/** localStorage wrapper that never throws (private windows, blocked storage, quota). */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* storage unavailable: keep state in memory only */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export interface Profile {
  name: string;
  title: string;
  email: string;
  timezone: string;
}

export interface NotificationPrefs {
  sparComplete: boolean;
  dealbreakers: boolean;
  reportShared: boolean;
  weeklyDigest: boolean;
  mentions: boolean;
  productUpdates: boolean;
}

interface AppState {
  spars: Spar[];
  personas: Persona[];
  reports: Report[];
  weights: Weights;
  defaultMode: PressureMode;
  profile: Profile;
  workspaceName: string;
  members: Member[];
  notifications: AppNotification[];
  notificationPrefs: NotificationPrefs;

  createSpar: (input: { company: string; product?: string; segment?: string; fields?: Fields; mode?: PressureMode }) => string;
  updateSpar: (id: string, patch: Partial<Omit<Spar, 'id'>>) => void;
  updateDraft: (id: string, fields: Partial<Fields>) => void;
  duplicateSpar: (id: string) => string | null;
  deleteSpar: (id: string) => void;
  recordRun: (id: string, run: RunSnapshot) => void;
  saveVersion: (id: string, label: string) => RunSnapshot | null;
  restoreVersion: (id: string, versionId: string) => void;

  togglePersona: (id: string) => void;
  addPersona: (p: { name: string; role: string; lens: Lens; bio?: string }) => Persona;
  updatePersona: (id: string, patch: Partial<Persona>) => void;
  removePersona: (id: string) => void;
  resetPersonas: () => void;

  createReport: (sparId: string, snapshot: RunSnapshot, title?: string) => Report;
  renameReport: (id: string, title: string) => void;
  deleteReport: (id: string) => void;

  setWeights: (w: Weights) => void;
  resetWeights: () => void;
  setDefaultMode: (m: PressureMode) => void;
  setProfile: (p: Profile) => void;
  setWorkspaceName: (name: string) => void;
  inviteMember: (email: string, role: Member['role']) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  removeMember: (id: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => void;
  setNotificationPrefs: (p: Partial<NotificationPrefs>) => void;

  resetAll: () => void;
}

function seedState() {
  const spars = buildSpars();
  return {
    spars,
    personas: DEFAULT_PERSONAS.map((p) => ({ ...p })),
    reports: buildReports(spars),
    weights: { ...DEFAULT_WEIGHTS },
    defaultMode: 'tough' as PressureMode,
    profile: { ...CURRENT_USER, timezone: 'Asia/Jerusalem (GMT+3)' },
    workspaceName: WORKSPACE_NAME,
    members: buildMembers(),
    notifications: buildNotifications(),
    notificationPrefs: {
      sparComplete: true,
      dealbreakers: true,
      reportShared: true,
      weeklyDigest: true,
      mentions: true,
      productUpdates: false,
    },
  };
}

const now = () => new Date().toISOString();

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      createSpar: ({ company, product, segment, fields, mode }) => {
        const id = `${company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'spar'}-${Math.random().toString(36).slice(2, 6)}`;
        const spar: Spar = {
          id,
          company: company.trim(),
          product: product?.trim() || company.trim(),
          segment: segment?.trim() || 'Unassigned',
          owner: get().profile.name,
          status: 'Draft',
          mode: mode ?? get().defaultMode,
          draft: { ...(fields ?? EMPTY_FIELDS) },
          lastRun: null,
          versions: [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ spars: [spar, ...s.spars] }));
        return id;
      },

      updateSpar: (id, patch) =>
        set((s) => ({ spars: s.spars.map((sp) => (sp.id === id ? { ...sp, ...patch, updatedAt: now() } : sp)) })),

      updateDraft: (id, fields) =>
        set((s) => ({
          spars: s.spars.map((sp) => (sp.id === id ? { ...sp, draft: { ...sp.draft, ...fields }, updatedAt: now() } : sp)),
        })),

      duplicateSpar: (id) => {
        const src = get().spars.find((s) => s.id === id);
        if (!src) return null;
        const newId = `${src.id}-copy-${Math.random().toString(36).slice(2, 5)}`;
        const copy: Spar = {
          ...src,
          id: newId,
          company: `${src.company} (copy)`,
          owner: get().profile.name,
          status: 'Draft',
          versions: [],
          lastRun: null,
          draft: { ...src.draft },
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ spars: [copy, ...s.spars] }));
        return newId;
      },

      deleteSpar: (id) => set((s) => ({ spars: s.spars.filter((sp) => sp.id !== id), reports: s.reports.filter((r) => r.sparId !== id) })),

      recordRun: (id, run) =>
        set((s) => ({
          spars: s.spars.map((sp) => (sp.id === id ? { ...sp, lastRun: run, updatedAt: run.at } : sp)),
        })),

      saveVersion: (id, label) => {
        const sp = get().spars.find((s) => s.id === id);
        if (!sp) return null;
        const base = sp.lastRun ?? { id: '', at: now(), fields: sp.draft, company: sp.company, mode: sp.mode, personaIds: [] };
        const v: RunSnapshot = { ...base, id: uid('v'), at: now(), label, fields: { ...base.fields } };
        set((s) => ({
          spars: s.spars.map((x) => (x.id === id ? { ...x, versions: [...x.versions, v], updatedAt: now() } : x)),
        }));
        return v;
      },

      restoreVersion: (id, versionId) =>
        set((s) => ({
          spars: s.spars.map((sp) => {
            if (sp.id !== id) return sp;
            const v = sp.versions.find((x) => x.id === versionId);
            return v ? { ...sp, draft: { ...v.fields }, mode: v.mode, updatedAt: now() } : sp;
          }),
        })),

      togglePersona: (id) => set((s) => ({ personas: s.personas.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)) })),

      addPersona: ({ name, role, lens, bio }) => {
        const used = get().personas.length;
        const p: Persona = {
          id: uid('p'),
          name: name.trim(),
          role: role.trim(),
          lens,
          bio: bio?.trim() || `Joins the panel through the ${lens} lens.`,
          color: PERSONA_COLORS[used % PERSONA_COLORS.length],
          enabled: true,
          custom: true,
        };
        set((s) => ({ personas: [...s.personas, p] }));
        return p;
      },

      updatePersona: (id, patch) => set((s) => ({ personas: s.personas.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      removePersona: (id) => set((s) => ({ personas: s.personas.filter((p) => p.id !== id) })),

      resetPersonas: () => set({ personas: DEFAULT_PERSONAS.map((p) => ({ ...p })) }),

      createReport: (sparId, snapshot, title) => {
        const sp = get().spars.find((s) => s.id === sparId);
        const r: Report = {
          id: uid('r'),
          sparId,
          title: title?.trim() || `${sp?.company ?? 'Spar'} positioning report`,
          createdAt: now(),
          createdBy: get().profile.name,
          slug: `${(sp?.company ?? 'spr').slice(0, 3).toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
          snapshot: { ...snapshot, fields: { ...snapshot.fields } },
        };
        set((s) => ({ reports: [r, ...s.reports] }));
        return r;
      },

      renameReport: (id, title) => set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, title } : r)) })),
      deleteReport: (id) => set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),

      setWeights: (weights) => set({ weights }),
      resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
      setDefaultMode: (defaultMode) => set({ defaultMode }),
      setProfile: (profile) => set({ profile }),
      setWorkspaceName: (workspaceName) => set({ workspaceName }),

      inviteMember: (email, role) =>
        set((s) => ({
          members: [
            ...s.members,
            {
              id: uid('m'),
              name: email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              email,
              title: 'Pending invite',
              role,
              status: 'Invited',
              lastActive: now(),
            },
          ],
        })),
      updateMember: (id, patch) => set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMember: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushNotification: (n) =>
        set((s) => ({ notifications: [{ ...n, id: uid('n'), at: now(), read: false }, ...s.notifications].slice(0, 20) })),
      setNotificationPrefs: (p) => set((s) => ({ notificationPrefs: { ...s.notificationPrefs, ...p } })),

      resetAll: () => set(seedState()),
    }),
    {
      name: 'foil-workspace-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
    },
  ),
);

export function personaById(personas: Persona[], id: string): Persona | undefined {
  return personas.find((p) => p.id === id);
}
