import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type AuthResponse,
  type AuthTokens,
  type LoginInput,
  loginSchema,
  type RefreshInput,
  refreshSchema,
  type RegisterInput,
  registerSchema,
} from '@elearning/shared';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';

@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body({ schema: registerSchema }) body: RegisterInput): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body({ schema: loginSchema }) body: LoginInput): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body({ schema: refreshSchema }) body: RefreshInput): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body({ schema: refreshSchema }) body: RefreshInput): Promise<void> {
    return this.auth.logout(body.refreshToken);
  }
}
