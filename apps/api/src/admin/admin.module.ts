import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminRolesService } from './admin-roles.service.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminUsersService, AdminRolesService],
})
export class AdminModule {}
