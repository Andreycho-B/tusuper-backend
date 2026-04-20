import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos/category.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) { }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Category>> {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await this.categoryRepo.findAndCount({
      relations: ['products'],
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepo.create(createCategoryDto);
    return this.categoryRepo.save(category);
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);
    this.categoryRepo.merge(category, updateCategoryDto);
    return this.categoryRepo.save(category);
  }

  async remove(id: number): Promise<Category> {
    const category = await this.findOne(id);
    category.isActive = false;
    return this.categoryRepo.save(category);
  }
}
