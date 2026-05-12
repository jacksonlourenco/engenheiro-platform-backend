import { Router } from "express";
import { lookupCep } from "../controllers/cep.controller";

const utilsRoutes = Router();

// Public endpoint used to auto-fill address fields in the dashboard.
utilsRoutes.get("/cep/:cep", lookupCep);

export { utilsRoutes };

