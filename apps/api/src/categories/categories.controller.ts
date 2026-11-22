import { Controller, Get, Param } from '@nestjs/common';
import type { CategoryTreeDto } from '@elearning/shared';
import { Public } from '../common/decorators/public.decorator.js';
import { CategoriesService } from './categories.service.js';

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(): Promise<CategoryTreeDto[]> {
    return this.categories.tree();
  }

  @Get(':slug')
  get(@Param('slug') slug: string): Promise<CategoryTreeDto> {
    return this.categories.getBySlug(slug);
  }
}
