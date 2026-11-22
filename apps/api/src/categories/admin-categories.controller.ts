import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  type AdminCategoryDto,
  type CategoryInput,
  type SubjectInput,
  categoryInputSchema,
  subjectInputSchema,
} from '@elearning/shared';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReqContext, type RequestContext } from '../common/decorators/request-context.decorator.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { AdminCategoriesService } from './admin-categories.service.js';

/** Every write returns the whole tree so the admin page re-renders from one response. */
@RequirePermission('admin.access', 'category.manage')
@Controller('admin')
export class AdminCategoriesController {
  constructor(private readonly categories: AdminCategoriesService) {}

  @Get('categories')
  list(): Promise<AdminCategoryDto[]> {
    return this.categories.list();
  }

  @Post('categories')
  async create(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: categoryInputSchema }) body: CategoryInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminCategoryDto[]> {
    await this.categories.createCategory(actor, body, ctx);
    return this.categories.list();
  }

  @Patch('categories/:id')
  async update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: categoryInputSchema }) body: CategoryInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminCategoryDto[]> {
    await this.categories.updateCategory(actor, id, body, ctx);
    return this.categories.list();
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminCategoryDto[]> {
    await this.categories.deleteCategory(actor, id, ctx);
    return this.categories.list();
  }

  @Post('categories/:id/subjects')
  async createSubject(
    @CurrentUser() actor: AuthUser,
    @Param('id') categoryId: string,
    @Body({ schema: subjectInputSchema }) body: SubjectInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminCategoryDto[]> {
    await this.categories.createSubject(actor, categoryId, body, ctx);
    return this.categories.list();
  }

  @Patch('subjects/:id')
  async updateSubject(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: subjectInputSchema }) body: SubjectInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminCategoryDto[]> {
    await this.categories.updateSubject(actor, id, body, ctx);
    return this.categories.list();
  }

  @Delete('subjects/:id')
  @HttpCode(HttpStatus.OK)
  async removeSubject(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminCategoryDto[]> {
    await this.categories.deleteSubject(actor, id, ctx);
    return this.categories.list();
  }
}
