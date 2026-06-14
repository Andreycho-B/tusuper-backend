import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRefreshTokens1800000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'userId', type: 'int' },
          { name: 'token', type: 'varchar', length: '255', isUnique: true },
          { name: 'expiresAt', type: 'timestamp' },
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
    await queryRunner.dropTable('refresh_tokens');
  }
}
