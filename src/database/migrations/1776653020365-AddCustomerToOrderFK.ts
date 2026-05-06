import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerToOrderFK1776653020365 implements MigrationInterface {
  name = 'AddCustomerToOrderFK1776653020365';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Redundant - already handled in LinkOrderCustomerToUser
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Redundant
  }
}
