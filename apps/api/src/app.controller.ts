import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';

@Public()
@Controller('health')
export class AppController {
  @Get()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
