import { Controller, Get } from '@nestjs/common';
import type { CategoryDto } from '@elearning/shared';
import { Public } from '../common/decorators/public.decorator.js';
import { CategoriesService } from './categories.service.js';

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(): Promise<CategoryDto[]> {
    return this.categories.list();
  }
}
