import { Request, Response } from "express";
import { pool } from "../config/database";

export async function getMyTimeline(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const contractsResult = await pool.query(
    `
      SELECT id, result, created_at
      FROM budgets
      WHERE user_id = $1 AND accepted = TRUE AND contract_active = TRUE
      ORDER BY created_at DESC
    `,
    [userId],
  );

  const contracts = [];
  for (const budget of contractsResult.rows) {
    const itemsResult = await pool.query(
      `
        SELECT id, budget_id, title, description, deadline, status, created_at, updated_at
        FROM contract_timeline_items
        WHERE budget_id = $1
        ORDER BY COALESCE(deadline, created_at::date), id
      `,
      [budget.id],
    );

    contracts.push({
      budgetId: budget.id,
      result: budget.result,
      createdAt: budget.created_at,
      items: itemsResult.rows,
    });
  }

  return res.status(200).json({
    contractActive: contracts.length > 0,
    contracts,
  });
}
