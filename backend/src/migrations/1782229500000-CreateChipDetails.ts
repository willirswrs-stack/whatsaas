import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChipDetails1782229500000 implements MigrationInterface {
  name = 'CreateChipDetails1782229500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "chip_details" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "instance_id" uuid NOT NULL,
                "carrier" character varying,
                "device_name" character varying,
                "plan_type" character varying,
                "recharge_date" date,
                "recharge_value" numeric(10,2),
                "expiration_date" date,
                "health_score" integer NOT NULL DEFAULT 100,
                "tags" text array NOT NULL DEFAULT '{}',
                "physical_location" character varying,
                "iccid" character varying,
                "profile_status" jsonb NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "REL_chip_details_instance_id" UNIQUE ("instance_id"),
                CONSTRAINT "PK_chip_details_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "chip_details" 
            ADD CONSTRAINT "FK_chip_details_instance_id" 
            FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chip_details" DROP CONSTRAINT "FK_chip_details_instance_id"`,
    );
    await queryRunner.query(`DROP TABLE "chip_details"`);
  }
}
