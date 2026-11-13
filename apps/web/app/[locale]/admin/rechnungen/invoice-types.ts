/** What `/api/invoices` returns; shared by the list and the printed Rechnung. */

export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid" | "cancelled";

export interface InvoiceLine {
  label: string;
  /** Gross, VAT included, in euros. */
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  orderId: string;
  orderReference: string | null;
  orderStatus: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  netAmount: string;
  vatRate: string;
  vatAmount: string;
  totalGross: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    vatId?: string;
    reference?: string;
    serviceDates?: string[];
    serviceType?: string;
  };
  seller: Record<string, string>;
  sentAt: string | null;
  paidAt: string | null;
  remindersSent: number;
  lastReminderAt: string | null;
  createdAt: string;
}

/** The status pills, in the prototype's colours. */
export const INVOICE_COLOURS: Record<InvoiceStatus, [bg: string, fg: string]> = {
  draft: ["#f5f5f0", "#4a514d"],
  sent: ["#eef3fb", "#2d5a8c"],
  overdue: ["#fff1f3", "#b7122b"],
  paid: ["#edf5ed", "#3f705a"],
  cancelled: ["#f5f5f0", "#92958e"],
};
