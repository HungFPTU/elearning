import { Injectable } from '@nestjs/common';
import type { CategoryTreeDto } from '@elearning/shared';
import { notFound } from '../common/app-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const treeSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  subjects: {
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, description: true },
  },
} satisfies Prisma.CategorySelect;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public catalog tree: categories with their active subjects. */
  tree(): Promise<CategoryTreeDto[]> {
    return this.prisma.category.findMany({ select: treeSelect, orderBy: [{ position: 'asc' }, { name: 'asc' }] });
  }

  async getBySlug(slug: string): Promise<CategoryTreeDto> {
    const category = await this.prisma.category.findUnique({ where: { slug }, select: treeSelect });
    if (!category) throw notFound('CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục');
    return category;
  }
}
