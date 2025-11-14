import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699000000000 implements MigrationInterface {
  name = 'InitialSchema1699000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "max_user_id" varchar(255) UNIQUE NOT NULL,
        "username" varchar(255),
        "first_name" varchar(255),
        "last_name" varchar(255),
        "is_active" boolean DEFAULT true,
        "onboarding_completed" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_max_user_id" ON "users" ("max_user_id");
    `);

    // Tasks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "description" text,
        "priority" varchar(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        "complexity" varchar(20) DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
        "status" varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        "required_energy" integer DEFAULT 5 CHECK (required_energy >= 0 AND required_energy <= 10),
        "required_focus" integer DEFAULT 50 CHECK (required_focus >= 0 AND required_focus <= 100),
        "estimated_duration" integer,
        "deadline" timestamp,
        "started_at" timestamp,
        "completed_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_user_id" ON "tasks" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" ("status");
      CREATE INDEX IF NOT EXISTS "idx_tasks_priority" ON "tasks" ("priority");
      CREATE INDEX IF NOT EXISTS "idx_tasks_deadline" ON "tasks" ("deadline");
    `);

    // User States table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_states" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "test_type" varchar(50) NOT NULL CHECK (test_type IN ('energy', 'focus', 'motivation', 'stress')),
        "energy" integer CHECK (energy >= 0 AND energy <= 10),
        "focus" integer CHECK (focus >= 0 AND focus <= 100),
        "motivation" integer CHECK (motivation >= 0 AND motivation <= 10),
        "stress" integer CHECK (stress >= 0 AND stress <= 10),
        "raw_answers" jsonb,
        "created_at" timestamp DEFAULT now(),
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_states_user_id" ON "user_states" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_user_states_created_at" ON "user_states" ("created_at");
      CREATE INDEX IF NOT EXISTS "idx_user_states_test_type" ON "user_states" ("test_type");
    `);

    // User Settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid UNIQUE NOT NULL,
        "notifications_enabled" boolean DEFAULT true,
        "test_reminders" boolean DEFAULT true,
        "work_start_time" varchar(5) DEFAULT '09:00',
        "work_end_time" varchar(5) DEFAULT '18:00',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_settings_user_id" ON "user_settings" ("user_id");
    `);

    // Analytics Events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "event_data" jsonb,
        "created_at" timestamp DEFAULT now(),
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_analytics_events_user_id" ON "analytics_events" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_analytics_events_type" ON "analytics_events" ("event_type");
      CREATE INDEX IF NOT EXISTS "idx_analytics_events_created_at" ON "analytics_events" ("created_at");
    `);

    // Work Sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "started_at" timestamp NOT NULL,
        "ended_at" timestamp,
        "duration" integer,
        "session_type" varchar(50) DEFAULT 'work',
        "productivity_score" integer,
        "created_at" timestamp DEFAULT now(),
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_work_sessions_user_id" ON "work_sessions" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_work_sessions_started_at" ON "work_sessions" ("started_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_sessions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_states" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
  }
}
