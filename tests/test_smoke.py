#!/usr/bin/env python3
"""Import + behavior smoke test for the local AACT SQL gateway.

Runs without a database driver or AACT credentials: it only exercises the
pure-Python guards (SELECT-only validation, forbidden-token blocking, and
$N -> %s placeholder conversion). Exits non-zero on any failure so it can be
used as a CI / pre-push smoke gate (`npm run test:smoke`).
"""

import os
import sys

# Make the repo root importable regardless of the working directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import aact_local_gateway as gw  # noqa: E402

failures = []


def check(name, cond):
    if cond:
        print(f"  PASS  {name}")
    else:
        print(f"  FAIL  {name}")
        failures.append(name)


# SELECT-only guard: a valid read query targeting ctgov is accepted.
ok, _ = gw.validate_sql("SELECT nct_id FROM ctgov.studies WHERE phase = $1")
check("valid SELECT on ctgov is allowed", ok is True)

# Non-SELECT statements are rejected.
ok, _ = gw.validate_sql("UPDATE ctgov.studies SET x = 1")
check("UPDATE statement is rejected", ok is False)

# Queries not targeting the ctgov schema are rejected.
ok, _ = gw.validate_sql("SELECT 1 FROM pg_catalog.pg_tables")
check("non-ctgov query is rejected", ok is False)

# Forbidden tokens are blocked even inside an otherwise-SELECT query.
ok, _ = gw.validate_sql("SELECT 1 FROM ctgov.studies; DROP TABLE ctgov.studies")
check("embedded DROP is rejected", ok is False)

# Placeholder conversion: $1/$2 map to %s in order.
converted, params = gw.convert_postgres_placeholders(
    "SELECT * FROM ctgov.studies WHERE a = $1 AND b = $2", ["x", "y"]
)
check("placeholders converted to %s", converted.count("%s") == 2 and "$1" not in converted)
check("placeholder params preserved in order", params == ["x", "y"])

# Out-of-range placeholder index raises rather than silently mis-binding.
try:
    gw.convert_postgres_placeholders("SELECT $5", ["only-one"])
    check("out-of-range placeholder raises", False)
except RuntimeError:
    check("out-of-range placeholder raises", True)

if failures:
    print(f"\nSMOKE FAILED: {len(failures)} check(s) failed: {failures}")
    sys.exit(1)

print("\nSMOKE OK")
sys.exit(0)
