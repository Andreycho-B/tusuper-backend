import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Category } from '../inventory/entities/category.entity';
import { Provider } from '../inventory/entities/provider.entity';
import { Product } from '../inventory/entities/product.entity';
import { Role } from '../roles/entities/role.entity';
import { ModuleEntity } from '../modules/entities/module.entity';
import { User } from '../users/entities/user.entity';
import {
  BootstrapResult,
  ProductionSeedResult,
  SeedResult,
} from './interfaces/seed-result.interface';
import { categoriesData } from './data/categories.data';
import { providersData } from './data/providers.data';
import { buildProductsData } from './data/products.data';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async bootstrapSystem(): Promise<BootstrapResult> {
    const modulesData = [
      { name: 'users', description: 'Gestión de Usuarios' },
      { name: 'roles', description: 'Gestión de Roles' },
      { name: 'modules', description: 'Gestión de Módulos' },
      { name: 'product', description: 'Gestión de Productos' },
      { name: 'category', description: 'Gestión de Categorías' },
      { name: 'provider', description: 'Gestión de Proveedores' },
      { name: 'orders', description: 'Gestión de Pedidos' },
    ];

    const seededModules: Record<string, ModuleEntity> = {};
    for (const item of modulesData) {
      let moduleEntity = await this.moduleRepo.findOne({
        where: { name: item.name },
      });
      if (!moduleEntity) {
        moduleEntity = this.moduleRepo.create(item);
        await this.moduleRepo.save(moduleEntity);
      }
      seededModules[item.name] = moduleEntity;
    }

    const rolesData = [
      { name: 'USER', description: 'Usuario final / cliente' },
      { name: 'ADMIN', description: 'Administrador del sistema' },
      { name: 'TENDERO', description: 'Tendero / Vendedor' },
      { name: 'TENDER', description: 'Tendero (alias)' },
      { name: 'VENDEDOR', description: 'Vendedor de tienda' },
    ];

    const seededRoles: Record<string, Role> = {};
    for (const item of rolesData) {
      let roleEntity = await this.roleRepo.findOne({ where: { name: item.name } });
      if (!roleEntity) {
        roleEntity = this.roleRepo.create(item);
        await this.roleRepo.save(roleEntity);
      }
      seededRoles[item.name] = roleEntity;
    }

    seededRoles['ADMIN'].modules = Object.values(seededModules);
    await this.roleRepo.save(seededRoles['ADMIN']);

    const staffModules = [
      seededModules['product'],
      seededModules['category'],
      seededModules['provider'],
      seededModules['orders'],
      seededModules['users'],
      seededModules['roles'],
    ];

    for (const roleName of ['TENDERO', 'TENDER', 'VENDEDOR']) {
      seededRoles[roleName].modules = staffModules;
      await this.roleRepo.save(seededRoles[roleName]);
    }

    seededRoles['USER'].modules = [
      seededModules['product'],
      seededModules['category'],
      seededModules['orders'],
    ];
    await this.roleRepo.save(seededRoles['USER']);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tusuper.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new BadRequestException(
        'ADMIN_PASSWORD es obligatorio para crear el usuario administrador',
      );
    }

    let adminCreated = false;
    let adminUser = await this.userRepo.findOne({
      where: { email: adminEmail },
      relations: { roles: true },
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      adminUser = this.userRepo.create({
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.ADMIN_LAST_NAME || 'TuSuper',
        email: adminEmail,
        password: hashedPassword,
        isActive: true,
        roles: [seededRoles['ADMIN']],
      });
      await this.userRepo.save(adminUser);
      adminCreated = true;
    } else if (!adminUser.roles.some((r) => r.name === 'ADMIN')) {
      adminUser.roles = [...adminUser.roles, seededRoles['ADMIN']];
      await this.userRepo.save(adminUser);
    }

    return {
      message: 'Bootstrap de sistema completado',
      modulesReady: Object.keys(seededModules).length,
      rolesReady: Object.keys(seededRoles).length,
      adminEmail,
      adminCreated,
    };
  }

  async run(): Promise<SeedResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('DELETE FROM order_items');
      await queryRunner.query('DELETE FROM product');
      await queryRunner.query('DELETE FROM category');
      await queryRunner.query('DELETE FROM provider');

      const savedCategories: Category[] = await queryRunner.manager.save(
        Category,
        categoriesData as DeepPartial<Category>[],
      );

      const savedProviders: Provider[] = await queryRunner.manager.save(
        Provider,
        providersData as DeepPartial<Provider>[],
      );

      const productsToSeed = buildProductsData(savedCategories, savedProviders);
      await queryRunner.manager.save(Product, productsToSeed);

      await queryRunner.commitTransaction();

      return {
        message: 'Seeder completado exitosamente',
        categoriesInserted: savedCategories.length,
        providersInserted: savedProviders.length,
        productsInserted: productsToSeed.length,
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido en el seeder';
      throw new InternalServerErrorException(
        `Seeder falló y se revirtió la transacción: ${message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async runProduction(): Promise<ProductionSeedResult> {
    const bootstrap = await this.bootstrapSystem();
    const inventory = await this.run();
    return { bootstrap, inventory };
  }
}
