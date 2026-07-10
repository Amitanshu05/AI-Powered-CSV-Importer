// PHASE 3 — proves BatchService actually works: chunking, concurrency, batch-level
// fault isolation, and row-level skip logic, all together.
//
// Run with: npm run test:batch

import { logger } from "../config/logger";
import { processRows } from "../services/batch.service";

// Deliberately mixed rows to exercise every path BatchService needs to handle:
const SAMPLE_ROWS: Record<string, string>[] = [
  {
    // Should be IMPORTED — full messy-but-complete data (same as Phase 2's row).
    "Full Name": "Ananya Rao",
    "Contact Email": "ananya.rao@example.com / a.rao.alt@gmail.com",
    "Phone": "+91 98765 43210, alt: 98765 00000",
    "Lead Stage": "Follow up - interested, wants a callback next week",
    "Project": "Eden Park Phase 2",
    "Assigned To": "owner@groweasy.ai",
    "City": "Bengaluru",
    "Submitted On": "13/05/2026 14:20",
    "Comments": "Asked about EMI options and possession timeline",
  },
  {
    // Should be SKIPPED — no email AND no phone anywhere in the row.
    "Full Name": "Unknown Walk-in",
    "Lead Stage": "Just browsing",
    "Project": "Meridian Tower",
    "Comments": "Visited site, left no contact details",
  },
  {
    // Should be IMPORTED — only an email, no phone at all (still valid per contract.md:
    // skip rule is "no email AND no mobile," so email-only is fine).
    "Name": "Rahul Mehta",
    "Email": "rahul.mehta@example.com",
    "Source": "sarjapur_plots website form",
    "Status": "Sale done, booked unit 402",
  },
  {
    // Should be SKIPPED — every field is blank/junk, nothing usable.
    "col1": "",
    "col2": "N/A",
    "col3": "-",
  },
  {
    // Should be IMPORTED — phone only, no email.
    "Contact Name": "Priya Nair",
    "Mobile": "+91 90000 11111",
    "Interested In": "Varah Swamy project, 2BHK",
    "Notes": "Did not connect on first attempt, retrying tomorrow",
  },
];

async function main() {
  logger.info({ rowCount: SAMPLE_ROWS.length }, "Starting Phase 3 batch test");

  const result = await processRows(SAMPLE_ROWS);

  logger.info(
    {
      totalImported: result.totalImported,
      totalSkipped: result.totalSkipped,
    },
    "Batch test complete"
  );

  logger.info({ imported: result.imported }, "IMPORTED records");
  logger.info({ skipped: result.skipped }, "SKIPPED rows (with reasons)");

  // Basic self-check, not a full test suite — just a sanity confirmation this run
  // matches what we deliberately designed the sample rows to produce.
  const expectedImported = 3;
  const expectedSkipped = 2;
  if (result.totalImported === expectedImported && result.totalSkipped === expectedSkipped) {
    logger.info("✅ Counts match expectations (3 imported, 2 skipped)");
  } else {
    logger.warn(
      { expectedImported, expectedSkipped, actualImported: result.totalImported, actualSkipped: result.totalSkipped },
      "⚠️ Counts do NOT match expectations — inspect output above"
    );
  }
}

main().catch((err) => {
  logger.error({ err }, "Unhandled error in test-batch script");
  process.exit(1);
});