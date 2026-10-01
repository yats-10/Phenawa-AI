import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790888855452 implements MigrationInterface {
    name = 'InitialSchema1790888855452'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "generations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "fabric_id" uuid, "garment_type" character varying NOT NULL, "result_base64" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9d2a52fbde1fba42c24ec42ddd2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b309f4cc39781f7fe9aabd444d" ON "generations" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "fabrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying NOT NULL, "image_base64" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_154ff1486274ec43fcea1e04a66" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7f152a3e6305d51c1dae5a99c8" ON "fabrics" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "shop_name" character varying NOT NULL, "owner_name" character varying NOT NULL, "phone" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "access_expires_at" TIMESTAMP NOT NULL, "daily_alert_sent" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4ba6d0c734d53f8e1b2e24b6c56" UNIQUE ("username"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "FK_d2144f7590e23819132d9222968" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "FK_d656d25c69fe1e54984f6f794d1" FOREIGN KEY ("fabric_id") REFERENCES "fabrics"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fabrics" ADD CONSTRAINT "FK_52ca900db386bf75ca0f4a46a07" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fabrics" DROP CONSTRAINT "FK_52ca900db386bf75ca0f4a46a07"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "FK_d656d25c69fe1e54984f6f794d1"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "FK_d2144f7590e23819132d9222968"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f152a3e6305d51c1dae5a99c8"`);
        await queryRunner.query(`DROP TABLE "fabrics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b309f4cc39781f7fe9aabd444d"`);
        await queryRunner.query(`DROP TABLE "generations"`);
    }

}
