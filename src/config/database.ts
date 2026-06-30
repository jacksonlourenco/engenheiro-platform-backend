import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureUsersTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      cpf TEXT,
      phone TEXT,
      address TEXT,
      address_number TEXT,
      gender TEXT,
      birth_date DATE,
      marital_status TEXT,
      children_count INTEGER,
      role TEXT NOT NULL DEFAULT 'user',
      contract_active BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_token TEXT,
      email_verification_expires TIMESTAMPTZ,
      reset_password_token TEXT,
      reset_password_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS address_number TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS children_count INTEGER");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_active BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ");
}

async function ensureLandingSettings(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS landing_settings (
      id INTEGER PRIMARY KEY,
      content JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);

  await pool.query("INSERT INTO landing_settings (id, content) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING");
}

async function ensureBudgetsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      profile TEXT NOT NULL,
      answers JSONB NOT NULL,
      result JSONB NOT NULL,
      accepted BOOLEAN NOT NULL DEFAULT FALSE,
      contract_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS contract_active BOOLEAN NOT NULL DEFAULT FALSE");
}

async function ensureBudgetSettingsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_settings (
      id INTEGER PRIMARY KEY,
      content JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);

  await pool.query("INSERT INTO budget_settings (id, content) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING");
}

async function ensureUserDiscountsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_discounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      percent NUMERIC NOT NULL,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE user_discounts ADD COLUMN IF NOT EXISTS id BIGSERIAL");
  await pool.query(`
    DO $$
    DECLARE
      primary_key_name TEXT;
    BEGIN
      SELECT constraint_info.conname
      INTO primary_key_name
        FROM pg_constraint constraint_info
        JOIN pg_attribute column_info
          ON column_info.attrelid = constraint_info.conrelid
         AND column_info.attnum = ANY(constraint_info.conkey)
        WHERE constraint_info.conrelid = 'user_discounts'::regclass
          AND constraint_info.contype = 'p'
          AND column_info.attname = 'user_id'
        LIMIT 1;

      IF primary_key_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE user_discounts DROP CONSTRAINT %I', primary_key_name);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'user_discounts'::regclass AND contype = 'p'
      ) THEN
        ALTER TABLE user_discounts ADD CONSTRAINT user_discounts_pkey PRIMARY KEY (id);
      END IF;
    END $$;
  `);
  await pool.query("ALTER TABLE user_discounts ALTER COLUMN user_id DROP NOT NULL");
  await pool.query("CREATE INDEX IF NOT EXISTS user_discounts_user_period_idx ON user_discounts (user_id, starts_at, ends_at)");

  const legacyResult = await pool.query("SELECT content->'globalDiscount' AS discount FROM budget_settings WHERE id = 1");
  const legacyDiscount = legacyResult.rows[0]?.discount;
  const legacyPercent = Number(legacyDiscount?.percent);
  if (legacyDiscount && Number.isFinite(legacyPercent) && legacyPercent > 0 && legacyPercent <= 100) {
    await pool.query(
      `
        INSERT INTO user_discounts (user_id, percent, starts_at, ends_at)
        SELECT NULL, $1, $2, $3
        WHERE NOT EXISTS (SELECT 1 FROM user_discounts WHERE user_id IS NULL)
      `,
      [legacyPercent, legacyDiscount.startsAt || null, legacyDiscount.endsAt || null],
    );
    await pool.query("UPDATE budget_settings SET content = content - 'globalDiscount' WHERE id = 1");
  }
}

async function ensureContractTimelineTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_timeline_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      deadline DATE,
      status TEXT NOT NULL DEFAULT 'pendente',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE contract_timeline_items ADD COLUMN IF NOT EXISTS budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE contract_timeline_items ADD COLUMN IF NOT EXISTS description TEXT");
  await pool.query("ALTER TABLE contract_timeline_items ADD COLUMN IF NOT EXISTS deadline DATE");
  await pool.query("ALTER TABLE contract_timeline_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'");
  await pool.query("ALTER TABLE contract_timeline_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
}

async function ensureMeetingTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_availability (
      id SERIAL PRIMARY KEY,
      meeting_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
      availability_id INTEGER REFERENCES meeting_availability(id) ON DELETE SET NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE meeting_bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled'");
  await pool.query("ALTER TABLE meeting_bookings ADD COLUMN IF NOT EXISTS budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE");
  await pool.query("CREATE INDEX IF NOT EXISTS meeting_bookings_budget_idx ON meeting_bookings (budget_id, starts_at)");
  await pool.query(`
    UPDATE meeting_bookings mb
    SET budget_id = (
      SELECT b.id
      FROM budgets b
      WHERE b.user_id = mb.user_id AND b.accepted = TRUE AND b.contract_active = TRUE
      ORDER BY b.created_at DESC
      LIMIT 1
    )
    WHERE mb.budget_id IS NULL
  `);
  await pool.query(`
    WITH ranked_bookings AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY budget_id ORDER BY created_at DESC, id DESC) AS position
      FROM meeting_bookings
      WHERE status = 'scheduled' AND budget_id IS NOT NULL
    )
    UPDATE meeting_bookings booking
    SET status = 'rescheduled'
    FROM ranked_bookings ranked
    WHERE booking.id = ranked.id AND ranked.position > 1
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS meeting_bookings_one_scheduled_per_contract_idx
    ON meeting_bookings (budget_id)
    WHERE status = 'scheduled' AND budget_id IS NOT NULL
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'meeting_bookings_budget_required'
      ) THEN
        ALTER TABLE meeting_bookings
          ADD CONSTRAINT meeting_bookings_budget_required
          CHECK (budget_id IS NOT NULL) NOT VALID;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM meeting_bookings WHERE budget_id IS NULL) THEN
        ALTER TABLE meeting_bookings VALIDATE CONSTRAINT meeting_bookings_budget_required;
      END IF;
    END $$;
  `);

  await pool.query("ALTER TABLE contract_timeline_items ADD COLUMN IF NOT EXISTS meeting_booking_id INTEGER UNIQUE REFERENCES meeting_bookings(id) ON DELETE SET NULL");
  await pool.query(`
    INSERT INTO contract_timeline_items
      (user_id, budget_id, meeting_booking_id, title, description, deadline, status)
    SELECT
      mb.user_id,
      mb.budget_id,
      mb.id,
      'Reuniao agendada - ' || to_char(mb.starts_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      'Reuniao de 30 minutos agendada pelo cliente.',
      (mb.starts_at AT TIME ZONE 'America/Sao_Paulo')::date,
      'pendente'
    FROM meeting_bookings mb
    WHERE mb.budget_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM contract_timeline_items item WHERE item.meeting_booking_id = mb.id
      )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_block_rules (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      block_type TEXT NOT NULL,
      block_date DATE,
      end_date DATE,
      weekday INTEGER,
      start_time TIME,
      end_time TIME,
      persistent BOOLEAN NOT NULL DEFAULT TRUE,
      annual BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE meeting_block_rules ADD COLUMN IF NOT EXISTS persistent BOOLEAN NOT NULL DEFAULT TRUE");
  await pool.query("ALTER TABLE meeting_block_rules ADD COLUMN IF NOT EXISTS end_date DATE");
  await pool.query("ALTER TABLE meeting_block_rules ADD COLUMN IF NOT EXISTS annual BOOLEAN NOT NULL DEFAULT FALSE");
}

export {
  pool,
  ensureUsersTable,
  ensureLandingSettings,
  ensureBudgetsTable,
  ensureBudgetSettingsTable,
  ensureUserDiscountsTable,
  ensureContractTimelineTable,
  ensureMeetingTables,
};
