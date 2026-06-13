import {
  Injectable,
  InternalServerErrorException,
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
import { SeedResult } from './interfaces/seed-result.interface';
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

  async runProduction(
    seedSecret: string,
    adminEmail: string,
    adminPassword: string,
  ): Promise<SeedResult> {
    const expectedSecret = process.env.SEED_SECRET;
    if (!expectedSecret || seedSecret !== expectedSecret) {
      throw new InternalServerErrorException('Seed secret invalido');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── BOOTSTRAP: modulos, roles, admin ─
      const bootstrapResult = await this.bootstrap(adminEmail, adminPassword);

      // ── LIMPIEZA DE INVENTARIO ─
      await queryRunner.query('TRUNCATE TABLE order_items CASCADE');
      await queryRunner.query('TRUNCATE TABLE product CASCADE');
      await queryRunner.query('TRUNCATE TABLE category CASCADE');
      await queryRunner.query('TRUNCATE TABLE provider CASCADE');

      // ── INSERCION DE CATEGORIAS ─
      const savedCategories: Category[] = await queryRunner.manager.save(
        Category,
        categoriesData as DeepPartial<Category>[],
      );

      // ── INSERCION DE PROVEEDORES ─
      const savedProviders: Provider[] = await queryRunner.manager.save(
        Provider,
        providersData as DeepPartial<Provider>[],
      );

      // ── INSERCION DE PRODUCTOS ─
      const productsToSeed = buildProductsData(savedCategories, savedProviders);
      await queryRunner.manager.save(Product, productsToSeed);

      await queryRunner.commitTransaction();

      return {
        message: 'Seeder completado exitosamente',
        bootstrap: bootstrapResult,
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
        `Seeder fallo y se revirtio la transaccion: ${message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async bootstrap(
    adminEmail: string,
    adminPassword: string,
  ): Promise<NonNullable<SeedResult['bootstrap']>> {
    // ── MODULOS ─
    const moduleNames = [
      { name: 'users', description: 'Gestion de usuarios' },
      { name: 'roles', description: 'Gestion de roles' },
      { name: 'modules', description: 'Gestion de modulos' },
      { name: 'product', description: 'Gestion de productos' },
      { name: 'category', description: 'Gestion de categorias' },
      { name: 'provider', description: 'Gestion de proveedores' },
      { name: 'orders', description: 'Gestion de pedidos' },
      { name: 'dashboard', description: 'Panel de estadisticas' },
      { name: 'notifications', description: 'Notificaciones' },
    ];

    const savedModules: ModuleEntity[] = [];
    for (const mod of moduleNames) {
      const existing = await this.moduleRepo.findOne({
        where: { name: mod.name },
      });
      if (!existing) {
        savedModules.push(await this.moduleRepo.save(mod));
      } else {
        savedModules.push(existing);
      }
    }

    // ── ROLES ─
    const allModules = await this.moduleRepo.find();
    const adminModules = allModules;
    const staffModules = allModules.filter((m) =>
      ['product', 'category', 'provider', 'orders', 'dashboard', 'notifications'].includes(
        m.name,
      ),
    );
    const userModules = allModules.filter((m) =>
      ['product'].includes(m.name),
    );

    const rolesData = [
      { name: 'ADMIN', description: 'Administrador del sistema', modules: adminModules },
      { name: 'TENDERO', description: 'Tendero', modules: staffModules },
      { name: 'TENDER', description: 'Tender', modules: staffModules },
      { name: 'VENDEDOR', description: 'Vendedor', modules: staffModules },
      { name: 'USER', description: 'Usuario cliente', modules: userModules },
    ];

    const savedRoles: Role[] = [];
    for (const r of rolesData) {
      const existing = await this.roleRepo.findOne({
        where: { name: r.name },
        relations: ['modules'],
      });
      if (!existing) {
        savedRoles.push(await this.roleRepo.save(r));
      } else {
        existing.modules = r.modules;
        savedRoles.push(await this.roleRepo.save(existing));
      }
    }

    // ── ADMIN USER ─
    const adminRole = savedRoles.find((r) => r.name === 'ADMIN');
    let adminCreated = false;
    let existingAdmin = await this.userRepo.findOne({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminUser = this.userRepo.create({
        firstName: 'Admin',
        lastName: 'TuSuper',
        email: adminEmail,
        password: hashedPassword,
        displayName: 'Admin TuSuper',
        isEmailVerified: true,
        roles: adminRole ? [adminRole] : [],
      });
      await this.userRepo.save(adminUser);
      adminCreated = true;
    } else {
      // Update admin role if it exists but doesn't have admin role
      const hasAdminRole = existingAdmin.roles?.some(
        (r) => r.name === 'ADMIN',
      );
      if (!hasAdminRole && adminRole) {
        existingAdmin.roles = [...(existingAdmin.roles || []), adminRole];
        await this.userRepo.save(existingAdmin);
        adminCreated = true;
      }
    }

    return {
      adminEmail,
      adminCreated,
      rolesInserted: savedRoles.length,
      modulesInserted: savedModules.length,
    };
  }

  async run(): Promise<SeedResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── LIMPIEZA (TRUNCATE CASCADE resetea sequences y es mas rapido) ─
      await queryRunner.query('TRUNCATE TABLE order_items CASCADE');
      await queryRunner.query('TRUNCATE TABLE product CASCADE');
      await queryRunner.query('TRUNCATE TABLE category CASCADE');
      await queryRunner.query('TRUNCATE TABLE provider CASCADE');

      // ── INSERCION DE CATEGORIAS ─
      const savedCategories: Category[] = await queryRunner.manager.save(
        Category,
        categoriesData as DeepPartial<Category>[],
      );

      // ── INSERCION DE PROVEEDORES ─
      const savedProviders: Provider[] = await queryRunner.manager.save(
        Provider,
        providersData as DeepPartial<Provider>[],
      );

      // ── INSERCION DE PRODUCTOS ─
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
        `Seeder fallo y se revirtio la transaccion: ${message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
