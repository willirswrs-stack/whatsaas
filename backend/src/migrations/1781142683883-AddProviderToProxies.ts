import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProviderToProxies1781142683883 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "proxies" ADD "provider" character varying NOT NULL DEFAULT 'iproyal'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "proxies" DROP COLUMN "provider"`);
    }

}
