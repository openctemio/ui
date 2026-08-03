#!/usr/bin/env bash
#
# check-spec-vendored.sh — the vendored spec must be the API's current spec.
#
# WHY: src/lib/api/openapi/swagger.yaml is a copy of api/api/openapi/swagger.yaml
# from openctemio/api, and the UI's wire types are generated from it. The
# in-repo drift check (scripts/generate-api-types.sh --check) proves the types
# match the copy. It cannot prove the copy still matches the server — and a copy
# that has silently fallen behind is precisely the failure this whole effort is
# about, just one hop further out. The UI would be generating a faithful client
# for a server that no longer exists.
#
# So this diffs the vendored file against the API repo. Set SPEC_SOURCE to a
# local checkout to run it offline; otherwise it fetches the branch named by
# API_REF (default: develop, which is what openctemio/api ships from).
#
# Usage:
#   scripts/check-spec-vendored.sh
#   SPEC_SOURCE=../api/api/openapi/swagger.yaml scripts/check-spec-vendored.sh
#   API_REF=main scripts/check-spec-vendored.sh
#
# To fix a failure:
#   cp <api>/api/openapi/swagger.yaml src/lib/api/openapi/swagger.yaml
#   npm run generate:api-types
#
# Exit codes: 0 = in sync, 1 = the API's spec moved, 2 = could not fetch.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDORED_REL="src/lib/api/openapi/swagger.yaml"
VENDORED="$REPO_ROOT/$VENDORED_REL"
API_REF="${API_REF:-develop}"
API_URL="https://raw.githubusercontent.com/openctemio/api/${API_REF}/api/openapi/swagger.yaml"

if [ ! -f "$VENDORED" ]; then
  echo "check-spec-vendored: $VENDORED_REL is missing." >&2
  exit 2
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
upstream="$tmpdir/swagger.yaml"

if [ -n "${SPEC_SOURCE:-}" ]; then
  if [ ! -f "$SPEC_SOURCE" ]; then
    echo "check-spec-vendored: SPEC_SOURCE '$SPEC_SOURCE' does not exist." >&2
    exit 2
  fi
  cp "$SPEC_SOURCE" "$upstream"
  origin="$SPEC_SOURCE"
else
  # A fetch failure must not read as "in sync" — that is the silently-inert
  # shape this repository has shipped before.
  if ! curl --fail --silent --show-error --location --max-time 60 \
        -o "$upstream" "$API_URL" 2>"$tmpdir/curl.err"; then
    echo "check-spec-vendored: could not fetch the API spec from $API_URL" >&2
    sed 's/^/  /' "$tmpdir/curl.err" >&2
    exit 2
  fi
  origin="$API_URL"
fi

if [ ! -s "$upstream" ]; then
  echo "check-spec-vendored: fetched an empty spec from $origin." >&2
  exit 2
fi

if diff -u "$VENDORED" "$upstream" >"$tmpdir/spec.diff" 2>&1; then
  echo "check-spec-vendored: $VENDORED_REL matches openctemio/api@$API_REF."
  exit 0
fi

{
  echo
  echo "────────────────────────────────────────────────────────────────────────────"
  echo "The vendored OpenAPI spec is out of date."
  echo
  echo "$VENDORED_REL differs from"
  echo "$origin"
  echo
  echo "The UI generates its API wire types from the vendored copy, so while this"
  echo "is stale the generated types describe a server that has moved on."
  echo
  echo "Fix:"
  echo "    cp <api-checkout>/api/openapi/swagger.yaml $VENDORED_REL"
  echo "    npm run generate:api-types"
  echo
  echo "Diff (vendored → upstream), first 120 lines:"
  echo "────────────────────────────────────────────────────────────────────────────"
  head -n 120 "$tmpdir/spec.diff"
  lines="$(wc -l <"$tmpdir/spec.diff")"
  [ "$lines" -gt 120 ] && echo "... ($((lines - 120)) more diff lines)"
} >&2

exit 1
