import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDpopPublicKey1784000000000 implements MigrationInterface {
  name = 'AddDpopPublicKey1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "dpopPublicKey" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "dpopPublicKey"`,
    );
  }
}
