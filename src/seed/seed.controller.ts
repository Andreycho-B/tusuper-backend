import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { SeedResult } from './interfaces/seed-result.interface';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Seed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @ApiOperation({
    summary: 'Populate database with seed data (ADMIN only, never in prod)',
    description:
      'Clears and repopulates categories, providers and products. ' +
      'Also clears order_items to satisfy FK constraints. ' +
      'Refuses to run when NODE_ENV is "prod". Requires ADMIN role.',
  })
  @ApiResponse({ status: 200, description: 'Seed completed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not ADMIN, or environment is production',
  })
  @ApiResponse({
    status: 500,
    description: 'Seed failed — transaction rolled back',
  })
  run(): Promise<SeedResult> {
    if (process.env.NODE_ENV === 'prod') {
      throw new ForbiddenException(
        'Seed endpoint is disabled in production environment',
      );
    }
    return this.seedService.run();
  }
}
