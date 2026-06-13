import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountLockoutFields1780500000000 implements MigrationInterface {
  name = 'AddAccountLockoutFields1780500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "failedLoginAttempts" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lockedUntil" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "lockedUntil"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failedLoginAttempts"`,
    );
  }
}
