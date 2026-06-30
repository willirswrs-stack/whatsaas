import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBanCountsToChipDetails1782240000000 implements MigrationInterface {
  name = 'AddBanCountsToChipDetails1782240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "chip_details" 
            ADD "ban_count" integer NOT NULL DEFAULT 0,
            ADD "unban_count" integer NOT NULL DEFAULT 0
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "chip_details" 
            DROP COLUMN "ban_count",
            DROP COLUMN "unban_count"
        `);
  }
}
