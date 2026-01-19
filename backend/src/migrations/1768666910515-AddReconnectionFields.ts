
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReconnectionFields1768666910515 implements MigrationInterface {
    name = 'AddReconnectionFields1768666910515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "instances" ADD "last_connection_check_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "instances" ADD "last_reconnect_attempt_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "instances" ADD "reconnect_attempts" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "instances" ADD "reconnect_locked_until" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "instances" ADD "last_reconnect_error_code" character varying`);
        await queryRunner.query(`ALTER TABLE "instances" ADD "last_reconnect_error_message" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "last_reconnect_error_message"`);
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "last_reconnect_error_code"`);
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "reconnect_locked_until"`);
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "reconnect_attempts"`);
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "last_reconnect_attempt_at"`);
        await queryRunner.query(`ALTER TABLE "instances" DROP COLUMN "last_connection_check_at"`);
    }
}
