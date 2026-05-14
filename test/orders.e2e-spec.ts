import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';
import { Product } from '../src/inventory/entities/product.entity';
import { Order } from '../src/orders/entities/order.entity';
import { Role } from '../src/roles/entities/role.entity';
import { Category } from '../src/inventory/entities/category.entity';
import { Provider } from '../src/inventory/entities/provider.entity';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let productRepository: Repository<Product>;
  let roleRepository: Repository<Role>;
  let orderRepository: Repository<Order>;
  let categoryRepository: Repository<Category>;
  let providerRepository: Repository<Provider>;
  let jwtService: JwtService;

  let testToken: string;
  let testUser: User;
  let testProduct: Product;
  const mockNotificationsService = {
    notifyNewOrder: jest.fn(),
    notifyOrderStatusChanged: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationsService)
      .useValue(mockNotificationsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    productRepository = moduleFixture.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    roleRepository = moduleFixture.get<Repository<Role>>(
      getRepositoryToken(Role),
    );
    orderRepository = moduleFixture.get<Repository<Order>>(
      getRepositoryToken(Order),
    );
    categoryRepository = moduleFixture.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    providerRepository = moduleFixture.get<Repository<Provider>>(
      getRepositoryToken(Provider),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean DB before each test
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }

    // Seed base data
    const role = await roleRepository.save(
      roleRepository.create({ name: 'CUSTOMER', description: 'Customer' }),
    );
    testUser = await userRepository.save(
      userRepository.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password',
        roles: [role],
      }),
    );

    const category = await categoryRepository.save(
      categoryRepository.create({ name: 'Electronics' }),
    );
    const provider = await providerRepository.save(
      providerRepository.create({ name: 'Global Tech' }),
    );

    testProduct = await productRepository.save(
      productRepository.create({
        name: 'Smartphone',
        price: 500,
        stock: 10,
        category,
        provider,
      }),
    );

    testToken = jwtService.sign({ sub: testUser.id, roles: ['CUSTOMER'] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /orders', () => {
    it('[Happy Path] should successfully create an order with multiple items and deduct stock', async () => {
      const payload = {
        paymentMethod: 'CASH',
        deliveryAddress: '123 Main St',
        contactPhone: '+1234567890',
        items: [{ productId: testProduct.id, quantity: 2 }],
      };

      const response = await request(app.getHttpServer() as App)
        .post('/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');

      // Verify DB State
      const orderCount = await orderRepository.count();
      expect(orderCount).toBe(1);

      const updatedProduct = await productRepository.findOneBy({
        id: testProduct.id,
      });
      expect(Number(updatedProduct?.stock)).toBe(8);
    });

    it('[Rollback] should rollback transaction and not save anything if an item is invalid (Product not found)', async () => {
      const payload = {
        paymentMethod: 'CASH',
        deliveryAddress: '123 Main St',
        contactPhone: '+1234567890',
        items: [{ productId: 9999, quantity: 1 }],
      };

      await request(app.getHttpServer() as App)
        .post('/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(404);

      // Verify DB State (Should be empty)
      const orderCount = await orderRepository.count();
      expect(orderCount).toBe(0);
    });

    it('[Rollback] should rollback transaction if customerId does not exist', async () => {
      const invalidToken = jwtService.sign({ sub: 9999, roles: ['CUSTOMER'] });
      const payload = {
        paymentMethod: 'CASH',
        deliveryAddress: '123 Main St',
        contactPhone: '+1234567890',
        items: [{ productId: testProduct.id, quantity: 1 }],
      };

      await request(app.getHttpServer() as App)
        .post('/orders')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(payload)
        .expect(404);

      const orderCount = await orderRepository.count();
      expect(orderCount).toBe(0);
    });

    it('[Rollback] should rollback upon catastrophic database failure mid-transaction', async () => {
      // Mock save failure on EntityManager prototype to catch queryRunner.manager.save
      jest
        .spyOn(EntityManager.prototype, 'save')
        .mockRejectedValueOnce(new Error('Catastrophic Failure'));

      const payload = {
        paymentMethod: 'CASH',
        deliveryAddress: '123 Main St',
        contactPhone: '+1234567890',
        items: [{ productId: testProduct.id, quantity: 1 }],
      };

      await request(app.getHttpServer() as App)
        .post('/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(500);

      const orderCount = await orderRepository.count();
      expect(orderCount).toBe(0);

      const updatedProduct = await productRepository.findOneBy({
        id: testProduct.id,
      });
      expect(Number(updatedProduct?.stock)).toBe(10); // Stock should NOT be deducted
    });

    it('[Race Condition / Lock] should fail when ordering with insufficient stock', async () => {
      const payload = {
        paymentMethod: 'CASH',
        deliveryAddress: '123 Main St',
        contactPhone: '+1234567890',
        items: [{ productId: testProduct.id, quantity: 100 }], // Quantity > Stock
      };

      await request(app.getHttpServer() as App)
        .post('/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(400);

      const orderCount = await orderRepository.count();
      expect(orderCount).toBe(0);
    });

    it('[Network Layer] should reject with 400 Bad Request if items array is empty', async () => {
      const payload = {
        paymentMethod: 'CASH',
        deliveryAddress: '123 Main St',
        contactPhone: '+1234567890',
        items: [], // Empty Array
      };

      await request(app.getHttpServer() as App)
        .post('/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(400);

      const orderCount = await orderRepository.count();
      expect(orderCount).toBe(0);
    });
  });
});
