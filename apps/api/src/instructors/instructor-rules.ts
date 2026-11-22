import { ApplicationStatus } from '@elearning/shared';
import { badRequest, conflict, forbidden } from '../common/app-exception.js';

/**
 * Rules for instructor applications, as plain functions so they are unit tested in one place.
 */

/** The subjects that are new for the applicant; fails when there is nothing left to ask for. */
export function subjectsToRequest(requested: readonly string[], alreadyTeaching: readonly string[]): string[] {
  const fresh = requested.filter((id) => !alreadyTeaching.includes(id));
  if (fresh.length === 0) throw badRequest('ALREADY_TEACHING', 'Bạn đã được dạy các môn này rồi');
  return fresh;
}

export function assertNoPendingApplication(pendingCount: number): void {
  if (pendingCount > 0) {
    throw conflict('APPLICATION_PENDING', 'Bạn đang có một đơn chờ duyệt, vui lòng đợi kết quả trước khi gửi đơn mới');
  }
}

export function assertCanDecide(
  application: { userId: string; status: ApplicationStatus },
  reviewerId: string,
): void {
  if (application.userId === reviewerId) {
    throw forbidden('CANNOT_REVIEW_OWN', 'Bạn không thể tự duyệt đơn của mình');
  }
  if (application.status !== ApplicationStatus.PENDING) {
    throw conflict('APPLICATION_DECIDED', 'Đơn này đã được xử lý');
  }
}

/** Approved subjects must come from the application itself. */
export function assertApprovedSubset(approved: readonly string[], requested: readonly string[]): void {
  if (approved.every((id) => requested.includes(id))) return;
  throw badRequest('SUBJECT_NOT_IN_APPLICATION', 'Chỉ được duyệt những môn có trong đơn');
}
