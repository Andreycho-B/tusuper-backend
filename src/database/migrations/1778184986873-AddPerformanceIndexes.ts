import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1778184986873 implements MigrationInterface {
  name = 'AddPerformanceIndexes1778184986873';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "modules" DROP CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ALTER COLUMN "name" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ADD CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ALTER COLUMN "description" TYPE character varying(500)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ORDER_CUSTOMER" ON "orders" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ORDER_STATUS" ON "orders" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ORDER_CREATED_AT" ON "orders" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_USER_IS_ACTIVE" ON "users" ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_PRODUCT_IS_ACTIVE" ON "product" ("isActive") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_PRODUCT_IS_ACTIVE"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_USER_IS_ACTIVE"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ORDER_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ORDER_STATUS"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ORDER_CUSTOMER"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "description"`);
    await queryRunner.query(
      `ALTER TABLE "modules" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "modules" DROP CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06"`,
    );
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "modules" ADD "name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ADD CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06" UNIQUE ("name")`,
    );
  }
}
