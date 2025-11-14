import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateWorkSession1763025735082 implements MigrationInterface {
    name = 'UpdateWorkSession1763025735082'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a4fade802e15a160d9d647b167"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "started_at"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "ended_at"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "duration"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "session_type" character varying(20) NOT NULL DEFAULT 'focus'`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "start_time" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "planned_duration" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "actual_end_time" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "completed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "interruptions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "focus_rating" integer`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "completion_notes" text`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_settings" ALTER COLUMN "work_start_time" SET DEFAULT '09:00'`);
        await queryRunner.query(`ALTER TABLE "user_settings" ALTER COLUMN "work_end_time" SET DEFAULT '18:00'`);
        await queryRunner.query(`CREATE INDEX "IDX_33e3d14e78455cab855e14448c" ON "work_sessions" ("task_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4bce5ad0d898c5863d3d7f0c43" ON "work_sessions" ("completed") `);
        await queryRunner.query(`CREATE INDEX "IDX_aa23c19de1bbcf99a820915975" ON "work_sessions" ("user_id", "completed") `);
        await queryRunner.query(`CREATE INDEX "IDX_8e0df38e1795e939934504cb03" ON "work_sessions" ("user_id", "start_time") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8e0df38e1795e939934504cb03"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa23c19de1bbcf99a820915975"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4bce5ad0d898c5863d3d7f0c43"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_33e3d14e78455cab855e14448c"`);
        await queryRunner.query(`ALTER TABLE "user_settings" ALTER COLUMN "work_end_time" SET DEFAULT '18:00:00'`);
        await queryRunner.query(`ALTER TABLE "user_settings" ALTER COLUMN "work_start_time" SET DEFAULT '09:00:00'`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "completion_notes"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "focus_rating"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "interruptions"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "completed"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "actual_end_time"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "planned_duration"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" DROP COLUMN "session_type"`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "duration" integer`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "ended_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "work_sessions" ADD "started_at" TIMESTAMP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_a4fade802e15a160d9d647b167" ON "work_sessions" ("user_id", "started_at") `);
    }

}
