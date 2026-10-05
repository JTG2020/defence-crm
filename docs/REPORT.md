# REPORT — PRD pass

## Status per part
PRD.md (requirements only): DONE
  evidence: `write PRD.md` -> file created, 197 lines; every italic-quoted brief span re-checked against `_extracted/requirements.txt` with a script (`quotes checked` / `NOT IN BRIEF` list). Remaining non-verbatim spans are either workbook quotes (marked) or intentional ellipsis joins of verbatim fragments.
Asset extraction: DONE
  evidence: `unzip -o "Ram Prasad Assets-20261004T221206Z-1-001.zip" -d "_extracted"` -> 9 workbooks inflated; listed at `_extracted/Ram Prasad Assets/`.
Brief extraction: DONE
  evidence: `python3 ... PdfReader("Requirements.pdf")` -> `pages: 6`, `chars: 7223`.

## What broke and how I fixed it
- No `pdftotext`, no Python PDF/Excel libraries on the machine. Fixed by `pip install pypdf openpyxl xlrd` (exit 0), then extracted with `pypdf`.
- First verbatim check script had a logic bug (`q2 not in prd` was always false, so it never flagged anything). Fixed by checking only against the normalised source text; this surfaced two real misquotes ("win or lose" should be "win or loss"; a truncated colon), which were corrected.

## Claims ledger
| Claim | Command that proves it |
|---|---|
| The brief is 6 pages / 7,223 characters, extracted in full | `python3 -c "from pypdf import PdfReader; ..."` -> `pages: 6`, `chars: 7223` |
| The zip contains 9 workbooks | `unzip -o ... -d _extracted` -> 9 files inflated |
| Workbooks use anonymised names not in the brief | `openpyxl`/`xlrd` dumps -> `OEM A`, `OEM B`, `OEM-ABC`, `Inverbrass`, `Supreme Q`, `HAL`, `BEL`, `BEML` |
| Every quote attributed to the brief is verbatim | Python check over `_extracted/requirements.txt` -> only workbook/marked/ellipsis spans returned NOT-IN-BRIEF |
| Tables render with a consistent 2-column shape | table-integrity script -> `cols(pipes) 3` for both tables |
| No technology choice or build order is present | PRD sections 0–6; stack paragraph explicitly deferred to `TECH-STACK.md` |

Unproven / deliberately not claimed:
- UNVERIFIED: the real firm name, customer list and OEM list. The brief does not name them; the workbook names are placeholders. Recorded as open questions 6.
- UNVERIFIED: who invoices whom and when commission is earned. The brief asks for confirmation "with one real transaction"; not available here.

## What I would tell the next person
- The two hardest requirements (quantity coverage, bid intelligence) rest on facts the brief itself leaves open (its Open Questions 1 and 5). Do not write the data model or the `TECH-STACK.md` until the client answers them with real examples — especially Open Question 8 in PRD §6 (whether an RFI's 500 part numbers are independent line items).
- "Quotation prep takes 3 to 4 days (partly because it is never urgent)" is the sentence said in passing that changes the plan: the daily cost is follow-ups (3–4 hours/day) and unsearchable history, not quote-entry speed.
- Do not build automation the brief forbids as baseline (portal/auto-send) just because the client's own workbook asks for it.
