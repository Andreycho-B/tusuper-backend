import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockDeductedToOrder1779339155270 implements MigrationInterface {
    name = 'AddStockDeductedToOrder1779339155270'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "stock_deducted" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "stock_deducted"`);
    }
}
