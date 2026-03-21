import { MigrationInterface, QueryRunner } from "typeorm";

export class InitOrdersModule1774028458827 implements MigrationInterface {
    name = 'InitOrdersModule1774028458827'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Creación de Enumeradores
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING', 'PREPARING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_payment_status_enum" AS ENUM('PENDING', 'PAID')`);

        // 2. Creación de Tabla Orders
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "customer_id" integer NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING', "payment_method" character varying(50) NOT NULL, "payment_status" "public"."orders_payment_status_enum" NOT NULL DEFAULT 'PENDING', "delivery_address" character varying(255) NOT NULL, "delivery_notes" text, "total_amount" numeric(10,2) NOT NULL, "delivery_fee" numeric(10,2) NOT NULL DEFAULT '0', "contact_phone" character varying(20) NOT NULL, "cash_change_requested" numeric(10,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);

        // 3. Creación de Tabla Order Items
        await queryRunner.query(`CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "product_id" integer NOT NULL, "quantity" integer NOT NULL, "unit_price" numeric(10,2) NOT NULL, "sub_total" numeric(10,2) NOT NULL, "order_id" integer, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);

        // 4. Llaves Foráneas
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reversión en orden estricto (Llaves foráneas -> Tablas -> Enums)
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_payment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    }
}