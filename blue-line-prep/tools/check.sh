#!/bin/sh
# Blue Line Prep — engine checks. Run from the repo root BEFORE every commit
# that touches src/blue-line-prep.html:
#
#   sh blue-line-prep/tools/check.sh [git-ref] [weeks]
#
#   git-ref  the version whose output must not change for weeks already
#            trained (default: HEAD)
#   weeks    how many weeks, counted from Week 1, must build byte-identically
#            (default: 4 — raise it to the last COMPLETED week as time passes)
#
# It pulls the pure-JS engine out of the app file (everything from
# `const STORE=` up to the icons section), runs it in Node, and:
#   1. compares every day of the protected weeks, under eight contexts,
#      against the reference version — any difference can orphan check-offs
#      on his phone, because they are keyed by item POSITION;
#   2. checks that every item id has a library entry;
#   3. runs the rule checks in unit.cjs (shin rules, run caps, missed days).
# See blue-line-prep/HANDOFF.md §1 and §9.
set -e
REF="${1:-HEAD}"; WEEKS="${2:-4}"
T="$(cd "$(dirname "$0")" && pwd)"; D="$(mktemp -d)"
ex(){ awk '/^const STORE="blp-v6";/{p=1} /^\/\* ── icons /{p=0} p' "$1" > "$2"; }
git show "$REF:src/blue-line-prep.html" > "$D/base.html"
ex "$D/base.html" "$D/base.js"
ex src/blue-line-prep.html "$D/new.js"
node "$T/dump.cjs" "$D/base.js" "$D/base.json" > /dev/null
node "$T/dump.cjs" "$D/new.js" "$D/new.json" | head -1
node "$T/cmp.cjs" "$D/base.json" "$D/new.json" "$WEEKS"
node "$T/unit.cjs" "$D/new.js" | grep -v "^PASS" || true
echo "week-by-week: node $T/show.cjs $D/new.json A 5,6,7   (contexts A–H are defined in dump.cjs)"
