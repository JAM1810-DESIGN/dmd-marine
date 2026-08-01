# Admin Guide

For the person who runs the business day-to-day, not the developer deploying it. Assumes someone has already followed [DEPLOYMENT.md](./DEPLOYMENT.md) and the app is live.

## Roles

| Role | Can do |
|---|---|
| **Admin** | Everything. The only role that can manage staff accounts, site settings, and view the audit log. |
| **Manager** | Bookings, CRM, projects, calendar, messages, Facebook inbox, and finance *approval* (can approve/reject expenses, view reports/statements) but can't create invoices, record payments, or edit finance settings. |
| **Finance Officer** | Full finance module (expenses, invoices, payments, statements, reports, budgets, finance settings) plus everything Manager has outside finance. Can't manage staff accounts or site settings. |
| **Staff** | Bookings, CRM, projects, calendar, messages, Facebook inbox, and their *own* expense submissions only — no visibility into invoices, payments, statements, reports, budgets, or other people's expenses. |

There's no self-signup — every account is created by an Admin from **Settings → Staff Accounts**.

## First-time setup checklist

1. **Create your real staff accounts** (Settings → Staff Accounts → New User) and deactivate or delete the seeded dev admin (`admin@dmdmarine.dev`) — it's a known password and must not exist in production.
2. **Fill in Site Settings** (Settings → Site Settings) — company name, email, phone, address, and social links. These populate the public site's footer, contact page, and the Organization structured data search engines read.
3. **Add your service catalog** (Service Management) if it differs from the seeded defaults, or review/edit the seeded categories and services.
4. **Set up Finance reference data** (Finance → Settings) — branches, vendors, and expense categories, before anyone starts logging expenses or invoices.
5. **Connect integrations you're using**:
   - **Cloudinary** (file uploads) — add `CLOUDINARY_*` env vars and redeploy. Settings shows a connection-status badge once it's live.
   - **Facebook** (Messenger + Lead Ads) — add `FACEBOOK_*` env vars, then register the webhook URL shown in Settings with your Meta App.
6. **Review the audit log** (Settings → Audit Log, Admin only) periodically — it records sign-ins, staff account changes, expense approvals, and payments.

## Day-to-day

- **New inquiries and bookings** show up on the Dashboard Overview and trigger a notification (bell icon, top right) — click through to Bookings to review and assign a consultant.
- **The notification bell** covers new inquiries, new bookings, Facebook messages, upcoming appointment reminders (24h out), overdue invoices, and expenses awaiting approval. Click a notification to mark it read and jump to the relevant page; "Mark all read" clears the badge.
- **Reports** (top-level "Reports" in the sidebar) covers cross-module business metrics — inquiries, bookings, lead sources, customer growth, popular services. **Finance → Reports** is separate and covers financial reports (revenue/expense breakdowns, profitability, statements) — the two are intentionally split since one is business-analytics and the other is financially sensitive and role-gated more tightly.
- **Invoices are "PDF'd" via your browser's print dialog**, not a generated file — open an invoice and use Print/Save as PDF. There's no separate PDF library in play.

## Things that only an Admin should do

- Deactivating a user (Settings → Staff Accounts) immediately blocks their sign-in — it doesn't delete their historical data (their name still shows on bookings/expenses/invoices they created).
- You can't deactivate or change your own role — this is a deliberate guard so an Admin can't accidentally lock themselves out.
