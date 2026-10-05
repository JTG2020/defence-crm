import type { AskRepository } from "@/lib/ask/ask";
import {
  documentsWithStatus,
  listOemRequestsAll,
  listQuotes,
  listRequirements,
  listUncoveredLines,
} from "./db";

// Builds the Ask repository from Postgres, so Ask and the screens read the same data and
// the same coverage view. The reads are the signed-in user's, so RLS applies.
export async function buildAskRepository(): Promise<AskRepository> {
  const [requirements, quotes, oemRequests, uncovered, documents] = await Promise.all([
    listRequirements(),
    listQuotes(),
    listOemRequestsAll(),
    listUncoveredLines(),
    documentsWithStatus(),
  ]);

  return {
    listRequirements: () => requirements,
    listQuotes: () => quotes,
    listOemRequests: () => oemRequests,
    listUncoveredLines: () => uncovered,
    documentsWithStatus: () => documents,
  };
}
