import { Router } from "express";
import {
  AdvanceStepRequestSchema,
  CreateAccountRequestSchema,
} from "./accounts.schemas";
import {
  AccountNotFoundError,
  InvalidStepError,
  accountsRepository,
} from "./accounts.repository";

export const accountsRouter = Router();

accountsRouter.get("/", (_req, res) => {
  res.json(accountsRepository.list());
});

accountsRouter.get("/progress", (_req, res) => {
  res.json(accountsRepository.getProgress());
});

accountsRouter.get("/:id", (req, res) => {
  const account = accountsRepository.get(req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json(account);
});

accountsRouter.post("/", (req, res) => {
  const parsed = CreateAccountRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid request", issues: parsed.error.issues });
  }
  const account = accountsRepository.create(parsed.data);
  res.status(201).json(account);
});

accountsRouter.post("/:id/advance", (req, res) => {
  const parsed = AdvanceStepRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid request", issues: parsed.error.issues });
  }

  try {
    const account = accountsRepository.advanceStep(
      req.params.id,
      parsed.data.step,
    );
    res.json(account);
  } catch (err) {
    if (err instanceof AccountNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof InvalidStepError) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal error" });
  }
});
