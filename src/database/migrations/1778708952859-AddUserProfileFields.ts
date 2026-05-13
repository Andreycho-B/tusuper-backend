import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfileFields1778708952859 implements MigrationInterface {
    name = 'AddUserProfileFields1778708952859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatarUrl" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "displayName" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "displayName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarUrl"`);
    }

}
