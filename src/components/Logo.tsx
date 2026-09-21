import { cx } from './ui';

/** Foil mark: a fencing blade crossing a guard. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#221e19" />
      <path d="M9 23 L23 9" stroke="#f45412" strokeWidth="3" strokeLinecap="round" />
      <path d="M19 9h4v4" stroke="#f45412" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="10" cy="22" r="2.4" fill="#fbf9f6" />
    </svg>
  );
}

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className={cx('display text-[21px] font-semibold', dark ? 'text-sand-50' : 'text-sand-900')}>Foil</span>
    </span>
  );
}
