import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
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
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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

  @Post('production')
  @ApiOperation({
    summary: 'Production seed with secret key',
    description:
      'Bootstraps modules, roles, admin user, and inventory data. ' +
      'Requires x-seed-secret header. ADMIN_EMAIL and ADMIN_PASSWORD in body.',
  })
  @ApiResponse({ status: 200, description: 'Production seed completed' })
  @ApiResponse({ status: 401, description: 'Invalid seed secret' })
  @ApiResponse({
    status: 500,
    description: 'Seed failed — transaction rolled back',
  })
  async runProduction(
    @Headers('x-seed-secret') seedSecret: string,
    @Body() body: { adminEmail: string; adminPassword: string },
  ): Promise<SeedResult> {
    return this.seedService.runProduction(
      seedSecret,
      body.adminEmail,
      body.adminPassword,
    );
  }

  @Post('upsert')
  @ApiOperation({
    summary: 'Safe upsert: adds missing data without deleting existing',
    description:
      'Inserts categories, providers, and products that do not already exist (by name). ' +
      'Safe to run in production — never truncates. Requires x-seed-secret header.',
  })
  @ApiResponse({ status: 200, description: 'Upsert completed' })
  @ApiResponse({ status: 401, description: 'Invalid seed secret' })
  async upsertInventory(
    @Headers('x-seed-secret') seedSecret: string,
  ): Promise<SeedResult> {
    const expectedSecret = process.env.SEED_SECRET;
    if (!expectedSecret || seedSecret !== expectedSecret) {
      throw new ForbiddenException('Seed secret invalido');
    }
    return this.seedService.upsertInventory();
  }
}
