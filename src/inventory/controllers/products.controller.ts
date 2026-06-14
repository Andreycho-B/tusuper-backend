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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProductsService } from '../services/products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from '../dtos/product.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ModulesGuard } from '../../auth/guards/modules.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Modules } from '../../auth/decorators/modules.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Product } from '../entities/product.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import {
  imageUploadOptions,
  PRODUCT_IMAGE_MAX_SIZE_BYTES,
} from '../../common/upload/image-upload-options';

@ApiTags('Inventory - Products')
@Controller('inventory/products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.productsService.findAll(query);
  }

  @Get('barcode/:code')
  @ApiOperation({ summary: 'Get product by barcode (public)' })
  @ApiResponse({ status: 200, description: 'Product found', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByBarcode(@Param('code') code: string): Promise<Product> {
    return this.productsService.findByBarcode(code);
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
  @Modules('product')
  @Roles('ADMIN', 'TENDERO')
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
  @Modules('product')
  @Roles('ADMIN', 'TENDERO')
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

  @Patch(':id/image')
  @ApiBearerAuth()
  @Modules('product')
  @Roles('ADMIN', 'TENDERO')
  @UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
  @UseInterceptors(
    FileInterceptor('image', imageUploadOptions(PRODUCT_IMAGE_MAX_SIZE_BYTES)),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product image to Cloudinary' })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded and product updated successfully',
    type: Product,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or input' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Product> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const result = await this.cloudinaryService.uploadImage(file);
    return this.productsService.update(id, { imageUrl: result.secure_url });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Modules('product')
  @Roles('ADMIN', 'TENDERO')
  @UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a product by ID' })
  @ApiResponse({ status: 204, description: 'Product deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.remove(id);
  }
}
