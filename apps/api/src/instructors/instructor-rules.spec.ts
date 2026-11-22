import {
  assertApprovedSubset,
  assertCanDecide,
  assertNoPendingApplication,
  subjectsToRequest,
} from './instructor-rules.js';

describe('instructor application rules', () => {
  it('drops subjects the applicant already teaches', () => {
    expect(subjectsToRequest(['hoa10', 'tin'], ['hoa10'])).toEqual(['tin']);
  });

  it('rejects an application for subjects that are all already granted', () => {
    expect(() => subjectsToRequest(['hoa10'], ['hoa10'])).toThrow('đã được dạy');
  });

  it('allows only one pending application at a time', () => {
    expect(() => assertNoPendingApplication(0)).not.toThrow();
    expect(() => assertNoPendingApplication(1)).toThrow('chờ duyệt');
  });

  it('blocks reviewing your own application or one already decided', () => {
    expect(() => assertCanDecide({ userId: 'u1', status: 'PENDING' }, 'u1')).toThrow('tự duyệt');
    expect(() => assertCanDecide({ userId: 'u1', status: 'APPROVED' }, 'admin')).toThrow('đã được xử lý');
    expect(() => assertCanDecide({ userId: 'u1', status: 'PENDING' }, 'admin')).not.toThrow();
  });

  it('approves only subjects that were asked for', () => {
    expect(() => assertApprovedSubset(['hoa10'], ['hoa10', 'hoa11'])).not.toThrow();
    expect(() => assertApprovedSubset(['tin'], ['hoa10'])).toThrow('Chỉ được duyệt');
  });
});
