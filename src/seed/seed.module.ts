import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../inventory/entities/category.entity';
import { Provider } from '../inventory/entities/provider.entity';
import { Product } from '../inventory/entities/product.entity';
import { Role } from '../roles/entities/role.entity';
import { ModuleEntity } from '../modules/entities/module.entity';
import { User } from '../users/entities/user.entity';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { DevOnlyGuard } from './guards/dev-only.guard';
import { SeedSecretGuard } from './guards/seed-secret.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Provider,
      Product,
      Role,
      ModuleEntity,
      User,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService, DevOnlyGuard, SeedSecretGuard],
})
export class SeedModule {}
