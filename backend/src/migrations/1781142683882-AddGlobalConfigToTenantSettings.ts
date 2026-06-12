import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGlobalConfigToTenantSettings1781142683882 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_settings" ADD "global_config" jsonb NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_settings" DROP COLUMN "global_config"`);
    }

}
