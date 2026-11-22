import { Role } from '@elearning/shared';
import { Badge } from '@/components/ui/badge';

const TONE = {
  [Role.OWNER]: 'red',
  [Role.ADMIN]: 'amber',
  [Role.INSTRUCTOR]: 'indigo',
} as const;

export function RoleBadge({ role }: { role: { key: string; name: string } }) {
  const tone = role.key in TONE ? TONE[role.key as keyof typeof TONE] : 'neutral';
  return <Badge tone={tone}>{role.name}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  return status === 'LOCKED' ? <Badge tone="red">Đã khóa</Badge> : <Badge tone="green">Hoạt động</Badge>;
}
