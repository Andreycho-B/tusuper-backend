import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Provider } from '../entities/provider.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: Repository<Product>;

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
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                findOne: jest.fn(),
                save: jest.fn(),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepo = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByBarcode', () => {
    it('should return a product if found', async () => {
      const mockProduct = { id: 1, name: 'Test Product', barcode: '123456' };
      jest.spyOn(productRepo, 'findOne').mockResolvedValue(mockProduct as any);

      const result = await service.findByBarcode('123456');
      expect(result).toEqual(mockProduct);
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          barcode: '123456',
          isActive: true,
          category: { isActive: true },
          provider: { isActive: true },
        },
        relations: ['category', 'provider'],
      });
    });

    it('should throw NotFoundException if product is not found', async () => {
      jest.spyOn(productRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findByBarcode('123456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
