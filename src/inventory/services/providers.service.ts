import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
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
    const { limit = 10, offset = 0, search } = pagination;

    let where: FindOptionsWhere<Provider> | FindOptionsWhere<Provider>[] = {
      isActive: true,
    };

    if (search) {
      where = [
        { isActive: true, name: ILike(`%${search}%`) },
        { isActive: true, email: ILike(`%${search}%`) },
      ];
    }

    const [data, total] = await this.providerRepo.findAndCount({
      where,
      relations: ['products'],
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOne(id: number, onlyActive: boolean = true): Promise<Provider> {
    const provider = await this.providerRepo.findOne({
      where: { id, ...(onlyActive ? { isActive: true } : {}) },
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
    const provider = await this.findOne(id, false);
    this.providerRepo.merge(provider, updateProviderDto);
    return this.providerRepo.save(provider);
  }

  async remove(id: number): Promise<Provider> {
    const provider = await this.findOne(id, false);
    provider.isActive = false;
    return this.providerRepo.save(provider);
  }
}
