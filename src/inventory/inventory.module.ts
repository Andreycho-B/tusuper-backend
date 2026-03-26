import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Provider } from './entities/provider.entity';
import { Product } from './entities/product.entity';
import { CategoriesService } from './services/categories.service';
import { ProvidersService } from './services/providers.service';
import { ProductsService } from './services/products.service';
import { CategoriesController } from './controllers/categories.controller';
import { ProvidersController } from './controllers/providers.controller';
import { ProductsController } from './controllers/products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Provider, Product])],
  controllers: [CategoriesController, ProvidersController, ProductsController],
  providers: [CategoriesService, ProvidersService, ProductsService],
  exports: [CategoriesService, ProvidersService, ProductsService],
})
export class InventoryModule {}
