import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerToOrderFK1776653020365 implements MigrationInterface {
    name = 'AddCustomerToOrderFK1776653020365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Redundant - already handled in LinkOrderCustomerToUser
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Redundant
    }

}
