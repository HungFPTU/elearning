import { Controller, Get } from '@nestjs/common';
import type { MeDto } from '@elearning/shared';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    return this.users.getMe(user.id);
  }
}
