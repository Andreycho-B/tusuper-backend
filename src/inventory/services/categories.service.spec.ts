import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from '../entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepo: Repository<Category>;

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
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: { ...mockRepository },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoryRepo = module.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should call findAndCount with search parameters if provided', async () => {
      jest.spyOn(categoryRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll({ limit: 10, offset: 0, search: 'lacteos' });

      expect(categoryRepo.findAndCount).toHaveBeenCalledWith({
        where: [
          { isActive: true, name: ILike('%lacteos%') },
          { isActive: true, description: ILike('%lacteos%') },
        ],
        relations: ['products'],
        take: 10,
        skip: 0,
      });
    });

    it('should call findAndCount with standard where if search is not provided', async () => {
      jest.spyOn(categoryRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll({ limit: 10, offset: 0 });

      expect(categoryRepo.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['products'],
        take: 10,
        skip: 0,
      });
    });
  });
});
