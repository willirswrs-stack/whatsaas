import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsSystemSeedToInstances1780426176448 implements MigrationInterface {
    name = 'AddIsSystemSeedToInstances1780426176448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "instances" ADD "is_system_seed" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "is_system_seed"`);
    }

}
