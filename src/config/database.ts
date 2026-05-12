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
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile TEXT NOT NULL,
      answers JSONB NOT NULL,
      result JSONB NOT NULL,
      accepted BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
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
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      percent NUMERIC NOT NULL,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export {
  pool,
  ensureUsersTable,
  ensureLandingSettings,
  ensureBudgetsTable,
  ensureBudgetSettingsTable,
  ensureUserDiscountsTable,
};
