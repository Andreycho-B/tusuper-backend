import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRelationRolesModules1772799335374 implements MigrationInterface {
    name = 'AddRelationRolesModules1772799335374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role_modules" ("role_id" integer NOT NULL, "module_id" integer NOT NULL, CONSTRAINT "PK_0898417a9cc2d78e322076dc86a" PRIMARY KEY ("role_id", "module_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d94c957204d1c78e702a97cc1a" ON "role_modules" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_037d3081ebb1e33fa2b4204e05" ON "role_modules" ("module_id") `);
        await queryRunner.query(`ALTER TABLE "role_modules" ADD CONSTRAINT "FK_d94c957204d1c78e702a97cc1a9" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_modules" ADD CONSTRAINT "FK_037d3081ebb1e33fa2b4204e057" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_modules" DROP CONSTRAINT "FK_037d3081ebb1e33fa2b4204e057"`);
        await queryRunner.query(`ALTER TABLE "role_modules" DROP CONSTRAINT "FK_d94c957204d1c78e702a97cc1a9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_037d3081ebb1e33fa2b4204e05"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d94c957204d1c78e702a97cc1a"`);
        await queryRunner.query(`DROP TABLE "role_modules"`);
    }

}
