import { PERMISSION_KEYS, Role } from '@elearning/shared';
import { resolvePermissions } from './resolve-permissions.js';

describe('resolvePermissions', () => {
  it('returns the role permissions when there are no overrides', () => {
    expect(resolvePermissions(Role.USER, ['course.learn'], [])).toEqual(['course.learn']);
  });

  it('adds GRANT overrides', () => {
    const result = resolvePermissions(Role.USER, ['course.learn'], [{ permissionKey: 'audit.read', effect: 'GRANT' }]);
    expect(result).toEqual(expect.arrayContaining(['course.learn', 'audit.read']));
    expect(result).toHaveLength(2);
  });

  it('lets DENY win over both the role and a GRANT', () => {
    const result = resolvePermissions(
      Role.INSTRUCTOR,
      ['course.learn', 'course.create'],
      [
        { permissionKey: 'course.create', effect: 'DENY' },
        { permissionKey: 'audit.read', effect: 'GRANT' },
        { permissionKey: 'audit.read', effect: 'DENY' },
      ],
    );
    expect(result).toEqual(['course.learn']);
  });

  it('gives owners every permission, ignoring DENY overrides', () => {
    const result = resolvePermissions(Role.OWNER, [], [{ permissionKey: 'role.manage', effect: 'DENY' }]);
    expect(result).toEqual(PERMISSION_KEYS);
  });

  it('ignores keys that are not in the catalog', () => {
    expect(resolvePermissions('CUSTOM', ['old.removed', 'course.learn'], [{ permissionKey: 'x.y', effect: 'GRANT' }])).toEqual([
      'course.learn',
    ]);
  });
});
