import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModuleEntity } from './entities/module.entity';
import { In, Repository } from 'typeorm';
import { CreateModuleDto } from './dtos/create-module.dto';
import { UpdateModuleDto } from './dtos/update-module.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(ModuleEntity)
    private readonly moduleRepository: Repository<ModuleEntity>,
  ) {}

  async findByIds(ids: number[]): Promise<ModuleEntity[]> {
    return this.moduleRepository.findBy({ id: In(ids) });
  }

  create(dto: CreateModuleDto): Promise<ModuleEntity> {
    const module = this.moduleRepository.create(dto);
    return this.moduleRepository.save(module);
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<ModuleEntity>> {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await this.moduleRepository.findAndCount({
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async update(id: number, dto: UpdateModuleDto): Promise<ModuleEntity> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }
    Object.assign(module, dto);
    return this.moduleRepository.save(module);
  }

  async remove(id: number): Promise<void> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }
    await this.moduleRepository.remove(module);
  }
}
