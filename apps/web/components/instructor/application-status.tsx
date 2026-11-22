import { APPLICATION_STATUS_LABELS, type ApplicationStatus, type ApplicationSubjectDto } from '@elearning/shared';
import { Badge } from '@/components/ui/badge';

const TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' } as const;

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={TONE[status]}>{APPLICATION_STATUS_LABELS[status]}</Badge>;
}

/** Subject chips; after a decision, approved ones are green and the rest struck through. */
export function ApplicationSubjects({ subjects }: { subjects: ApplicationSubjectDto[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {subjects.map((s) => (
        <Badge
          key={s.id}
          tone={s.approved === true ? 'green' : 'neutral'}
          className={s.approved === false ? 'line-through' : undefined}
        >
          {s.category.name} · {s.name}
        </Badge>
      ))}
    </div>
  );
}
