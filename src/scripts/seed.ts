import { AppDataSource } from '../database/data-source';
import { Role } from '../roles/entities/role.entity';
import { ModuleEntity } from '../modules/entities/module.entity';
import { Category } from '../inventory/entities/category.entity';
import { Provider } from '../inventory/entities/provider.entity';
import { Product } from '../inventory/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { categoriesData } from '../seed/data/categories.data';
import { providersData } from '../seed/data/providers.data';
import { buildProductsData } from '../seed/data/products.data';
import * as bcrypt from 'bcrypt';

async function seed() {
  // ── PROTECCIÓN: No ejecutar en producción ────────────────────────────
  if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: Seed script is disabled in production environment');
    console.error('   NODE_ENV:', process.env.NODE_ENV);
    process.exit(1);
  }

  console.log('🔌 Initializing database connection...');
  await AppDataSource.initialize();
  console.log('✅ Database connection initialized successfully.\n');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // ── LIMPIEZA COMPLETA (TRUNCATE CASCADE) ─────────────────────────
    console.log('🧹 Cleaning existing data (TRUNCATE CASCADE)...');
    await queryRunner.query('TRUNCATE TABLE order_items CASCADE');
    await queryRunner.query('TRUNCATE TABLE product CASCADE');
    await queryRunner.query('TRUNCATE TABLE category CASCADE');
    await queryRunner.query('TRUNCATE TABLE provider CASCADE');
    await queryRunner.query('TRUNCATE TABLE user_roles CASCADE');
    await queryRunner.query('TRUNCATE TABLE users CASCADE');
    await queryRunner.query('TRUNCATE TABLE role_modules CASCADE');
    await queryRunner.query('TRUNCATE TABLE role CASCADE');
    await queryRunner.query('TRUNCATE TABLE modules CASCADE');
    console.log('✅ All tables truncated.\n');

    // ── 1. SEED MODULES ──────────────────────────────────────────────
    console.log('📦 Seeding modules...');
    const moduleRepo = AppDataSource.getRepository(ModuleEntity);
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
      const moduleEntity = moduleRepo.create(item);
      await moduleRepo.save(moduleEntity);
      seededModules[item.name] = moduleEntity;
      console.log(`   ✓ Module "${item.name}" created (id: ${moduleEntity.id})`);
    }

    // ── 2. SEED ROLES ─────────────────────────────────────────────────
    console.log('\n👥 Seeding roles...');
    const roleRepo = AppDataSource.getRepository(Role);
    const rolesData = [
      { name: 'USER', description: 'Usuario final / cliente' },
      { name: 'ADMIN', description: 'Administrador del sistema' },
      { name: 'TENDERO', description: 'Tendero / Vendedor' },
    ];

    const seededRoles: Record<string, Role> = {};
    for (const item of rolesData) {
      const roleEntity = roleRepo.create(item);
      await roleRepo.save(roleEntity);
      seededRoles[item.name] = roleEntity;
      console.log(`   ✓ Role "${item.name}" created (id: ${roleEntity.id})`);
    }

    // ── 3. LINK ROLES AND MODULES ─────────────────────────────────────
    console.log('\n🔗 Linking roles and modules...');
    
    seededRoles['ADMIN'].modules = Object.values(seededModules);
    await roleRepo.save(seededRoles['ADMIN']);
    console.log('   ✓ Linked all modules to ADMIN');

    seededRoles['USER'].modules = [
      seededModules['product'],
      seededModules['category'],
      seededModules['orders'],
    ];
    await roleRepo.save(seededRoles['USER']);
    console.log('   ✓ Linked product, category, orders to USER');

    seededRoles['TENDERO'].modules = [
      seededModules['product'],
      seededModules['category'],
      seededModules['provider'],
      seededModules['orders'],
    ];
    await roleRepo.save(seededRoles['TENDERO']);
    console.log('   ✓ Linked product, category, provider, orders to TENDERO');

    // ── 4. SEED CATEGORIES ────────────────────────────────────────────
    console.log('\n🏷️  Seeding categories...');
    const categoryRepo = AppDataSource.getRepository(Category);
    const savedCategories = await categoryRepo.save(categoriesData);
    console.log(`   ✓ ${savedCategories.length} categories created`);
    for (const cat of savedCategories) {
      console.log(`     - ${cat.name} (id: ${cat.id})`);
    }

    // ── 5. SEED PROVIDERS ─────────────────────────────────────────────
    console.log('\n🏭 Seeding providers...');
    const providerRepo = AppDataSource.getRepository(Provider);
    const savedProviders = await providerRepo.save(providersData);
    console.log(`   ✓ ${savedProviders.length} providers created`);
    for (const prov of savedProviders) {
      console.log(`     - ${prov.name} (id: ${prov.id})`);
    }

    // ── 6. SEED PRODUCTS ──────────────────────────────────────────────
    console.log('\n🛍️  Seeding products...');
    const productRepo = AppDataSource.getRepository(Product);
    const productsToSeed = buildProductsData(savedCategories, savedProviders);
    const savedProducts = await productRepo.save(productsToSeed);
    console.log(`   ✓ ${savedProducts.length} products created`);

    // ── 7. SEED DEFAULT USERS ─────────────────────────────────────────
    console.log('\n👤 Seeding default users...');
    const userRepo = AppDataSource.getRepository(User);
    
    const defaultPassword = await bcrypt.hash('Admin123!', 10);
    const userPassword = await bcrypt.hash('User123!', 10);

    const defaultUsers = [
      {
        firstName: 'Admin',
        lastName: 'System',
        email: 'admin@tusuper.com',
        password: defaultPassword,
        isActive: true,
        isEmailVerified: true,
        roles: [seededRoles['ADMIN']],
      },
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'user@tusuper.com',
        password: userPassword,
        isActive: true,
        isEmailVerified: true,
        roles: [seededRoles['USER']],
      },
      {
        firstName: 'Tendero',
        lastName: 'Demo',
        email: 'tendero@tusuper.com',
        password: defaultPassword,
        isActive: true,
        isEmailVerified: true,
        roles: [seededRoles['TENDERO']],
      },
    ];

    for (const userData of defaultUsers) {
      const user = userRepo.create(userData);
      await userRepo.save(user);
      console.log(`   ✓ User "${user.email}" created (${user.roles.map(r => r.name).join(', ')})`);
    }

    // ── RESUMEN FINAL ──────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • ${Object.keys(seededModules).length} modules`);
    console.log(`   • ${Object.keys(seededRoles).length} roles`);
    console.log(`   • ${savedCategories.length} categories`);
    console.log(`   • ${savedProviders.length} providers`);
    console.log(`   • ${savedProducts.length} products`);
    console.log(`   • ${defaultUsers.length} default users`);
    console.log('\n🔑 Default credentials:');
    console.log(`   admin@tusuper.com / Admin123!`);
    console.log(`   user@tusuper.com / User123!`);
    console.log(`   tendero@tusuper.com / Admin123!`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR during seeding:', error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed();
