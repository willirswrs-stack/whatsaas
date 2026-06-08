import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWarmupProfileToInstances1780439475860 implements MigrationInterface {
    name = 'AddWarmupProfileToInstances1780439475860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "instances" ADD "warmup_profile" character varying NOT NULL DEFAULT 'cold_outbound'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "warmup_profile"`);
    }

}
