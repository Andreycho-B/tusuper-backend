import { MigrationInterface, QueryRunner } from "typeorm";

export class LinkOrderCustomerToUser1776651896230 implements MigrationInterface {
    name = 'LinkOrderCustomerToUser1776651896230'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "modules" DROP CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06"`);
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "name" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "modules" ADD CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "description" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`);
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "modules" DROP CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06"`);
        await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "modules" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "modules" ADD CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06" UNIQUE ("name")`);
    }

}
