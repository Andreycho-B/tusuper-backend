import { MigrationInterface, QueryRunner } from "typeorm";

export class MiTest1771881922299 implements MigrationInterface {
    name = 'MiTest1771881922299'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "miTest"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "miTest" character varying(55) NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "miTest"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "miTest" character varying(255) NOT NULL DEFAULT ''`);
    }

}
