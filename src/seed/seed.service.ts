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
    // Limpiar modulos obsoletos
    await this.moduleRepo.delete({ name: 'dashboard' as never });
    await this.moduleRepo.delete({ name: 'notifications' as never });
    await this.moduleRepo.delete({ name: 'roles' as never });
    await this.moduleRepo.delete({ name: 'modules' as never });

    // ── MODULOS ─
    const moduleNames = [
      { name: 'users', description: 'Gestion de usuarios' },
      { name: 'product', description: 'Gestion de productos' },
      { name: 'category', description: 'Gestion de categorias' },
      { name: 'provider', description: 'Gestion de proveedores' },
      { name: 'orders', description: 'Gestion de pedidos' },
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
      ['product', 'category', 'provider', 'orders'].includes(
        m.name,
      ),
    );
    const userModules = allModules.filter((m) =>
      ['product', 'orders'].includes(m.name),
    );

    const rolesData = [
      { name: 'ADMIN', description: 'Administrador del sistema', modules: adminModules },
      { name: 'TENDERO', description: 'Tendero', modules: staffModules },
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

  /**
   * Updates imageUrl for products that already exist (by name).
   * Safe to run in production — only touches imageUrl column.
   */
  async updateProductImages(): Promise<SeedResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productsData = buildProductsData(
        await this.categoryRepo.find(),
        await this.providerRepo.find(),
      );

      let updated = 0;
      let skipped = 0;

      for (const prodData of productsData) {
        if (!prodData.name || !prodData.imageUrl) {
          skipped++;
          continue;
        }

        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(Product)
          .set({ imageUrl: prodData.imageUrl as string })
          .where('name = :name', { name: prodData.name })
          .execute();

        if (result.affected && result.affected > 0) {
          updated++;
        } else {
          skipped++;
        }
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Product images actualizados',
        categoriesInserted: 0,
        providersInserted: 0,
        productsInserted: updated,
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const message =
        error instanceof Error
          ? error.message
          : 'Error actualizando imagenes de productos';
      throw new InternalServerErrorException(
        `Update imagenes fallo: ${message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Safe upsert: adds missing categories, providers, and products
   * without deleting existing data. Skips items that already exist (by name).
   */
  async upsertInventory(): Promise<SeedResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let categoriesInserted = 0;
      let providersInserted = 0;
      let productsInserted = 0;

      // ── UPSERT CATEGORIES (skip existing by name) ──
      const savedCategories: Category[] = [];
      for (const catData of categoriesData) {
        let existing = await queryRunner.manager.findOne(Category, {
          where: { name: catData.name },
        });
        if (!existing) {
          existing = await queryRunner.manager.save(Category, catData as DeepPartial<Category>);
          categoriesInserted++;
        }
        savedCategories.push(existing);
      }

      // ── UPSERT PROVIDERS (skip existing by name) ──
      const savedProviders: Provider[] = [];
      for (const provData of providersData) {
        let existing = await queryRunner.manager.findOne(Provider, {
          where: { name: provData.name },
        });
        if (!existing) {
          existing = await queryRunner.manager.save(Provider, provData as DeepPartial<Provider>);
          providersInserted++;
        }
        savedProviders.push(existing);
      }

      // ── UPSERT PRODUCTS (skip existing by name) ──
      const productsToSeed = buildProductsData(savedCategories, savedProviders);
      for (const prodData of productsToSeed) {
        const existing = await queryRunner.manager.findOne(Product, {
          where: { name: prodData.name! },
        });
        if (!existing) {
          await queryRunner.manager.save(Product, prodData);
          productsInserted++;
        }
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Upsert completado - sin borrar datos existentes',
        categoriesInserted,
        providersInserted,
        productsInserted,
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido en el upsert';
      throw new InternalServerErrorException(
        `Upsert fallo y se revirtio la transaccion: ${message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
