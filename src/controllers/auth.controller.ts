import crypto from "crypto";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";

const cpfRegex = /^\d{11}$/;
const phoneRegex = /^\d{11}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const allowedGenders = new Set(["masculino", "feminino", "outro"]);
const allowedMarital = new Set(["solteiro", "casado", "divorciado", "viuvo"]);

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined.");
  }

  return secret;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function parseBirthDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function isProfileComplete(user: any): boolean {
  return (
    Boolean(user.phone) &&
    Boolean(user.address) &&
    Boolean(user.address_number) &&
    Boolean(user.gender) &&
    Boolean(user.birth_date) &&
    Boolean(user.marital_status) &&
    user.children_count !== null &&
    user.children_count !== undefined
  );
}

export async function register(req: Request, res: Response): Promise<Response> {
  const { name, email, password, cpf, phone } = req.body;

  if (!name || !email || !password || !cpf || !phone) {
    return res.status(400).json({ message: "name, email, password, cpf and phone are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCpf = String(cpf).trim();
  const normalizedPhone = String(phone).trim();
  const normalizedName = String(name).trim();

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email." });
  }

  if (!cpfRegex.test(normalizedCpf)) {
    return res.status(400).json({ message: "CPF must contain 11 digits only." });
  }

  if (!phoneRegex.test(normalizedPhone)) {
    return res.status(400).json({ message: "Phone must contain DDD + 9 digits (11 numbers)." });
  }

  if (normalizedName.split(/\s+/).length < 2) {
    return res.status(400).json({ message: "Full name (first and last) is required." });
  }

  const existingUser = await pool.query(
    "SELECT id, email, cpf, phone FROM users WHERE email = $1 OR cpf = $2 OR phone = $3",
    [normalizedEmail, normalizedCpf, normalizedPhone],
  );

  if (existingUser.rowCount && existingUser.rowCount > 0) {
    return res.status(409).json({ message: "Email, CPF or phone already in use." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const emailToken = generateToken();
  const emailTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const createdUser = await pool.query(
    `
      INSERT INTO users (name, email, password, cpf, phone, role, email_verified, email_verification_token, email_verification_expires)
      VALUES ($1, $2, $3, $4, $5, 'user', TRUE, $6, $7)
      RETURNING id, name, email, cpf, phone, role, created_at, contract_active
    `,
    [normalizedName, normalizedEmail, hashedPassword, normalizedCpf, normalizedPhone, emailToken, emailTokenExpires],
  );

  return res.status(201).json(createdUser.rows[0]);
}

export async function verifyEmail(req: Request, res: Response): Promise<Response> {
  const token = String(req.query.token || "").trim();

  if (!token) {
    return res.status(400).send("Token invalido.");
  }

  const result = await pool.query(
    `
      UPDATE users
      SET email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE email_verification_token = $1
        AND email_verification_expires > NOW()
      RETURNING id
    `,
    [token],
  );

  if (!result.rowCount) {
    return res.status(400).send("Token invalido ou expirado.");
  }

  return res.status(200).send("Email verificado com sucesso. Voce ja pode fazer login.");
}

export async function login(req: Request, res: Response): Promise<Response> {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "identifier and password are required." });
  }

  const normalizedIdentifier = String(identifier).trim().toLowerCase();
  const isEmail = normalizedIdentifier.includes("@");

  if (isEmail && !emailRegex.test(normalizedIdentifier)) {
    return res.status(400).json({ message: "Invalid email." });
  }

  if (!isEmail && !cpfRegex.test(normalizedIdentifier)) {
    return res.status(400).json({ message: "CPF must contain 11 digits only." });
  }

  const userResult = await pool.query(
    isEmail
      ? "SELECT id, email, password, email_verified, role FROM users WHERE email = $1"
      : "SELECT id, email, password, email_verified, role FROM users WHERE cpf = $1",
    [normalizedIdentifier],
  );

  if (!userResult.rowCount || userResult.rowCount === 0) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const user = userResult.rows[0] as {
    id: number;
    email: string;
    password: string;
    email_verified: boolean;
    role: string;
  };

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "1d" },
  );

  return res.status(200).json({ token, role: user.role });
}

export async function updateProfile(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const { address, addressNumber, gender, birthDate, maritalStatus, childrenCount, phone } = req.body;

  const normalizedAddress = address ? String(address).trim() : null;
  const normalizedAddressNumber = addressNumber ? String(addressNumber).trim() : null;
  const normalizedGender = gender ? String(gender).trim().toLowerCase() : null;
  const normalizedMarital = maritalStatus ? String(maritalStatus).trim().toLowerCase() : null;
  const normalizedBirthDate = birthDate ? parseBirthDate(String(birthDate).trim()) : null;
  const normalizedChildren = childrenCount === undefined || childrenCount === null ? null : Number(childrenCount);
  const normalizedPhone = phone === undefined ? null : String(phone).trim();

  if (normalizedGender && !allowedGenders.has(normalizedGender)) {
    return res.status(400).json({ message: "Invalid gender." });
  }

  if (normalizedMarital && !allowedMarital.has(normalizedMarital)) {
    return res.status(400).json({ message: "Invalid marital status." });
  }

  if (normalizedBirthDate === null && birthDate) {
    return res.status(400).json({ message: "Invalid birth date." });
  }

  if (normalizedChildren !== null && (!Number.isInteger(normalizedChildren) || normalizedChildren < 0)) {
    return res.status(400).json({ message: "Invalid children count." });
  }

  // Phone can be edited, but must never be empty/null when provided.
  if (phone !== undefined) {
    if (!normalizedPhone) {
      return res.status(400).json({ message: "Phone is required." });
    }
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({ message: "Phone must contain DDD + 9 digits (11 numbers)." });
    }
  }

  await pool.query(
    `
      UPDATE users
      SET address = $1,
          address_number = $2,
          gender = $3,
          birth_date = $4,
          marital_status = $5,
          children_count = $6,
          phone = COALESCE($7, phone)
      WHERE id = $8
    `,
    [
      normalizedAddress,
      normalizedAddressNumber,
      normalizedGender,
      normalizedBirthDate,
      normalizedMarital,
      normalizedChildren,
      normalizedPhone,
      userId,
    ],
  );

  const userResult = await pool.query(
    `
      SELECT id, name, email, cpf, phone, address, address_number, gender, birth_date, marital_status, children_count,
             email_verified, role, contract_active, created_at
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  const user = userResult.rows[0];
  return res.status(200).json({ ...user, profile_complete: isProfileComplete(user) });
}

export async function forgotPassword(req: Request, res: Response): Promise<Response> {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "email is required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email." });
  }

  const userResult = await pool.query(
    "SELECT id, name, email FROM users WHERE email = $1",
    [normalizedEmail],
  );

  if (!userResult.rowCount) {
    return res.status(200).json({ message: "If the email exists, a reset link was sent." });
  }

  const user = userResult.rows[0] as { id: number; name: string; email: string };
  const resetToken = generateToken();
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

  await pool.query(
    `
      UPDATE users
      SET reset_password_token = $1,
          reset_password_expires = $2
      WHERE id = $3
    `,
    [resetToken, resetExpires, user.id],
  );

  return res.status(200).json({ message: "If the email exists, a reset link was sent." });
}

export async function resetPassword(req: Request, res: Response): Promise<Response> {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "token and password are required." });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const userResult = await pool.query(
    `
      SELECT id
      FROM users
      WHERE reset_password_token = $1
        AND reset_password_expires > NOW()
    `,
    [token],
  );

  if (!userResult.rowCount) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(
    `
      UPDATE users
      SET password = $1,
          reset_password_token = NULL,
          reset_password_expires = NULL
      WHERE id = $2
    `,
    [hashedPassword, userResult.rows[0].id],
  );

  return res.status(200).json({ message: "Password updated." });
}

export async function getProfile(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const userResult = await pool.query(
    `
      SELECT id, name, email, cpf, phone, address, address_number, gender, birth_date, marital_status, children_count,
             email_verified, role, contract_active, created_at
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  if (!userResult.rowCount) {
    return res.status(404).json({ message: "User not found." });
  }

  const user = userResult.rows[0];
  return res.status(200).json({ ...user, profile_complete: isProfileComplete(user) });
}

export async function getAdminProfile(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;

  const userResult = await pool.query(
    "SELECT id, name, email, role FROM users WHERE id = $1",
    [userId],
  );

  if (!userResult.rowCount) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json(userResult.rows[0]);
}
