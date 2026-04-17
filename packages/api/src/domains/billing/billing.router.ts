import { Router } from "express";
import { PayInvoiceRequestSchema } from "./billing.schemas";
import { billingRepository } from "./billing.repository";

export const billingRouter = Router();

billingRouter.get("/invoices", (_req, res) => {
  res.json(billingRepository.listInvoices());
});

billingRouter.get("/invoices/:id", (req, res) => {
  const invoice = billingRepository.getInvoice(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  res.json(invoice);
});

billingRouter.post("/invoices/:id/pay", (req, res) => {
  const parsed = PayInvoiceRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payment request" });
  }
  const invoice = billingRepository.payInvoice(
    req.params.id,
    parsed.data.paymentMethodId,
  );
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  res.json(invoice);
});

billingRouter.get("/transactions", (_req, res) => {
  res.json(billingRepository.listTransactions());
});

billingRouter.get("/summary", (_req, res) => {
  res.json(billingRepository.getSummary());
});
