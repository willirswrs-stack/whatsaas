import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncAllEntities1768779330500 implements MigrationInterface {
    name = 'SyncAllEntities1768779330500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_84cae51c485079bdd8cdf1d828"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71ec7d68cfafa5f3d93c959b80"`);
        await queryRunner.query(`CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "color" character varying(7) NOT NULL DEFAULT '#a855f7', "description" text, "contact_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contact_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contact_id" uuid NOT NULL, "tag_id" uuid NOT NULL, "added_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4e03788e7aac2227880c6fc3f7b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "custom_fields" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "key" character varying(100) NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'text', "options" jsonb, "required" boolean NOT NULL DEFAULT false, "field_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_35ab958a0baec2e0b2b2b875fdb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "opted_out"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "opted_out_at"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "email" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "opted_out" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "opted_out_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "tenant_id" uuid`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "phone" character varying(30)`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "tenant_id" character varying`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "name" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone") `);
        await queryRunner.query(`CREATE INDEX "IDX_71ec7d68cfafa5f3d93c959b80" ON "contacts" ("tenant_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_71ec7d68cfafa5f3d93c959b80"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_84cae51c485079bdd8cdf1d828"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "phone" character varying(30)`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "tenant_id" uuid`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "name" character varying`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "tenant_id" character varying`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "opted_out_at"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "opted_out"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "updated_at" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "opted_out_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "opted_out" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "email" character varying(255)`);
        await queryRunner.query(`DROP TABLE "custom_fields"`);
        await queryRunner.query(`DROP TABLE "contact_tags"`);
        await queryRunner.query(`DROP TABLE "tags"`);
        await queryRunner.query(`CREATE INDEX "IDX_71ec7d68cfafa5f3d93c959b80" ON "contacts" ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone") `);
    }

}
