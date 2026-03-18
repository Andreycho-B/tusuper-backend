import { MigrationInterface, QueryRunner } from "typeorm";

export class MiMigracion1771872964109 implements MigrationInterface {
    name = 'MiMigracion-1771872964109'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "docNumber" character varying(255) NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "docNumber"`);
    }

}
