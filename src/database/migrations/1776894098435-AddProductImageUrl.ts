import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductImageUrl1776894098435 implements MigrationInterface {
    name = 'AddProductImageUrl1776894098435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" ADD "imageUrl" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "imageUrl"`);
    }

}
