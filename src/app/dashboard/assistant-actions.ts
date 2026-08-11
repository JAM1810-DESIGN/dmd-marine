"use server";

import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AssistantState = { reply?: string; error?: string };

const SYSTEM_PROMPT = `You are the in-app help assistant for the DMD Marine platform, an internal
management system for a marine consultancy. Answer staff questions about how to use the app and
general work questions, concisely and practically.

The app has these areas (all under the dashboard):
- Bookings: incoming service requests. Views: calendar, table (search/filter/sort/export), and a
  status board (New → Reviewing → Scheduled → In progress → Completed → Cancelled). Click a customer
  name for a detail drawer. Assign a consultant, change status (guarded transitions), add to CRM,
  schedule, create a project, or generate an invoice.
- Customers: companies and customers directory (table/card views, search, sort, CSV export). A
  customer profile shows lifetime revenue, outstanding balance, bookings, active projects, plus
  vessels, contact history, projects, and invoices.
- Consultants (admins only): directory with workload, availability (Available/Not available/Onboard),
  and performance; table/card views; a profile page with assigned bookings, active projects, and
  upcoming schedule. Consultants have a base location used to suggest the nearest consultant on new
  projects.
- Services: catalog of categories and services with base pricing (editable inline), required forms,
  and default consultant.
- Projects: engagements with a table and Kanban board (by status), a required-forms progress bar,
  and a detail page showing revenue, expenses, margin, invoices, and schedules.
- Documents & Forms: company documents with file type, uploader, usage, and expiry tracking.
- Calendar: schedules with consultant/type filters, a legend, month/week/day/agenda views, and
  clickable events linked to their booking or project.
- Messages: internal staff mail with reply and AI-drafted replies.
- Finance: invoices, expenses, reports.

Rules: keep answers short and actionable. If a question is about something the app does, give the
click path (e.g. "Dashboard → Services → click the price"). If you are unsure whether a feature
exists, say so rather than inventing UI. Do not claim to perform actions — you only advise.`;

export async function askAssistant(messages: ChatMessage[]): Promise<AssistantState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");

  const { allowed, retryAfterSeconds } = await rateLimit(`ai-assistant:${session.user.id}`, 20, 60 * 1000);
  if (!allowed) {
    return { error: `Too many requests. Try again in ${retryAfterSeconds ?? 60}s.` };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "AI is not configured. Add ANTHROPIC_API_KEY to your .env to enable the assistant." };
  }

  const trimmed = messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-20);
  if (trimmed.length === 0) return { error: "Ask a question first." };

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: trimmed.map((message) => ({ role: message.role, content: message.content })),
    });

    if (response.stop_reason === "refusal") {
      return { error: "The assistant declined to answer that." };
    }

    const reply = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    if (!reply) return { error: "The assistant returned an empty answer." };
    return { reply };
  } catch {
    return { error: "Couldn't reach the AI service. Check the API key and try again." };
  }
}
