import { MigrationInterface, QueryRunner } from "typeorm";

export class MultiInstanceSupport1771531328036 implements MigrationInterface {
    name = 'MultiInstanceSupport1771531328036'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_84cae51c485079bdd8cdf1d828"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71ec7d68cfafa5f3d93c959b80"`);
        await queryRunner.query(`CREATE TYPE "public"."message_logs_direction_enum" AS ENUM('outbound', 'inbound')`);
        await queryRunner.query(`CREATE TABLE "message_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "message_outbox_id" uuid NOT NULL, "direction" "public"."message_logs_direction_enum" NOT NULL DEFAULT 'outbound', "provider_response" jsonb, "error_details" text, "http_status" integer, "duration_ms" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f0aae0d876a96fa1da0a1b97444" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1ab3160a49a89668ef228774b8" ON "message_logs" ("message_outbox_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1db08fc5747997a0310613735c" ON "message_logs" ("tenant_id", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."message_outbox_channel_enum" AS ENUM('whatsapp')`);
        await queryRunner.query(`CREATE TYPE "public"."message_outbox_provider_enum" AS ENUM('evolution_cloud')`);
        await queryRunner.query(`CREATE TYPE "public"."message_outbox_status_enum" AS ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'retrying')`);
        await queryRunner.query(`CREATE TABLE "message_outbox" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "source_event_id" uuid NOT NULL, "channel" "public"."message_outbox_channel_enum" NOT NULL DEFAULT 'whatsapp', "to_phone_e164" character varying NOT NULL, "customer_name" character varying, "order_id" character varying, "template_name" character varying, "template_language" character varying, "template_params" jsonb, "message_text" text, "provider" "public"."message_outbox_provider_enum" NOT NULL DEFAULT 'evolution_cloud', "provider_instance_id" character varying NOT NULL, "provider_message_id" character varying, "status" "public"."message_outbox_status_enum" NOT NULL DEFAULT 'queued', "tries" integer NOT NULL DEFAULT '0', "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "sent_at" TIMESTAMP, "next_retry_at" TIMESTAMP, CONSTRAINT "PK_5da887257490934413159fc3a2c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6cffd18e481eb3869ed7a0aa16" ON "message_outbox" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_26295c395be0c5b62f91ab5d33" ON "message_outbox" ("order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_35f5629ef288befb71dc74701e" ON "message_outbox" ("to_phone_e164") `);
        await queryRunner.query(`CREATE INDEX "IDX_df54f17cdbaf1f9a1a27eafd0e" ON "message_outbox" ("source_event_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2012475b81e66f73723046a953" ON "message_outbox" ("tenant_id", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."webhook_event_inbox_processed_status_enum" AS ENUM('pending', 'processed', 'ignored', 'failed')`);
        await queryRunner.query(`CREATE TABLE "webhook_event_inbox" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "webhook_integration_id" uuid NOT NULL, "provider_event_id" character varying, "event_type_code" character varying NOT NULL, "event_hash" character varying NOT NULL, "occurred_at" TIMESTAMP NOT NULL, "payload_raw" jsonb NOT NULL, "normalized_data" jsonb, "received_at" TIMESTAMP NOT NULL DEFAULT now(), "processed_status" "public"."webhook_event_inbox_processed_status_enum" NOT NULL DEFAULT 'pending', "processed_at" TIMESTAMP, "error_message" text, "processing_log" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "UQ_ad74e9c77b831a3824053c350ac" UNIQUE ("event_hash"), CONSTRAINT "PK_374dd042f2e2072849feb364905" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5221eb257fe9e170ed8c324422" ON "webhook_event_inbox" ("webhook_integration_id", "event_type_code") `);
        await queryRunner.query(`CREATE INDEX "IDX_23ca584dd430a317d179b65c48" ON "webhook_event_inbox" ("tenant_id", "received_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ad74e9c77b831a3824053c350a" ON "webhook_event_inbox" ("event_hash") `);
        await queryRunner.query(`CREATE INDEX "IDX_ed7fc341598aa1a89c7db8a257" ON "webhook_event_inbox" ("tenant_id", "processed_status") `);
        await queryRunner.query(`CREATE TYPE "public"."webhook_integrations_provider_enum" AS ENUM('generic', 'shopify', 'woocommerce', 'yampi', 'cartpanda', 'nuvemshop', 'tray', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."webhook_integrations_signature_type_enum" AS ENUM('none', 'hmac_sha256', 'token_header')`);
        await queryRunner.query(`CREATE TABLE "webhook_integrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "name" character varying NOT NULL, "provider" "public"."webhook_integrations_provider_enum" NOT NULL DEFAULT 'generic', "is_enabled" boolean NOT NULL DEFAULT true, "inbound_secret" character varying NOT NULL, "signature_header" character varying, "signature_type" "public"."webhook_integrations_signature_type_enum" NOT NULL DEFAULT 'none', "endpoint_slug" character varying NOT NULL, "rate_limit_per_minute" integer NOT NULL DEFAULT '60', "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_49c96a73cff0c7b41c4218befe4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_264d2e698c5c913f9f39233351" ON "webhook_integrations" ("tenant_id", "is_enabled") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_524dd0151031ed66ddcbab0448" ON "webhook_integrations" ("tenant_id", "endpoint_slug") `);
        await queryRunner.query(`CREATE TYPE "public"."webhook_event_mappings_message_channel_enum" AS ENUM('whatsapp')`);
        await queryRunner.query(`CREATE TYPE "public"."webhook_event_mappings_send_mode_enum" AS ENUM('template_only', 'template_preferred', 'free_text_if_24h')`);
        await queryRunner.query(`CREATE TABLE "webhook_event_mappings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying NOT NULL, "webhook_integration_id" uuid NOT NULL, "event_type_code" character varying NOT NULL, "is_enabled" boolean NOT NULL DEFAULT true, "match_rules" jsonb NOT NULL DEFAULT '{}', "message_channel" "public"."webhook_event_mappings_message_channel_enum" NOT NULL DEFAULT 'whatsapp', "whatsapp_instance_id" character varying, "send_mode" "public"."webhook_event_mappings_send_mode_enum" NOT NULL DEFAULT 'template_only', "template_name" character varying, "template_language" character varying NOT NULL DEFAULT 'pt_BR', "template_variables_map" jsonb NOT NULL DEFAULT '{}', "fallback_text" text, "rate_limit_per_minute" integer NOT NULL DEFAULT '60', "forward_to_n8n" boolean NOT NULL DEFAULT false, "n8n_webhook_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_31a6340801dc916c3935dbd6300" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e994e7a3feec83f8c4179cc443" ON "webhook_event_mappings" ("tenant_id", "is_enabled") `);
        await queryRunner.query(`CREATE INDEX "IDX_59f44aed8cdffdb35e451d146b" ON "webhook_event_mappings" ("tenant_id", "webhook_integration_id", "event_type_code") `);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "instance_ids" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "contacts" ALTER COLUMN "tenant_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "message_logs" ADD CONSTRAINT "FK_1ab3160a49a89668ef228774b8b" FOREIGN KEY ("message_outbox_id") REFERENCES "message_outbox"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_outbox" ADD CONSTRAINT "FK_df54f17cdbaf1f9a1a27eafd0e6" FOREIGN KEY ("source_event_id") REFERENCES "webhook_event_inbox"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "webhook_event_inbox" ADD CONSTRAINT "FK_6f714db3f31171410dce58588ae" FOREIGN KEY ("webhook_integration_id") REFERENCES "webhook_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "webhook_event_mappings" ADD CONSTRAINT "FK_61661c8e154073fe065abd72e50" FOREIGN KEY ("webhook_integration_id") REFERENCES "webhook_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhook_event_mappings" DROP CONSTRAINT "FK_61661c8e154073fe065abd72e50"`);
        await queryRunner.query(`ALTER TABLE "webhook_event_inbox" DROP CONSTRAINT "FK_6f714db3f31171410dce58588ae"`);
        await queryRunner.query(`ALTER TABLE "message_outbox" DROP CONSTRAINT "FK_df54f17cdbaf1f9a1a27eafd0e6"`);
        await queryRunner.query(`ALTER TABLE "message_logs" DROP CONSTRAINT "FK_1ab3160a49a89668ef228774b8b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_068a0facfee46f1386b649ef0e"`);
        await queryRunner.query(`ALTER TABLE "contacts" ALTER COLUMN "tenant_id" SET NOT NULL`);
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
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "instance_ids"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59f44aed8cdffdb35e451d146b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e994e7a3feec83f8c4179cc443"`);
        await queryRunner.query(`DROP TABLE "webhook_event_mappings"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_event_mappings_send_mode_enum"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_event_mappings_message_channel_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_524dd0151031ed66ddcbab0448"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_264d2e698c5c913f9f39233351"`);
        await queryRunner.query(`DROP TABLE "webhook_integrations"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_integrations_signature_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_integrations_provider_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ed7fc341598aa1a89c7db8a257"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad74e9c77b831a3824053c350a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23ca584dd430a317d179b65c48"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5221eb257fe9e170ed8c324422"`);
        await queryRunner.query(`DROP TABLE "webhook_event_inbox"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_event_inbox_processed_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2012475b81e66f73723046a953"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df54f17cdbaf1f9a1a27eafd0e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_35f5629ef288befb71dc74701e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_26295c395be0c5b62f91ab5d33"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6cffd18e481eb3869ed7a0aa16"`);
        await queryRunner.query(`DROP TABLE "message_outbox"`);
        await queryRunner.query(`DROP TYPE "public"."message_outbox_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."message_outbox_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."message_outbox_channel_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1db08fc5747997a0310613735c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ab3160a49a89668ef228774b8"`);
        await queryRunner.query(`DROP TABLE "message_logs"`);
        await queryRunner.query(`DROP TYPE "public"."message_logs_direction_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_71ec7d68cfafa5f3d93c959b80" ON "contacts" ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone") `);
    }

}
