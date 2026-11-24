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
import { ReqContext, type RequestContext } from '../common/decorators/request-context.decorator.js';
import { AuthService } from './auth.service.js';

@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body({ schema: registerSchema }) body: RegisterInput, @ReqContext() ctx: RequestContext): Promise<AuthResponse> {
    return this.auth.register(body, ctx);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body({ schema: loginSchema }) body: LoginInput, @ReqContext() ctx: RequestContext): Promise<AuthResponse> {
    return this.auth.login(body, ctx);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body({ schema: refreshSchema }) body: RefreshInput, @ReqContext() ctx: RequestContext): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken, ctx);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body({ schema: refreshSchema }) body: RefreshInput, @ReqContext() ctx: RequestContext): Promise<void> {
    return this.auth.logout(body.refreshToken, ctx);
  }
}
