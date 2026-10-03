# DEF-STU-010 — Student CSV template contains a live sample row

## Status
Open

## Severity
S3

## TC
STU-010

## Steps
1. Sign in as Super Admin on `http://localhost:5173`.
2. Open Master Sheet and download **Template**.

## Expected
Header row only, or an example row the importer will not save as a student.

## Actual
`master-sheet-template.csv` headers are correct, and row 2 is a complete student:

`STU-2026-100, Sample Student, Karachi Branch, Fatima Noor, University of Manchester, Applied, GBP`

Those names match seeded masters, so **Import CSV** of the template will create or update that student.
