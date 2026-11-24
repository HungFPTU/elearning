import { courseListQuerySchema, registerSchema } from '@elearning/shared';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((i) => i.message) ?? [];

describe('shared validation messages', () => {
  it('turns zod defaults into Vietnamese', () => {
    const result = courseListQuerySchema.safeParse({ pageSize: '1000', page: '-1', sort: 'hack' });
    expect(messages(result)).toEqual(['Giá trị tối thiểu là 1', 'Giá trị tối đa là 50', 'Giá trị không hợp lệ']);
  });

  it('does not answer "please enter a password" for a password that is too long', () => {
    const result = registerSchema.safeParse({ email: 'a@b.vn', password: 'x'.repeat(73), fullName: 'An' });
    expect(messages(result)).toEqual(['Mật khẩu tối đa 72 ký tự']);
  });
});
