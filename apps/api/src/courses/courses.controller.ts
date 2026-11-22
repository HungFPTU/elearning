import { Controller, Get, Param, Query } from '@nestjs/common';
import { type CourseDetailDto, type CourseListQuery, courseListQuerySchema, type CourseSummaryDto, type Paginated } from '@elearning/shared';
import { Public } from '../common/decorators/public.decorator.js';
import { CoursesService } from './courses.service.js';

@Public()
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@Query({ schema: courseListQuerySchema }) query: CourseListQuery): Promise<Paginated<CourseSummaryDto>> {
    return this.courses.listPublished(query);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string): Promise<CourseDetailDto> {
    return this.courses.getPublishedBySlug(slug);
  }
}
