import { Injectable } from '@nestjs/common';
import type { UserDto } from '@elearning/shared';
import { notFound } from '../common/app-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Fields that are safe to send to clients. Never include passwordHash. */
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user) throw notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng');
    return user;
  }
}
