import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { SeedResult } from './interfaces/seed-result.interface';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @ApiOperation({
    summary: 'Populate database with seed data (DEV ONLY)',
    description:
      'Clears and repopulates categories, providers and products. ' +
      'Also clears order_items to satisfy FK constraints. ' +
      'DO NOT execute in staging or production environments.',
  })
  @ApiResponse({ status: 200, description: 'Seed completed successfully' })
  @ApiResponse({
    status: 500,
    description: 'Seed failed — transaction rolled back',
  })
  run(): Promise<SeedResult> {
    return this.seedService.run();
  }
}
