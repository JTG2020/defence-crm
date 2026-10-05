import { LOSS_REASON_LABEL } from "../constants";
import type {
  CoverageRow,
  LossReason,
  OemRequest,
  Quote,
  Requirement,
  RequirementLine,
} from "../types";

// Deterministic question answering. No LLM, no invention: every answer comes from the
// repository (the same Postgres views the screens read) and carries the definition of how it
// was counted. When a question is not mapped it says so rather than guessing
// (docs/PRD.md module 10, A14).

export interface AskRepository {
  listRequirements(): Requirement[];
  listQuotes(): Quote[];
  listOemRequests(): OemRequest[];
  listUncoveredLines(): { line: RequirementLine; coverage: CoverageRow }[];
  documentsWithStatus(): {
    id: string;
    title: string;
    type: string;
    expiry_state: string;
    days_left: number | null;
  }[];
}

export interface AskRecord {
  label: string;
  detail: string;
  href: string;
}

export interface AskAnswer {
  kind: "answer" | "unknown";
  question: string;
  answer?: string;
  howCounted?: string;
  records?: AskRecord[];
  message?: string;
}

const TERMINAL = new Set(["won", "lost", "cancelled"]);

interface Pattern {
  id: string;
  test: RegExp;
  run: (repo: AskRepository) => Omit<AskAnswer, "kind" | "question">;
}

const PATTERNS: Pattern[] = [
  {
    id: "open_requirements",
    test: /\b(open|active)\b.*\b(requirement|rfi|enquir)|(requirement|rfi|enquir).*\b(open|active)\b/,
    run: (repo) => {
      const rows = repo.listRequirements().filter((r) => !TERMINAL.has(r.status));
      return {
        answer: `${rows.length} open requirement${rows.length === 1 ? "" : "s"}.`,
        howCounted: "Requirements whose status is not won, lost or cancelled.",
        records: rows.map((r) => ({
          label: r.ref,
          detail: `${r.customer} · ${r.status}`,
          href: `/requirements/${r.id}`,
        })),
      };
    },
  },
  {
    id: "quotes_awaiting",
    test: /\bquote/,
    run: (repo) => {
      const requirementById = new Map(repo.listRequirements().map((r) => [r.id, r]));
      const rows = repo
        .listQuotes()
        .filter((q) => q.status === "draft" || q.status === "pending_approval");
      return {
        answer: `${rows.length} quote${rows.length === 1 ? "" : "s"} awaiting a response.`,
        howCounted: "Quotes whose status is draft or pending approval.",
        records: rows.map((q) => {
          const requirement = requirementById.get(q.requirement_id);
          return {
            label: requirement?.ref ?? q.id,
            detail: `${requirement?.customer ?? ""} · ${q.status}`,
            href: "/quotes",
          };
        }),
      };
    },
  },
  {
    id: "oem_pending",
    test: /\boem\b|awaiting (a )?response|pending responses?/,
    run: (repo) => {
      const rows = repo.listOemRequests().filter((r) => r.responded_at === null);
      return {
        answer: `${rows.length} OEM response${rows.length === 1 ? "" : "s"} pending.`,
        howCounted: "OEM requests with no recorded response date.",
        records: rows.map((r) => ({
          label: r.oem_id,
          detail: `requested ${r.requested_at.slice(0, 10)}`,
          href: "/requirements",
        })),
      };
    },
  },
  {
    id: "why_lost",
    test: /why.*(lose|lost)|loss reasons?/,
    run: (repo) => {
      const counts = new Map<LossReason, number>();
      for (const r of repo.listRequirements()) {
        if (r.status === "lost" && r.loss_reason) {
          counts.set(r.loss_reason, (counts.get(r.loss_reason) ?? 0) + 1);
        }
      }
      const records = [...counts.entries()].map(([reason, count]) => ({
        label: LOSS_REASON_LABEL[reason],
        detail: `${count} lost`,
        href: "/requirements",
      }));
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      return {
        answer: `${total} lost, across ${records.length} reason${records.length === 1 ? "" : "s"}.`,
        howCounted: "Lost requirements grouped by their structured loss reason.",
        records,
      };
    },
  },
  {
    id: "won",
    test: /\b(won|win)\b/,
    run: (repo) => {
      const rows = repo.listRequirements().filter((r) => r.status === "won");
      return {
        answer: `${rows.length} requirement${rows.length === 1 ? "" : "s"} won.`,
        howCounted: "Requirements with status won.",
        records: rows.map((r) => ({
          label: r.ref,
          detail: r.customer,
          href: `/requirements/${r.id}`,
        })),
      };
    },
  },
  {
    id: "lost",
    test: /\b(lost|lose)\b/,
    run: (repo) => {
      const rows = repo.listRequirements().filter((r) => r.status === "lost");
      return {
        answer: `${rows.length} requirement${rows.length === 1 ? "" : "s"} lost.`,
        howCounted: "Requirements with status lost.",
        records: rows.map((r) => ({
          label: r.ref,
          detail: r.customer,
          href: `/requirements/${r.id}`,
        })),
      };
    },
  },
  {
    id: "documents_expiring",
    test: /document|expir|certificate/,
    run: (repo) => {
      const rows = repo
        .documentsWithStatus()
        .filter((d) => d.expiry_state === "expiring" || d.expiry_state === "expired");
      return {
        answer: `${rows.length} document${rows.length === 1 ? "" : "s"} expiring or expired.`,
        howCounted: "Documents whose expiry date is within 60 days or already past.",
        records: rows.map((d) => ({
          label: d.title,
          detail: `${d.expiry_state} · ${d.days_left}d`,
          href: "/documents",
        })),
      };
    },
  },
  {
    id: "uncovered",
    test: /uncovered|not covered|no cover|cannot be quoted|coverage/,
    run: (repo) => {
      const rows = repo.listUncoveredLines();
      return {
        answer: `${rows.length} line item${rows.length === 1 ? "" : "s"} with an uncovered balance.`,
        howCounted:
          "Open requirements only: line items where firm OEM commitments are less than the required quantity. Indications are not counted as cover; won, lost and cancelled requirements are excluded.",
        records: rows.map(({ line, coverage }) => ({
          label: line.part_number,
          detail: `uncovered ${coverage.uncovered_qty}`,
          href: `/requirements/${line.requirement_id}`,
        })),
      };
    },
  },
];

export function ask(question: string, repo: AskRepository): AskAnswer {
  const normalized = normalize(question);
  if (!normalized) {
    return {
      kind: "unknown",
      question,
      message: "Ask a question, for example: how many requirements are open?",
    };
  }

  for (const pattern of PATTERNS) {
    if (pattern.test.test(normalized)) {
      return { kind: "answer", question, ...pattern.run(repo) };
    }
  }

  return {
    kind: "unknown",
    question,
    message:
      "I can't answer that from the stored data. I only answer the named questions; I never guess.",
  };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const EXAMPLE_QUESTIONS = [
  "How many requirements are open?",
  "How many quotes are awaiting a response?",
  "How many OEM responses are pending?",
  "Which documents are expiring?",
  "Which lines are uncovered?",
  "Why did we lose?",
  "How many did we win?",
];
