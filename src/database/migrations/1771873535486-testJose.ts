import { MigrationInterface, QueryRunner } from "typeorm";

export class TestJose1771873535486 implements MigrationInterface {
    name = 'TestJose1771873535486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "miTest" character varying(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "docNumber" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "docNumber" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "miTest"`);
    }

}
