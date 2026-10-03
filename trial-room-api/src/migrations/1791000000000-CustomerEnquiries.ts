import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerEnquiries1791000000000 implements MigrationInterface {
  name = 'CustomerEnquiries1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" varchar(100) NOT NULL, "phone" varchar(12) NOT NULL, "whatsapp_opt_in" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_customers_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_customers_shop_phone" ON "customers" ("user_id", "phone")`);
    await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_customers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);

    await queryRunner.query(`CREATE TABLE "enquiries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "generation_id" uuid NOT NULL, "fabric_id" uuid, "fabric_name" varchar, "garment_type" varchar NOT NULL, "status" varchar(20) NOT NULL, "estimated_price" integer, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_enquiries_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_enquiries_generation" UNIQUE ("generation_id"), CONSTRAINT "CHK_enquiries_status" CHECK ("status" IN ('interested', 'ordered')))`);
    await queryRunner.query(`CREATE INDEX "IDX_enquiries_shop_status_created" ON "enquiries" ("user_id", "status", "created_at")`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD CONSTRAINT "FK_enquiries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD CONSTRAINT "FK_enquiries_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD CONSTRAINT "FK_enquiries_generation" FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "enquiries"`);
    await queryRunner.query(`DROP TABLE "customers"`);
  }
}
