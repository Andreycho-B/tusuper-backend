import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, FindOptionsWhere } from 'typeorm';
import { Product } from '../entities/product.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from '../dtos/product.dto';
import { Category } from '../entities/category.entity';
import { Provider } from '../entities/provider.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const { limit = 10, offset = 0, search, categoryId } = query;

    const baseWhere: FindOptionsWhere<Product> = {
      isActive: true,
      category: { isActive: true },
      provider: { isActive: true },
    };

    if (categoryId) {
      baseWhere.category = {
        isActive: true,
        id: categoryId,
      };
    }

    let where: FindOptionsWhere<Product> | FindOptionsWhere<Product>[] =
      baseWhere;

    if (search) {
      where = [
        {
          ...baseWhere,
          name: ILike(`%${search}%`),
        },
        {
          ...baseWhere,
          description: ILike(`%${search}%`),
        },
      ];
    }

    const [data, total] = await this.productRepo.findAndCount({
      where,
      relations: ['category', 'provider'],
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOne(id: number, onlyActive: boolean = true): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: {
        id,
        ...(onlyActive
          ? {
              isActive: true,
              category: { isActive: true },
              provider: { isActive: true },
            }
          : {}),
      },
      relations: ['category', 'provider'],
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async findByBarcode(
    barcode: string,
    onlyActive: boolean = true,
  ): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: {
        barcode,
        ...(onlyActive
          ? {
              isActive: true,
              category: { isActive: true },
              provider: { isActive: true },
            }
          : {}),
      },
      relations: ['category', 'provider'],
    });
    if (!product) {
      throw new NotFoundException(`Product with barcode #${barcode} not found`);
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
    const product = await this.findOne(id, false);
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

  async decreaseStock(id: number, quantity: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(`Product #${id} not found`);
      }

      if (product.stock < quantity) {
        throw new InternalServerErrorException(
          `Insufficient stock for Product #${id}`,
        );
      }

      product.stock -= quantity;
      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number): Promise<Product> {
    const product = await this.findOne(id, false);
    product.isActive = false;
    return this.productRepo.save(product);
  }
}
