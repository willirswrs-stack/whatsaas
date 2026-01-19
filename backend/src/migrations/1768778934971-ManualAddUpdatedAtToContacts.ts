import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualAddUpdatedAtToContacts1768778934971 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contacts" ADD IF NOT EXISTS "updated_at" timestamp DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "updated_at"`);
    }

}
