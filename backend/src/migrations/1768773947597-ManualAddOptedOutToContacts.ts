import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualAddOptedOutToContacts1768773947597 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contacts" ADD IF NOT EXISTS "opted_out" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD IF NOT EXISTS "opted_out_at" timestamp`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "opted_out"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "opted_out_at"`);
    }

}
