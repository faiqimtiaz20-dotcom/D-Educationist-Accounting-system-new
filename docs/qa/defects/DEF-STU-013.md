# DEF-STU-013 — CSV import does not show which rows failed

## Status
Open

## Severity
S3

## TC
STU-013

## Steps
1. Import a CSV with one valid Karachi student, one row with no name, and one row whose university is `Not A Real Uni`.

## Expected
The UI lists each failed row number and the reason. The valid row is saved. The invalid rows are not.

## Actual
Valid code `QA-IMP-OK-munw2989` was created. `QA-BAD-UNI-munw2989` was not created. The page did not show the row numbers or the reasons (`Name is required`, `Unknown university`). `MasterSheetPage` puts the reasons in `console.warn` and the toast only says how many rows were skipped (`Imported: N created. M row(s) skipped`).
