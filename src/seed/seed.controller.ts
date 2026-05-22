import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import {
  BootstrapResult,
  ProductionSeedResult,
  SeedResult,
} from './interfaces/seed-result.interface';
import { DevOnlyGuard } from './guards/dev-only.guard';
import { SeedSecretGuard } from './guards/seed-secret.guard';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @UseGuards(DevOnlyGuard)
  @ApiOperation({
    summary: 'Poblar inventario (solo desarrollo)',
    description:
      'Borra y recrea categorías, proveedores y productos. No usar en producción.',
  })
  @ApiResponse({ status: 200, description: 'Seed completado' })
  runInventoryDev(): Promise<SeedResult> {
    return this.seedService.run();
  }

  @Post('bootstrap')
  @UseGuards(SeedSecretGuard)
  @ApiHeader({ name: 'x-seed-secret', required: true })
  @ApiOperation({
    summary: 'Bootstrap de módulos, roles y admin (producción)',
    description:
      'Crea módulos, roles y usuario admin si no existen. Requiere SEED_SECRET.',
  })
  bootstrap(): Promise<BootstrapResult> {
    return this.seedService.bootstrapSystem();
  }

  @Post('production')
  @UseGuards(SeedSecretGuard)
  @ApiHeader({ name: 'x-seed-secret', required: true })
  @ApiOperation({
    summary: 'Carga completa para producción',
    description:
      'Ejecuta bootstrap (módulos, roles, admin) + inventario real. Requiere SEED_SECRET y ADMIN_PASSWORD.',
  })
  runProduction(): Promise<ProductionSeedResult> {
    return this.seedService.runProduction();
  }
}
