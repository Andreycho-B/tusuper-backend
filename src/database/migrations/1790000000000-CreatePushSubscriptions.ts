import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePushSubscriptions1790000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'push_subscriptions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
          },
          {
            name: 'endpoint',
            type: 'text',
          },
          {
            name: 'p256dh',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'auth',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        indices: [{ columnNames: ['userId'] }],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('push_subscriptions');
  }
}
