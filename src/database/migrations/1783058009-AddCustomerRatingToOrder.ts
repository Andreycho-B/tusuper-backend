import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerRatingToOrder1783058009 implements MigrationInterface {
  name = 'AddCustomerRatingToOrder1783058009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "customer_rating" smallint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "customer_feedback" text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "delivery_confirmed_at" TIMESTAMP NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "delivery_confirmed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "customer_feedback"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "customer_rating"`,
    );
  }
}
