import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from '../dtos/product.dto';
import { Category } from '../entities/category.entity';
import { Provider } from '../entities/provider.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productRepo.find({
      relations: ['category', 'provider'],
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'provider'],
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, providerId, ...productData } = createProductDto;

    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category #${categoryId} not found`);
    }

    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException(`Provider #${providerId} not found`);
    }

    const product = this.productRepo.create({
      ...productData,
      category,
      provider,
    });
    return this.productRepo.save(product);
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    const { categoryId, providerId, ...productData } = updateProductDto;

    if (categoryId !== undefined) {
      const category = await this.categoryRepo.findOne({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category #${categoryId} not found`);
      }
      product.category = category;
    }

    if (providerId !== undefined) {
      const provider = await this.providerRepo.findOne({
        where: { id: providerId },
      });
      if (!provider) {
        throw new NotFoundException(`Provider #${providerId} not found`);
      }
      product.provider = provider;
    }

    this.productRepo.merge(product, productData);
    return this.productRepo.save(product);
  }

  async remove(id: number): Promise<Product> {
    const product = await this.findOne(id);
    return this.productRepo.remove(product);
  }
}
