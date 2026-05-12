import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProductsService } from '../services/products.service';
import { CreateProductDto, UpdateProductDto } from '../dtos/product.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ModulesGuard } from '../../auth/guards/modules.guard.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Modules } from '../../auth/decorators/modules.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Product } from '../entities/product.entity';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@ApiTags('Inventory - Products')
@Controller('inventory/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ── PUBLIC ENDPOINTS (no auth required) ────────────────────────────

  @Throttle({ default: { limit: 1000, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'Get all products (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of products',
    type: [Product],
  })
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResult<Product>> {
    return this.productsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (public)' })
  @ApiResponse({ status: 200, description: 'Product found', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.findOne(id);
  }

  // ── PROTECTED ENDPOINTS (TENDERO / ADMIN only) ─────────────────────

  @Post()
  @ApiBearerAuth()
  @Modules('inventory')
  @Roles('TENDERO', 'ADMIN')
  @UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: Product,
  })
  async create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Modules('inventory')
  @Roles('TENDERO', 'ADMIN')
  @UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: Product,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Modules('inventory')
  @Roles('TENDERO', 'ADMIN')
  @UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a product by ID' })
  @ApiResponse({ status: 204, description: 'Product deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.remove(id);
  }
}
