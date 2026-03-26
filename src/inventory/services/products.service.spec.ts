import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Provider } from '../entities/provider.entity';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: { ...mockRepository },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: { ...mockRepository },
        },
        {
          provide: getRepositoryToken(Provider),
          useValue: { ...mockRepository },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
