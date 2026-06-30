import "dotenv/config";
import { app } from "./app";
import {
  ensureBudgetSettingsTable,
  ensureBudgetsTable,
  ensureContractTimelineTable,
  ensureLandingSettings,
  ensureMeetingTables,
  ensureUserDiscountsTable,
  ensureUsersTable,
} from "./config/database";

const port = Number(process.env.PORT || 3000);

async function bootstrap(): Promise<void> {
  await ensureUsersTable();
  await ensureLandingSettings();
  await ensureBudgetsTable();
  await ensureBudgetSettingsTable();
  await ensureUserDiscountsTable();
  await ensureContractTimelineTable();
  await ensureMeetingTables();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
