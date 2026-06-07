import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscountToProducts1780438677926 implements MigrationInterface {
    name = 'AddDiscountToProducts1780438677926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agrega la columna discount a la tabla product (idempotente)
        const columnExists = await queryRunner.query(
            `SELECT 1 FROM information_schema.columns WHERE table_name='product' AND column_name='discount'`
        );
        if (columnExists.length === 0) {
            await queryRunner.query(`ALTER TABLE product ADD COLUMN discount integer NOT NULL DEFAULT 0`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revierte el cambio eliminando la columna discount (idempotente)
        const columnExists = await queryRunner.query(
            `SELECT 1 FROM information_schema.columns WHERE table_name='product' AND column_name='discount'`
        );
        if (columnExists.length > 0) {
            await queryRunner.query(`ALTER TABLE product DROP COLUMN discount`);
        }
    }
}


