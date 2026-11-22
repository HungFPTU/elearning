import { Injectable } from '@nestjs/common';
import type { MeDto, UserDto } from '@elearning/shared';
import { PermissionsService } from '../access/permissions.service.js';
import { notFound } from '../common/app-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Fields that are safe to send to clients. Never include passwordHash. */
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  role: { select: { key: true } },
} as const;

interface PublicUserRow {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: { key: string };
}

export const toUserDto = ({ role, ...rest }: PublicUserRow): UserDto => ({ ...rest, role: role.key });

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async getMe(id: string): Promise<MeDto> {
    const [user, access] = await Promise.all([
      this.prisma.user.findUnique({ where: { id }, select: { ...publicUserSelect, status: true } }),
      this.permissions.getAccess(id),
    ]);
    if (!user || !access) throw notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng');
    return { ...toUserDto(user), status: user.status, permissions: access.permissions };
  }
}
