import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryToFlow1777855363085 implements MigrationInterface {
    name = 'AddCategoryToFlow1777855363085'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "webhook_event_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50), "label" character varying(100), "description" text, "default_payload_schema" jsonb DEFAULT '{}', "is_active" boolean DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PK_webhook_event_types" PRIMARY KEY ("id"), CONSTRAINT "webhook_event_types_code_key" UNIQUE ("code"))`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD COLUMN IF NOT EXISTS "content_hash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD COLUMN IF NOT EXISTS "timing_metadata" jsonb DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "instances" ADD COLUMN IF NOT EXISTS "lifecycle_stage" character varying DEFAULT 'registration'`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "asaas_customer_id" character varying`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "asaas_subscription_id" character varying`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ai_tokens_consumed" integer DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ai_tokens_cost" numeric(10,4) DEFAULT 0`);
        await queryRunner.query(`TRUNCATE TABLE "webhook_event_types" CASCADE`);
        await queryRunner.query(`ALTER TABLE "flows" ADD "category" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP CONSTRAINT "webhook_event_types_code_key"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "code" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD CONSTRAINT "UQ_068a0facfee46f1386b649ef0e3" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "label"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "label" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ALTER COLUMN "default_payload_schema" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ALTER COLUMN "is_active" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "flow_executions" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "flow_executions" ADD "status" character varying(30) NOT NULL DEFAULT 'running'`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" DROP COLUMN "content_hash"`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD "content_hash" character varying`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "timing_metadata" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "updated_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "instances" ALTER COLUMN "lifecycle_stage" SET NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_068a0facfee46f1386b649ef0e" ON "webhook_event_types" ("code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`TRUNCATE TABLE "webhook_event_types" CASCADE`);
        await queryRunner.query(`DROP INDEX "public"."IDX_068a0facfee46f1386b649ef0e"`);
        await queryRunner.query(`ALTER TABLE "instances" ALTER COLUMN "lifecycle_stage" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "updated_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ALTER COLUMN "timing_metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" DROP COLUMN "content_hash"`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD "content_hash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "flow_executions" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "flow_executions" ADD "status" character varying(20) NOT NULL DEFAULT 'running'`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ALTER COLUMN "is_active" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ALTER COLUMN "default_payload_schema" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "label"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "label" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP CONSTRAINT "UQ_068a0facfee46f1386b649ef0e3"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD "code" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_event_types" ADD CONSTRAINT "webhook_event_types_code_key" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "flows" DROP COLUMN "category"`);
    }

}
