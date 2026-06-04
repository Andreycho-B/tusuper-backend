import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscountToProducts1780438677926 implements MigrationInterface {
    name = 'AddDiscountToProducts1780438677926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agrega la columna discount a la tabla product
        await queryRunner.query(`ALTER TABLE "product" ADD "discount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revierte el cambio eliminando la columna discount
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "discount"`);
    }
}


