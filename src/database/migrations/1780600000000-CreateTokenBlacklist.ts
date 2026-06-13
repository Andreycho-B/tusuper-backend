import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenBlacklist1780600000000 implements MigrationInterface {
  name = 'CreateTokenBlacklist1780600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "token_blacklist" ("jti" character varying(255) NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_token_blacklist_jti" PRIMARY KEY ("jti"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_token_blacklist_expiresAt" ON "token_blacklist" ("expiresAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_token_blacklist_expiresAt"`);
    await queryRunner.query(`DROP TABLE "token_blacklist"`);
  }
}
