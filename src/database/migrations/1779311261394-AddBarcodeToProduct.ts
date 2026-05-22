import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBarcodeToProduct1779311261394 implements MigrationInterface {
  name = 'AddBarcodeToProduct1779311261394';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD "barcode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "UQ_7ac18742b02b8af41afdaa3b9a9" UNIQUE ("barcode")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "UQ_7ac18742b02b8af41afdaa3b9a9"`,
    );
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "barcode"`);
  }
}
