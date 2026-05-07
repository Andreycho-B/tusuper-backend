import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { CreateProviderDto, UpdateProviderDto } from '../dtos/provider.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Provider>> {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await this.providerRepo.findAndCount({
      relations: ['products'],
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOne(id: number): Promise<Provider> {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!provider) {
      throw new NotFoundException(`Provider #${id} not found`);
    }
    return provider;
  }

  async create(createProviderDto: CreateProviderDto): Promise<Provider> {
    const provider = this.providerRepo.create(createProviderDto);
    return this.providerRepo.save(provider);
  }

  async update(
    id: number,
    updateProviderDto: UpdateProviderDto,
  ): Promise<Provider> {
    const provider = await this.findOne(id);
    this.providerRepo.merge(provider, updateProviderDto);
    return this.providerRepo.save(provider);
  }

  async remove(id: number): Promise<Provider> {
    const provider = await this.findOne(id);
    provider.isActive = false;
    return this.providerRepo.save(provider);
  }
}
