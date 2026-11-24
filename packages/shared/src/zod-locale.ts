import { z } from 'zod';

type SizeIssue = { origin?: string; maximum?: unknown; minimum?: unknown };

const tooBig = ({ origin, maximum }: SizeIssue): string | undefined => {
  if (origin === 'string') return `Tối đa ${String(maximum)} ký tự`;
  if (origin === 'number' || origin === 'int') return `Giá trị tối đa là ${String(maximum)}`;
  if (origin === 'array' || origin === 'set') return `Chọn tối đa ${String(maximum)} mục`;
  return undefined;
};

const tooSmall = ({ origin, minimum }: SizeIssue): string | undefined => {
  if (origin === 'string') return `Tối thiểu ${String(minimum)} ký tự`;
  if (origin === 'number' || origin === 'int') return `Giá trị tối thiểu là ${String(minimum)}`;
  if (origin === 'array' || origin === 'set') return `Chọn ít nhất ${String(minimum)} mục`;
  return undefined;
};

/**
 * Vietnamese validation messages for every schema built with this zod instance, so the API and the web
 * forms never show zod's English defaults. Rules with their own message keep it; common size and enum
 * errors get a friendly sentence; everything else falls back to zod's built-in `vi` locale.
 */
export function configureZodLocale(): void {
  z.config(z.locales.vi());
  z.config({
    customError: (issue) => {
      if (issue.code === 'too_big') return tooBig(issue);
      if (issue.code === 'too_small') return tooSmall(issue);
      if (issue.code === 'invalid_value') return 'Giá trị không hợp lệ';
      return undefined;
    },
  });
}

configureZodLocale();
