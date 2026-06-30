"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMessagesTable1782490800000 = void 0;
class CreateMessagesTable1782490800000 {
    constructor() {
        this.name = 'CreateMessagesTable1782490800000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tenant_id" character varying NOT NULL,
                "instance_id" character varying,
                "instance_name" character varying,
                "contact_id" uuid,
                "remote_jid" character varying NOT NULL,
                "remote_phone" character varying,
                "remote_name" character varying,
                "wamid" character varying,
                "direction" character varying(10) NOT NULL,
                "type" character varying(20) NOT NULL DEFAULT 'text',
                "content" text,
                "media_url" character varying,
                "media_mime" character varying,
                "status" character varying(20) NOT NULL DEFAULT 'received',
                "campaign_id" character varying,
                "is_group" boolean NOT NULL DEFAULT false,
                "group_name" character varying,
                "raw_payload" jsonb,
                "expires_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_messages_contact_id" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_messages_tenant_jid_created" ON "messages" ("tenant_id", "remote_jid", "created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_messages_tenant_instance_created" ON "messages" ("tenant_id", "instance_id", "created_at")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_messages_wamid" ON "messages" ("wamid") WHERE "wamid" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_messages_contact_id" ON "messages" ("contact_id")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."IDX_messages_contact_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_messages_wamid"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_messages_tenant_instance_created"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_messages_tenant_jid_created"`);
        await queryRunner.query(`DROP TABLE "messages"`);
    }
}
exports.CreateMessagesTable1782490800000 = CreateMessagesTable1782490800000;
