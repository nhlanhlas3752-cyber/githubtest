/**
 * EduPlan — Database Migration
 * Run: npm run migrate (from /backend)
 * Creates all tables fresh. Safe to re-run (uses IF NOT EXISTS).
 */

require('dotenv').config();
const { pool } = require('../config/database');

const migrations = [
  // ─── SCHOOLS ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS schools (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    email       VARCHAR(255),
    logo_url    TEXT,
    province    VARCHAR(100),
    district    VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ─── USERS ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('teacher','hod','principal','admin')),
    department      VARCHAR(150),
    employee_number VARCHAR(50),
    phone           VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    reset_token     VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,

  // ─── DEPARTMENTS ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS departments (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name      VARCHAR(150) NOT NULL,
    hod_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ─── LESSON PLANS ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS lesson_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Classification
    subject         VARCHAR(150) NOT NULL,
    grade           VARCHAR(50) NOT NULL,
    topic           VARCHAR(255) NOT NULL,
    lesson_date     DATE NOT NULL,
    term            VARCHAR(20) NOT NULL CHECK (term IN ('Term 1','Term 2','Term 3','Term 4')),
    duration_mins   SMALLINT NOT NULL DEFAULT 60,
    week_number     SMALLINT,

    -- Lesson body
    objectives      TEXT,
    introduction    TEXT,
    development     TEXT,
    consolidation   TEXT,
    assessment      TEXT,
    resources       TEXT,
    homework        TEXT,
    reflection      TEXT,       -- teacher fills in after the lesson

    -- Workflow
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','returned')),
    review_comment  TEXT,
    submitted_at    TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_lp_school_id    ON lesson_plans(school_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lp_teacher_id   ON lesson_plans(teacher_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lp_lesson_date  ON lesson_plans(lesson_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_lp_status       ON lesson_plans(status)`,
  `CREATE INDEX IF NOT EXISTS idx_lp_term         ON lesson_plans(term)`,
  `CREATE INDEX IF NOT EXISTS idx_lp_grade        ON lesson_plans(grade)`,

  // Full-text search index on topic + subject
  `CREATE INDEX IF NOT EXISTS idx_lp_fts ON lesson_plans
   USING GIN (to_tsvector('english', topic || ' ' || subject))`,

  // ─── ATTACHMENTS ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_plan_id  UUID NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    file_name       VARCHAR(255) NOT NULL,
    file_path       TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type       VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ─── REFRESH TOKENS ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_rt_user_id ON refresh_tokens(user_id)`,

  // ─── AUDIT LOG ────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_audit_school ON audit_log(school_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC)`,

  // ─── AUTO-UPDATE updated_at TRIGGER ───────────────────────
  `CREATE OR REPLACE FUNCTION update_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
   $$ LANGUAGE plpgsql`,

  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
       CREATE TRIGGER trg_users_updated_at
       BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
     END IF;
   END $$`,

  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lp_updated_at') THEN
       CREATE TRIGGER trg_lp_updated_at
       BEFORE UPDATE ON lesson_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
     END IF;
   END $$`,
];

async function migrate() {
  console.log('🗄  Running EduPlan database migrations…\n');
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      const preview = sql.trim().split('\n')[0].slice(0, 80);
      await client.query(sql);
      console.log(`  ✓ ${preview}`);
    }
    console.log('\n✅ All migrations completed successfully.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
