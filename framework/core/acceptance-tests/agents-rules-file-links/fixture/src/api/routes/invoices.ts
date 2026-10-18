import { grossTotal, type Invoice } from "../../billing/invoice.ts";

/** POST /invoices/total — returns the gross total for the posted invoice. */
export async function handleInvoiceTotal(req: Request): Promise<Response> {
  const invoice = await req.json() as Invoice;
  return Response.json({ total: grossTotal(invoice) });
}
