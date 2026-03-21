import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorUsersEntity1773866077836 implements MigrationInterface {
    name = 'RefactorUsersEntity1773866077836'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Rename table from "user" to "users"
        await queryRunner.query(`ALTER TABLE "user" RENAME TO "users"`);

        // 2. Rename column "name" to "firstName"
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "name" TO "firstName"`);

        // 3. Drop columns docType and docNumber
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "docType"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "docNumber"`);

        // 4. Add timestamp columns
        await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);

        // 5. Update user_roles foreign key to reference "users" instead of "user"
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_99b019339f52c63ae6153587380"`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_99b019339f52c63ae6153587380" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 5. Revert user_roles foreign key
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_99b019339f52c63ae6153587380"`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_99b019339f52c63ae6153587380" FOREIGN KEY ("usersId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

        // 4. Drop timestamp columns
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);

        // 3. Re-add dropped columns
        await queryRunner.query(`ALTER TABLE "users" ADD "docNumber" character varying(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD "docType" character varying(255) NOT NULL DEFAULT ''`);

        // 2. Rename firstName back to name
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "firstName" TO "name"`);

        // 1. Rename table back to "user"
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "user"`);
    }

}
