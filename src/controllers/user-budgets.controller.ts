import { Request, Response } from "express";
import { pool } from "../config/database";
import { notifyAdminBudgetAccepted } from "../services/admin-budget-notify";

export async function listBudgets(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const result = await pool.query(
    "SELECT id, profile, answers, result, accepted, contract_active, created_at FROM budgets WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );

  return res.status(200).json(result.rows);
}

export async function createBudget(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const { profile, answers, result, accepted } = req.body || {};

  if (!profile || !answers || !result) {
    return res.status(400).json({ message: "Invalid payload." });
  }

  const created = await pool.query(
    `
      INSERT INTO budgets (user_id, profile, answers, result, accepted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, profile, answers, result, accepted, contract_active, created_at
    `,
    [userId, profile, answers, result, Boolean(accepted)],
  );

  const row = created.rows[0];
  if (row?.accepted) {
    notifyAdminBudgetAccepted({ budgetId: row.id, userId }).catch(() => {
      // best-effort
    });
  }

  return res.status(201).json(created.rows[0]);
}

export async function updateBudget(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;
  const budgetId = Number(req.params.id);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  if (!Number.isInteger(budgetId)) {
    return res.status(400).json({ message: "Invalid budget id." });
  }

  const { accepted } = req.body || {};

  const updated = await pool.query(
    `
      WITH prev AS (
        SELECT accepted
        FROM budgets
        WHERE id = $2 AND user_id = $3
      )
      UPDATE budgets
      SET accepted = $1,
          contract_active = CASE WHEN $1 = FALSE THEN FALSE ELSE contract_active END
      WHERE id = $2 AND user_id = $3
      RETURNING id, profile, answers, result, accepted, contract_active, created_at,
                (SELECT accepted FROM prev) AS prev_accepted
    `,
    [Boolean(accepted), budgetId, userId],
  );

  if (!updated.rowCount) {
    return res.status(404).json({ message: "Budget not found." });
  }

  const row = updated.rows[0];
  if (row?.accepted && !row?.prev_accepted) {
    notifyAdminBudgetAccepted({ budgetId: row.id, userId }).catch(() => {
      // best-effort
    });
  }

  // Do not expose prev_accepted to the client.
  delete row.prev_accepted;
  return res.status(200).json(row);
}
