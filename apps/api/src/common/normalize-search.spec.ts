import { normalizeSearch, searchWords } from '@elearning/shared';

describe('normalizeSearch', () => {
  it('drops Vietnamese accents, đ and case', () => {
    expect(normalizeSearch('  Hóa HỌC   Đại cương ')).toBe('hoa hoc dai cuong');
  });

  it('splits into words for AND matching', () => {
    expect(searchWords('Lê  Hóa')).toEqual([' le', ' hoa']);
    expect(searchWords('   ')).toEqual([]);
  });

  it('escapes LIKE wildcards', () => {
    expect(searchWords('50%_off')).toEqual([' 50\\%\\_off']);
  });
});
