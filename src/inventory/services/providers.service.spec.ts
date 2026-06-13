import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ProvidersService } from './providers.service';
import { Provider } from '../entities/provider.entity';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let providerRepo: Repository<Provider>;

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        {
          provide: getRepositoryToken(Provider),
          useValue: { ...mockRepository },
        },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    providerRepo = module.get<Repository<Provider>>(
      getRepositoryToken(Provider),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should call findAndCount with search parameters if provided (name and email)', async () => {
      jest.spyOn(providerRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll({ limit: 10, offset: 0, search: 'nestle' });

      expect(providerRepo.findAndCount).toHaveBeenCalledWith({
        where: [
          { isActive: true, name: ILike('%nestle%') },
          { isActive: true, email: ILike('%nestle%') },
        ],
        relations: ['products'],
        take: 10,
        skip: 0,
      });
    });

    it('should call findAndCount with standard where if search is not provided', async () => {
      jest.spyOn(providerRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll({ limit: 10, offset: 0 });

      expect(providerRepo.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['products'],
        take: 10,
        skip: 0,
      });
    });
  });
});
