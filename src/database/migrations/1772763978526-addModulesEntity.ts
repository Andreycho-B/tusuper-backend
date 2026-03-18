import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModulesEntity1772763978526 implements MigrationInterface {
    name = 'AddModulesEntity1772763978526'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "modules" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_8cd1abde4b70e59644c98668c06" UNIQUE ("name"), CONSTRAINT "PK_7dbefd488bd96c5bf31f0ce0c95" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "modules"`);
    }

}
