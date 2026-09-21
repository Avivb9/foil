import { AlertCircle, MousePointerClick } from 'lucide-react';
import { useRef } from 'react';
import { FIELD_HELP, FIELD_ORDER } from '../../data/examples';
import { PLACEHOLDER_RE, uniqueBuzzwords } from '../../logic/text';
import type { ComponentKey, Fields, ScoreResult } from '../../logic/types';
import { cx } from '../ui';
import { COMPONENT_COLORS, toneColor } from './bits';

interface Props {
  fields: Fields;
  onChange: (key: ComponentKey, value: string) => void;
  score: ScoreResult;
  errors?: Partial<Record<ComponentKey, string>>;
  disabled?: boolean;
}

export function FieldsEditor({ fields, onChange, score, errors, disabled }: Props) {
  const refs = useRef<Partial<Record<ComponentKey, HTMLTextAreaElement | null>>>({});

  const selectPlaceholder = (key: ComponentKey) => {
    const el = refs.current[key];
    if (!el) return;
    const m = new RegExp(PLACEHOLDER_RE.source).exec(el.value);
    el.focus();
    if (m) el.setSelectionRange(m.index, m.index + m[0].length);
  };

  return (
    <div className="space-y-5">
      {FIELD_ORDER.map((key, i) => {
        const help = FIELD_HELP[key];
        const value = fields[key];
        const buzz = uniqueBuzzwords(value);
        const gaps = (value.match(PLACEHOLDER_RE) || []).length;
        const comp = score.components[key];
        const err = errors?.[key];
        return (
          <div key={key} className="group">
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <label htmlFor={`field-${key}`} className="flex items-center gap-2">
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-md text-[10.5px] font-bold text-white', COMPONENT_COLORS[key].bg)}>{i + 1}</span>
                <span className="text-[14px] font-semibold text-sand-900">{help.label}</span>
                <span className="hidden text-[11.5px] text-sand-400 sm:inline">· {help.persona}</span>
              </label>
              {value.trim() && (
                <span className="flex items-center gap-1.5 text-[11.5px] tabular-nums text-sand-500" title="Live component score">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor(comp.score) }} />
                  {comp.score}
                </span>
              )}
            </div>
            <textarea
              id={`field-${key}`}
              ref={(el) => (refs.current[key] = el)}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={help.placeholder}
              rows={key === 'category' || key === 'alternatives' ? 2 : 3}
              className={cx('input resize-none leading-relaxed disabled:bg-sand-50 disabled:text-sand-500', err && 'input-error')}
              aria-invalid={!!err}
              aria-describedby={`help-${key}`}
            />
            <div id={`help-${key}`} className="mt-1.5 flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
              {err ? (
                <span className="flex items-center gap-1 font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {err}
                </span>
              ) : (
                <span className="text-sand-500">{help.hint}</span>
              )}
              {buzz.length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  <span className="text-ember-700">Flagged:</span>
                  {buzz.map((b) => (
                    <span key={b} className="rounded bg-ember-50 px-1.5 py-px font-medium text-ember-700 ring-1 ring-inset ring-ember-200">
                      {b}
                    </span>
                  ))}
                </span>
              )}
              {gaps > 0 && (
                <button
                  type="button"
                  onClick={() => selectPlaceholder(key)}
                  className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-px font-medium text-amber-900 ring-1 ring-inset ring-amber-300 hover:bg-amber-200"
                  title="Select the next gap so you can type over it"
                >
                  <MousePointerClick className="h-3 w-3" /> {gaps} gap{gaps > 1 ? 's' : ''} to fill
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
