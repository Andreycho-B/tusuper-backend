import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'tusuper-api' };
  }
}
