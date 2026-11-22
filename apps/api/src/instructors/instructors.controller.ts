import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import {
  type AdminInstructorApplicationDto,
  type ApplicationListQuery,
  type ApproveApplicationInput,
  type InstructorApplicationDto,
  type Paginated,
  type RejectApplicationInput,
  type SetUserSubjectsInput,
  type SubmitApplicationInput,
  type TeachingSubjectDto,
  applicationListQuerySchema,
  approveApplicationSchema,
  rejectApplicationSchema,
  setUserSubjectsSchema,
  submitApplicationSchema,
} from '@elearning/shared';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReqContext, type RequestContext } from '../common/decorators/request-context.decorator.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { InstructorsService } from './instructors.service.js';

/** The signed-in user's own applications and teaching subjects. */
@Controller('me')
export class MyInstructorController {
  constructor(private readonly instructors: InstructorsService) {}

  @Get('instructor-applications')
  myApplications(@CurrentUser() user: AuthUser): Promise<InstructorApplicationDto[]> {
    return this.instructors.myApplications(user.id);
  }

  @Post('instructor-applications')
  @RequirePermission('instructor_application.submit')
  submit(
    @CurrentUser() user: AuthUser,
    @Body({ schema: submitApplicationSchema }) body: SubmitApplicationInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<InstructorApplicationDto> {
    return this.instructors.submit(user, body, ctx);
  }

  @Get('teaching-subjects')
  teachingSubjects(@CurrentUser() user: AuthUser): Promise<TeachingSubjectDto[]> {
    return this.instructors.teachingSubjects(user.id);
  }
}

@RequirePermission('admin.access', 'instructor_application.review')
@Controller('admin')
export class AdminInstructorsController {
  constructor(private readonly instructors: InstructorsService) {}

  @Get('instructor-applications')
  list(@Query({ schema: applicationListQuerySchema }) query: ApplicationListQuery): Promise<Paginated<AdminInstructorApplicationDto>> {
    return this.instructors.list(query);
  }

  @Get('instructor-applications/:id')
  get(@Param('id') id: string): Promise<AdminInstructorApplicationDto> {
    return this.instructors.get(id);
  }

  @Post('instructor-applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: approveApplicationSchema }) body: ApproveApplicationInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminInstructorApplicationDto> {
    return this.instructors.approve(actor, id, body, ctx);
  }

  @Post('instructor-applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: rejectApplicationSchema }) body: RejectApplicationInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminInstructorApplicationDto> {
    return this.instructors.reject(actor, id, body, ctx);
  }

  @Put('users/:id/subjects')
  async setUserSubjects(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: setUserSubjectsSchema }) body: SetUserSubjectsInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<TeachingSubjectDto[]> {
    await this.instructors.setUserSubjects(actor, id, body.subjectIds, ctx);
    return this.instructors.teachingSubjects(id);
  }
}
