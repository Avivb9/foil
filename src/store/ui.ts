import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

const INTRO_KEY = 'foil.intro.dismissed';

function introDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

interface UIState {
  toasts: Toast[];
  introOpen: boolean;
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  toast: (t: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) => void;
  dismissToast: (id: number) => void;
  openIntro: () => void;
  closeIntro: () => void;
  setPalette: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
}

let nextId = 1;

export const useUI = create<UIState>((set, get) => ({
  toasts: [],
  introOpen: !introDismissed(),
  paletteOpen: false,
  shortcutsOpen: false,
  toast: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { tone: 'default', ...t, id }] }));
    window.setTimeout(() => get().dismissToast(id), t.action ? 6500 : 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openIntro: () => set({ introOpen: true }),
  closeIntro: () => {
    try {
      window.sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* session storage unavailable: intro simply shows again next load */
    }
    set({ introOpen: false });
  },
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
}));

export const toast = (t: Parameters<UIState['toast']>[0]) => useUI.getState().toast(t);

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
