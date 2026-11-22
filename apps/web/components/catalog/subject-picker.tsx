'use client';

import type { CategoryTreeDto } from '@elearning/shared';

/** Checkbox list of subjects grouped by category. `disabledIds` are shown checked and locked. */
export function SubjectPicker({
  categories,
  value,
  onChange,
  disabledIds = [],
  disabled = false,
}: {
  categories: CategoryTreeDto[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabledIds?: string[];
  disabled?: boolean;
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {categories
        .filter((c) => c.subjects.length > 0)
        .map((c) => (
          <fieldset key={c.id} className="rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-semibold">{c.name}</legend>
            <div className="flex flex-col gap-1">
              {c.subjects.map((s) => {
                const locked = disabledIds.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={locked || value.includes(s.id)}
                      disabled={disabled || locked}
                      onChange={() => toggle(s.id)}
                    />
                    {s.name}
                    {locked && <span className="text-xs text-slate-400">(đã được dạy)</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
    </div>
  );
}
