import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../inventory/entities/category.entity';
import { Provider } from '../inventory/entities/provider.entity';
import { Product } from '../inventory/entities/product.entity';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Provider, Product])],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
