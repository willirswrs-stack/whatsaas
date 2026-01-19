import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1768666910514 implements MigrationInterface {
    name = 'InitialSchema1768666910514'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tenant_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "openai_key" character varying, "anthropic_key" character varying, "gemini_key" character varying, "groq_key" character varying, "extra_settings" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a6abc1c3ed0df635955fc852f1c" UNIQUE ("tenant_id"), CONSTRAINT "PK_69225c0ca64bcbbf9af8a217043" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subscription_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "max_instances" integer NOT NULL DEFAULT '5', "max_monthly_messages" integer NOT NULL DEFAULT '10000', "max_contacts" integer NOT NULL DEFAULT '5000', "ai_enabled" boolean NOT NULL DEFAULT true, "warmup_enabled" boolean NOT NULL DEFAULT true, "price" numeric(10,2) NOT NULL, "billing_cycle" character varying NOT NULL DEFAULT 'monthly', "features" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "slug" character varying, "email" character varying, "settings" jsonb NOT NULL DEFAULT '{}', "status" character varying NOT NULL DEFAULT 'active', "plan_id" uuid, "trial_ends_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "UQ_155c343439adc83ada6ee3f48be" UNIQUE ("email"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "email" character varying, "password_hash" character varying, "name" character varying, "role" character varying NOT NULL DEFAULT 'member', "last_login" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "flow_folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "tenant_id" uuid NOT NULL, "parent_id" uuid, "archived" boolean NOT NULL DEFAULT false, "order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_337009bc50977dcf6476a2671ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "proxies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying, "host" character varying NOT NULL, "port" integer NOT NULL, "type" character varying NOT NULL DEFAULT 'socks5', "username" character varying, "password" character varying, "country" character varying(2), "city" character varying, "latency_ms" integer, "status" character varying NOT NULL DEFAULT 'unknown', "last_check" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c66b4253ef600a915c610015093" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."instances_status_enum" AS ENUM('created', 'initializing', 'qr_pending', 'connecting', 'connected', 'disconnected', 'error', 'reconnecting', 'banned')`);
        await queryRunner.query(`CREATE TABLE "instances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying, "phone" character varying, "instance_name" character varying, "status" "public"."instances_status_enum" NOT NULL DEFAULT 'created', "channel_type" character varying NOT NULL DEFAULT 'unofficial', "provider" character varying NOT NULL DEFAULT 'evolution', "proxy_id" uuid, "meta_config" jsonb NOT NULL DEFAULT '{}', "evolution_config" jsonb NOT NULL DEFAULT '{}', "warmup_day" integer NOT NULL DEFAULT '0', "warmup_enabled" boolean NOT NULL DEFAULT true, "daily_limit" integer NOT NULL DEFAULT '10', "daily_sent" integer NOT NULL DEFAULT '0', "connected_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP, CONSTRAINT "UQ_edf693978c37318897fd5f4e368" UNIQUE ("instance_name"), CONSTRAINT "PK_11862209053330b4765f7f54178" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f2f4196059bf5e70faf6720fd3" ON "instances" ("tenant_id", "status") `);
        await queryRunner.query(`CREATE TABLE "warmup_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "instance_id" uuid NOT NULL, "day_number" integer NOT NULL, "target_messages" integer NOT NULL, "sent_count" integer NOT NULL DEFAULT '0', "conversation_log" jsonb NOT NULL DEFAULT '[]', "status" character varying NOT NULL DEFAULT 'pending', "scheduled_at" TIMESTAMP NOT NULL, "completed_at" TIMESTAMP, CONSTRAINT "PK_48ea8c6de3cfc96b57607348980" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying, "phone" character varying, "name" character varying, "custom_fields" jsonb NOT NULL DEFAULT '{}', "is_valid" boolean NOT NULL DEFAULT true, "on_whatsapp" boolean, "last_interaction" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone") `);
        await queryRunner.query(`CREATE INDEX "IDX_71ec7d68cfafa5f3d93c959b80" ON "contacts" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying, "name" character varying NOT NULL, "content" text NOT NULL, "content_type" character varying NOT NULL DEFAULT 'text', "media_config" jsonb NOT NULL DEFAULT '{}', "variables" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying, "name" character varying NOT NULL, "template_id" uuid, "flow_id" character varying, "instance_id" character varying, "status" character varying NOT NULL DEFAULT 'draft', "ai_spin_enabled" boolean NOT NULL DEFAULT true, "variation_count" integer NOT NULL DEFAULT '20', "schedule_config" jsonb NOT NULL DEFAULT '{}', "targeting_rules" jsonb NOT NULL DEFAULT '{}', "min_delay_ms" integer NOT NULL DEFAULT '5000', "max_delay_ms" integer NOT NULL DEFAULT '15000', "settings" jsonb NOT NULL DEFAULT '{}', "total_contacts" integer NOT NULL DEFAULT '0', "sent_count" integer NOT NULL DEFAULT '0', "delivered_count" integer NOT NULL DEFAULT '0', "read_count" integer NOT NULL DEFAULT '0', "failed_count" integer NOT NULL DEFAULT '0', "scheduled_at" TIMESTAMP, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_831e3fcd4fc45b4e4c3f57a9ee4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_07f32d7c5e5d3c177279654fb1" ON "campaigns" ("tenant_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_8848968b61761dabc955081229" ON "campaigns" ("tenant_id", "status") `);
        await queryRunner.query(`CREATE TABLE "message_variations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaign_id" uuid NOT NULL, "variation_index" integer NOT NULL, "content" text NOT NULL, "content_hash" character varying NOT NULL, "use_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f2c0603b6a836f8dea227e67137" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "campaign_contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaign_id" uuid NOT NULL, "contact_id" uuid NOT NULL, "instance_id" character varying, "variation_id" character varying, "status" character varying NOT NULL DEFAULT 'queued', "retry_count" integer NOT NULL DEFAULT '0', "scheduled_at" TIMESTAMP, "sent_at" TIMESTAMP, "delivered_at" TIMESTAMP, "read_at" TIMESTAMP, "failed_at" TIMESTAMP, "error_message" character varying, "message_id" character varying, CONSTRAINT "PK_ea6d58d76318d758f0f386a1008" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2ef181b0f1a589eb8a2b515d88" ON "campaign_contacts" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_593b3cd99aaba561730fc1583a" ON "campaign_contacts" ("campaign_id", "status") `);
        await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "FK_919d143d2411832db812bbc600e" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flow_folders" ADD CONSTRAINT "FK_e40b718407120dd18e708577682" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "flow_folders" ADD CONSTRAINT "FK_315096af2aaf86bc6e7a0ef5571" FOREIGN KEY ("parent_id") REFERENCES "flow_folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "instances" ADD CONSTRAINT "FK_efd5b1f9a934142c6b8a1c0060d" FOREIGN KEY ("proxy_id") REFERENCES "proxies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "warmup_schedules" ADD CONSTRAINT "FK_a446a4990f2076911e2f68e2fc4" FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_e7710203c0b031e01de765c25e7" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_variations" ADD CONSTRAINT "FK_3a2c785eb41c52d76a6625e2e16" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD CONSTRAINT "FK_7265978c9afe98d1e1ed85e65da" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" ADD CONSTRAINT "FK_2ef181b0f1a589eb8a2b515d885" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign_contacts" DROP CONSTRAINT "FK_2ef181b0f1a589eb8a2b515d885"`);
        await queryRunner.query(`ALTER TABLE "campaign_contacts" DROP CONSTRAINT "FK_7265978c9afe98d1e1ed85e65da"`);
        await queryRunner.query(`ALTER TABLE "message_variations" DROP CONSTRAINT "FK_3a2c785eb41c52d76a6625e2e16"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_e7710203c0b031e01de765c25e7"`);
        await queryRunner.query(`ALTER TABLE "warmup_schedules" DROP CONSTRAINT "FK_a446a4990f2076911e2f68e2fc4"`);
        await queryRunner.query(`ALTER TABLE "instances" DROP CONSTRAINT "FK_efd5b1f9a934142c6b8a1c0060d"`);
        await queryRunner.query(`ALTER TABLE "flow_folders" DROP CONSTRAINT "FK_315096af2aaf86bc6e7a0ef5571"`);
        await queryRunner.query(`ALTER TABLE "flow_folders" DROP CONSTRAINT "FK_e40b718407120dd18e708577682"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_919d143d2411832db812bbc600e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_593b3cd99aaba561730fc1583a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ef181b0f1a589eb8a2b515d88"`);
        await queryRunner.query(`DROP TABLE "campaign_contacts"`);
        await queryRunner.query(`DROP TABLE "message_variations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8848968b61761dabc955081229"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07f32d7c5e5d3c177279654fb1"`);
        await queryRunner.query(`DROP TABLE "campaigns"`);
        await queryRunner.query(`DROP TABLE "templates"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71ec7d68cfafa5f3d93c959b80"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_84cae51c485079bdd8cdf1d828"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
        await queryRunner.query(`DROP TABLE "warmup_schedules"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f2f4196059bf5e70faf6720fd3"`);
        await queryRunner.query(`DROP TABLE "instances"`);
        await queryRunner.query(`DROP TYPE "public"."instances_status_enum"`);
        await queryRunner.query(`DROP TABLE "proxies"`);
        await queryRunner.query(`DROP TABLE "flow_folders"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TABLE "subscription_plans"`);
        await queryRunner.query(`DROP TABLE "tenant_settings"`);
    }

}
