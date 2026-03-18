import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestColumn1771956858871 implements MigrationInterface {
    name = 'AddTestColumn1771956858871'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "miTest2" character varying(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "miTest" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "miTest" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "miTest2"`);
    }

}
