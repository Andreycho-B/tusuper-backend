import { MigrationInterface, QueryRunner } from "typeorm";

export class Test11771780026451 implements MigrationInterface {
    name = 'Test11771780026451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "lastName" character varying(255) NOT NULL, "docType" character varying(255) NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
