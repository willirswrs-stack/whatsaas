import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncFlowEntities1768783494566 implements MigrationInterface {
    name = 'SyncFlowEntities1768783494566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_84cae51c485079bdd8cdf1d828"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71ec7d68cfafa5f3d93c959b80"`);
        await queryRunner.query(`CREATE TABLE "flows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "folder_id" uuid, "name" character varying(255) NOT NULL, "description" text, "channel" character varying(50), "status" character varying(20) NOT NULL DEFAULT 'draft', "nodes" jsonb NOT NULL DEFAULT '[]', "edges" jsonb NOT NULL DEFAULT '[]', "execution_count" integer NOT NULL DEFAULT '0', "last_executed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c346955f4318ef565e6928462fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flow_executions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "flow_id" uuid NOT NULL, "contact_id" uuid NOT NULL, "instance_id" uuid, "status" character varying(20) NOT NULL DEFAULT 'running', "current_node_id" character varying(100), "variables" jsonb NOT NULL DEFAULT '{}', "logs" jsonb NOT NULL DEFAULT '[]', "started_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP, "next_action_at" TIMESTAMP, CONSTRAINT "PK_3f6404db5c4ffc05cc0564fbe8d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flow_triggers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "flow_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "type" character varying(50) NOT NULL, "config" jsonb NOT NULL DEFAULT '{}', "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f228fae48988a22afc379dfcb6" PRIMARY KEY ("id"))`);
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
        await queryRunner.query(`ALTER TABLE "contacts" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "opted_out_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "opted_out" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "email" character varying(255)`);
        await queryRunner.query(`DROP TABLE "flow_triggers"`);
        await queryRunner.query(`DROP TABLE "flow_executions"`);
        await queryRunner.query(`DROP TABLE "flows"`);
        await queryRunner.query(`CREATE INDEX "IDX_71ec7d68cfafa5f3d93c959b80" ON "contacts" ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone") `);
    }

}
