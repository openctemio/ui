#!/usr/bin/env bash
#
# generate-api-types.sh — derive src/lib/api/generated/api.types.ts from the
# API's OpenAPI spec.
#
# WHY: every cross-repo bug found recently was a contract bug. The UI hand-wrote
# its API response shapes, so a field the server renamed, an endpoint that never
# existed, and a list the server exposed but the UI never asked for all looked
# identical to correct code. The event-type picker fetched
# GET /api/v1/me/event-types — a path the OSS server had never implemented —
# because someone typed the interface from a stale spec.
#
# So the shapes are generated now, from the same file the server generates from.
#
# Pipeline:
#   src/lib/api/openapi/swagger.yaml   (vendored from openctemio/api, Swagger 2.0)
#     -> swagger2openapi                (2.0 has no discriminated schemas / nullable)
#     -> openapi-typescript             -> src/lib/api/generated/api.types.ts
#
# The intermediate OpenAPI 3 document is NOT committed: it is a pure function of
# the spec, and committing it would create a second artifact to keep in sync.
#
# Usage:
#   scripts/generate-api-types.sh            # write the generated file
#   scripts/generate-api-types.sh --check    # fail if it is out of date
#
# Exit codes: 0 = ok, 1 = out of date (--check), 2 = tooling error.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="$REPO_ROOT/src/lib/api/openapi/swagger.yaml"
OUT_REL="src/lib/api/generated/api.types.ts"
OUT="$REPO_ROOT/$OUT_REL"

CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

if [ ! -f "$SPEC" ]; then
  echo "generate-api-types: vendored spec missing at src/lib/api/openapi/swagger.yaml" >&2
  exit 2
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# --- 1. Swagger 2.0 -> OpenAPI 3.0 ------------------------------------------
# The API generates with swaggo/swag v1, which only emits Swagger 2.0.
# openapi-typescript v7 reads 3.x only, so convert first.
if ! npx --no-install swagger2openapi \
      --yaml --outfile "$tmpdir/openapi.yaml" "$SPEC" >"$tmpdir/convert.log" 2>&1; then
  echo "generate-api-types: swagger2openapi failed:" >&2
  cat "$tmpdir/convert.log" >&2
  exit 2
fi

# --- 2. OpenAPI 3.0 -> TypeScript -------------------------------------------
if ! npx --no-install openapi-typescript "$tmpdir/openapi.yaml" \
      --output "$tmpdir/api.types.ts" >"$tmpdir/gen.log" 2>&1; then
  echo "generate-api-types: openapi-typescript failed:" >&2
  cat "$tmpdir/gen.log" >&2
  exit 2
fi

# --- 3. Header + formatting --------------------------------------------------
{
  cat <<'EOF'
/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Derived from src/lib/api/openapi/swagger.yaml, which is vendored from
 * openctemio/api (where it is itself generated from the handler annotations and
 * gated by scripts/check-openapi.sh).
 *
 * Regenerate:  npm run generate:api-types
 * Verify:      npm run check:api-types   (also runs in CI)
 *
 * Prefer the named aliases in src/lib/api/generated/index.ts over reaching into
 * `components['schemas'][...]` directly — the schema keys are Go package paths
 * and will change if a handler type moves.
 */

EOF
  cat "$tmpdir/api.types.ts"
} >"$tmpdir/api.types.headed.ts"

# --config is required: the scratch file lives outside the repo, so prettier
# would not find .prettierrc and would format with its defaults — which then
# fails `npm run format:check` on the committed result.
if ! npx --no-install prettier --write "$tmpdir/api.types.headed.ts" \
      --config "$REPO_ROOT/.prettierrc" --parser typescript >"$tmpdir/fmt.log" 2>&1; then
  echo "generate-api-types: prettier failed:" >&2
  cat "$tmpdir/fmt.log" >&2
  exit 2
fi

# --- 4. Write or compare -----------------------------------------------------
if [ "$CHECK" -eq 1 ]; then
  if [ ! -f "$OUT" ]; then
    echo "generate-api-types: $OUT_REL is missing — run npm run generate:api-types" >&2
    exit 1
  fi
  if diff -u "$OUT" "$tmpdir/api.types.headed.ts" >"$tmpdir/types.diff" 2>&1; then
    echo "check-api-types: $OUT_REL is up to date with the spec."
    exit 0
  fi
  {
    echo
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Generated API types are out of date."
    echo
    echo "$OUT_REL does not match what the vendored OpenAPI spec"
    echo "produces. Either the spec changed and the types were not regenerated, or"
    echo "the generated file was hand-edited."
    echo
    echo "Fix:"
    echo "    npm run generate:api-types"
    echo
    echo "Diff (committed → regenerated), first 200 lines:"
    echo "────────────────────────────────────────────────────────────────────────────"
    head -n 200 "$tmpdir/types.diff"
    lines="$(wc -l <"$tmpdir/types.diff")"
    [ "$lines" -gt 200 ] && echo "... ($((lines - 200)) more diff lines)"
  } >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
cp "$tmpdir/api.types.headed.ts" "$OUT"
echo "generate-api-types: wrote $OUT_REL"
