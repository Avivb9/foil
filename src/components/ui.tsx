import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { initials } from '../data/personas';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

// ─── Button ────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ember-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(189,42,9,0.35)] hover:bg-ember-600 active:bg-ember-700 disabled:bg-ember-300',
  secondary: 'bg-white text-sand-800 border border-sand-200 shadow-card hover:bg-sand-50 hover:border-sand-300 disabled:text-sand-400',
  ghost: 'text-sand-700 hover:bg-sand-200/60 hover:text-sand-900 disabled:text-sand-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  dark: 'bg-sand-900 text-sand-50 hover:bg-sand-800 disabled:bg-sand-500',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg text-sand-600 transition hover:bg-sand-200/60 hover:text-sand-900', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────

const BADGE_TONES = {
  neutral: 'bg-sand-100 text-sand-700 ring-sand-200',
  ember: 'bg-ember-50 text-ember-700 ring-ember-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};
export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset', BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#b45309', '#1d4ed8', '#047857', '#7c3aed', '#be123c', '#0f766e', '#a21caf'];
export function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ name, color, size = 32, className, ring }: { name: string; color?: string; size?: number; className?: string; ring?: boolean }) {
  const bg = color ?? colorFor(name);
  return (
    <span
      className={cx('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white', ring && 'ring-2 ring-[#fffdf9]', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36), background: `linear-gradient(145deg, ${bg}, ${shade(bg)})` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `rgb(${r},${g},${b})`;
}

// ─── Modal ─────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('input, textarea, select, button[data-autofocus]');
      el?.focus();
    }, 50);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fixed inset-0 bg-sand-950/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cx('relative w-full rounded-2xl border border-sand-200 bg-[#fffdf9] shadow-lift', width)}
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
              <div>
                <h2 id={titleId} className="text-[17px] font-semibold text-sand-900">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-sand-600">{description}</p>}
              </div>
              <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1 h-8 w-8">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            {children && <div className="px-6 py-3">{children}</div>}
            {footer && <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-sand-200/80 bg-sand-50/60 px-6 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Dropdown menu ─────────────────────────────────────────────────────────

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  divider?: boolean;
  heading?: boolean;
  checked?: boolean;
}

export function Menu({
  trigger,
  items,
  align = 'left',
  width = 'w-60',
  header,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  width?: string;
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
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
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cx(
              'absolute z-50 mt-1.5 overflow-hidden rounded-xl border border-sand-200 bg-[#fffdf9] p-1 shadow-lift',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              width,
            )}
          >
            {header}
            {items.map((it, i) =>
              it.divider ? (
                <div key={i} className="my-1 h-px bg-sand-200/80" />
              ) : it.heading ? (
                <div key={i} className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                  {it.label}
                </div>
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    it.onSelect?.();
                  }}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition',
                    it.danger ? 'text-red-600 hover:bg-red-50' : 'text-sand-800 hover:bg-sand-100',
                  )}
                >
                  {it.icon && <span className="flex h-4 w-4 items-center justify-center text-sand-500">{it.icon}</span>}
                  <span className="min-w-0 flex-1">{it.label}</span>
                  {it.hint && <span className="text-xs text-sand-400">{it.hint}</span>}
                  {it.checked && <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toggle / Segmented / Tabs ─────────────────────────────────────────────

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-ember-500' : 'bg-sand-300',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className={cx('h-[18px] w-[18px] rounded-full bg-white shadow', checked ? 'ml-[18px]' : 'ml-[2px]')}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  size?: 'sm' | 'md';
  layoutId: string;
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-lg border border-sand-200 bg-sand-100/80 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative rounded-md font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
              active ? 'text-sand-900' : 'text-sand-500 hover:text-sand-800',
            )}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-md bg-white shadow-card ring-1 ring-sand-200" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: ReactNode; count?: number | string; disabled?: boolean }[];
  layoutId: string;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-sand-200">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cx(
              'relative flex items-center gap-2 whitespace-nowrap px-3 pb-2.5 pt-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
              active ? 'text-sand-900' : 'text-sand-500 hover:text-sand-800',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-ember-100 text-ember-700' : 'bg-sand-200/70 text-sand-600')}>{t.count}</span>
            )}
            {active && <motion.span layoutId={layoutId} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ember-500" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Skeleton / Empty ──────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx('relative overflow-hidden rounded-md bg-sand-200/60', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-sand-200 bg-white text-ember-500 shadow-card">{icon}</div>
      <h3 className="text-[15px] font-semibold text-sand-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-sand-600">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Form field ────────────────────────────────────────────────────────────

export function Field({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-sand-800">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : hint ? <p className="text-xs text-sand-500">{hint}</p> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl';
