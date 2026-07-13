import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModuleEntity } from './entities/module.entity';
import { CreateModuleDto } from './dtos/create-module.dto';
import { UpdateModuleDto } from './dtos/update-module.dto';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ModulesService', () => {
  let service: ModulesService;
  let repo: Repository<ModuleEntity>;

  const mockRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    findBy: vi.fn(),
    findAndCount: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulesService,
        {
          provide: getRepositoryToken(ModuleEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ModulesService>(ModulesService);
    repo = module.get<Repository<ModuleEntity>>(
      getRepositoryToken(ModuleEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByIds', () => {
    it('should return modules matching the given ids', async () => {
      const modules = [
        { id: 1, name: 'users' },
        { id: 2, name: 'products' },
      ];
      mockRepository.findBy.mockResolvedValue(modules);

      const result = await service.findByIds([1, 2]);
      expect(result).toEqual(modules);
      expect(mockRepository.findBy).toHaveBeenCalledWith({
        id: expect.anything(),
      });
    });
  });

  describe('create', () => {
    it('should create and return a new module', async () => {
      const dto: CreateModuleDto = {
        name: 'reports',
        description: 'Reports module',
      };
      const created = { id: 1, ...dto };
      mockRepository.create.mockReturnValue(created);
      mockRepository.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(created);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const data = [{ id: 1, name: 'users' }];
      mockRepository.findAndCount.mockResolvedValue([data, 1]);

      const result = await service.findAll({ limit: 10, offset: 0 });
      expect(result).toEqual({ data, total: 1, limit: 10, offset: 0 });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
      });
    });
  });

  describe('update', () => {
    it('should update an existing module', async () => {
      const existing = { id: 1, name: 'users', description: 'Old desc' };
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue({
        ...existing,
        description: 'New desc',
      });

      const dto: UpdateModuleDto = { description: 'New desc' };
      const result = await service.update(1, dto);
      expect(result.description).toBe('New desc');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if module does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.update(999, {} as UpdateModuleDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an existing module', async () => {
      const existing = { id: 1, name: 'users' };
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.remove.mockResolvedValue(existing);

      await service.remove(1);
      expect(mockRepository.remove).toHaveBeenCalledWith(existing);
    });

    it('should throw NotFoundException if module does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
