import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscountToProducts1780438677926 implements MigrationInterface {
    name = 'AddDiscountToProducts1780438677926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" ADD "discount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "modules" DROP CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06"`);
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "name" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "modules" ADD CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "description" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "modules" DROP CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06"`);
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "modules" ADD CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "discount"`);
    }
}


