import { AppDataSource } from '../database/data-source';
import { Role } from '../roles/entities/role.entity';
import { ModuleEntity } from '../modules/entities/module.entity';

async function seed() {
  console.log('Initializing database connection...');
  await AppDataSource.initialize();
  console.log('Database connection initialized successfully.');

  const roleRepo = AppDataSource.getRepository(Role);
  const moduleRepo = AppDataSource.getRepository(ModuleEntity);

  // 1. Seed Modules
  console.log('Seeding modules...');
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
    let moduleEntity = await moduleRepo.findOne({ where: { name: item.name } });
    if (!moduleEntity) {
      moduleEntity = moduleRepo.create(item);
      await moduleRepo.save(moduleEntity);
      console.log(`Module "${item.name}" created.`);
    } else {
      console.log(`Module "${item.name}" already exists.`);
    }
    seededModules[item.name] = moduleEntity;
  }

  // 2. Seed Roles
  console.log('Seeding roles...');
  const rolesData = [
    { name: 'USER', description: 'Usuario final / cliente' },
    { name: 'ADMIN', description: 'Administrador del sistema' },
    { name: 'TENDERO', description: 'Tendero / Vendedor' },
  ];

  const seededRoles: Record<string, Role> = {};
  for (const item of rolesData) {
    let roleEntity = await roleRepo.findOne({ where: { name: item.name } });
    if (!roleEntity) {
      roleEntity = roleRepo.create(item);
      await roleRepo.save(roleEntity);
      console.log(`Role "${item.name}" created.`);
    } else {
      console.log(`Role "${item.name}" already exists.`);
    }
    seededRoles[item.name] = roleEntity;
  }

  // 3. Link Roles and Modules
  console.log('Linking roles and modules...');

  // ADMIN gets all modules
  seededRoles['ADMIN'].modules = Object.values(seededModules);
  await roleRepo.save(seededRoles['ADMIN']);
  console.log('Linked all modules to ADMIN.');

  // USER gets product, category, orders
  seededRoles['USER'].modules = [
    seededModules['product'],
    seededModules['category'],
    seededModules['orders'],
  ];
  await roleRepo.save(seededRoles['USER']);
  console.log('Linked product, category, orders to USER.');

  // TENDERO gets product, category, provider, orders
  seededRoles['TENDERO'].modules = [
    seededModules['product'],
    seededModules['category'],
    seededModules['provider'],
    seededModules['orders'],
  ];
  await roleRepo.save(seededRoles['TENDERO']);
  console.log('Linked product, category, provider, orders to TENDERO.');

  console.log('Seeding completed successfully!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
