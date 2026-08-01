#!/usr/bin/env bash
#
# Fail a pull request that ADDS hardcoded Tailwind palette classes.
#
# Why a gate rather than a cleanup: the count went from 4,825 to 5,323 in one
# month while `dark:` variants also grew (561 -> 919). So this is not neglect —
# people are styling carefully, just not through the token layer. A one-off
# cleanup against that gradient regrows, and the two numbers moving together are
# the evidence.
#
# What is actually at stake: src/styles/theme.css defines semantic tokens
# (bg-background, text-muted-foreground, border-border, …) that carry their own
# dark value. A literal `text-gray-500` does not, so each one is a place dark mode
# has to be remembered by hand. That is why the "dark-mode tail" keeps coming back
# in UI reviews — it is not one tail, it is 5,323 individual decisions.
#
# Scope: only lines ADDED relative to the merge base. That keeps the message
# actionable — it names your lines, not a 5,000-line backlog — and means there is
# no baseline file to drift out of date. Existing code is deliberately untouched.
#
# Escape hatch: annotate the line with `palette-ok:` and a reason, for cases the
# tokens genuinely do not cover — brand colours, third-party embeds, or a set of
# distinct accents (the integrations category cards need eight; the semantic
# tokens intentionally do not provide eight).
set -euo pipefail

BASE_REF="${1:-origin/develop}"

# Tailwind's palette families. Semantic names (background, foreground, muted,
# border, primary, destructive, …) are deliberately absent — those are the ones
# this gate is steering people toward.
PALETTE='(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
PROPS='(bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|accent|caret|decoration|placeholder)'

if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  # In CI this must be loud. A gate that cannot resolve its base and exits 0 is
  # indistinguishable from a gate that passed — that is how checks quietly stop
  # running for months. Locally, skipping is the useful behaviour.
  if [[ -n "${CI:-}" ]]; then
    echo "check-palette-drift: base ref '$BASE_REF' not found." >&2
    echo "The checkout needs fetch-depth: 0 for the merge base to exist." >&2
    exit 1
  fi
  echo "check-palette-drift: base ref '$BASE_REF' not found; skipping (not CI)." >&2
  exit 0
fi

merge_base="$(git merge-base "$BASE_REF" HEAD)"

# Added lines only: the '+' side of the diff, minus the '+++' file headers.
added="$(git diff "$merge_base"...HEAD -- 'src/*.tsx' 'src/*.ts' 'src/*.css' \
  | grep -E '^\+' | grep -Ev '^\+\+\+' || true)"

if [[ -z "$added" ]]; then
  echo "check-palette-drift: no added source lines."
  exit 0
fi

violations="$(printf '%s\n' "$added" \
  | grep -v 'palette-ok:' \
  | grep -oE "\b${PROPS}-${PALETTE}-[0-9]{2,3}\b" \
  | sort | uniq -c | sort -rn || true)"

if [[ -z "$violations" ]]; then
  echo "check-palette-drift: no new hardcoded palette classes."
  exit 0
fi

count="$(printf '%s\n' "$violations" | awk '{s+=$1} END{print s+0}')"

cat >&2 <<EOF

This branch adds $count hardcoded Tailwind palette class(es):

$violations

Prefer a semantic token from src/styles/theme.css — those carry their own
dark-mode value, a literal palette class does not:

  text-gray-500    ->  text-muted-foreground
  bg-white         ->  bg-background   (bg-card inside a Card)
  border-gray-200  ->  border-border
  text-gray-900    ->  text-foreground

For severity colours, import from src/lib/severity-colors.ts rather than writing
red / orange / yellow by hand. It already exports every variant in use:
SEVERITY_CHART_COLORS (hex, for charts), SEVERITY_BADGE_SOFT, SEVERITY_BADGE_SOLID,
SEVERITY_TEXT_COLORS, SEVERITY_DOT_COLORS, SEVERITY_BORDER_COLORS.

If a token genuinely does not fit — a brand colour, a third-party embed, a set of
distinct accents — say so on the line and this gate will allow it:

  color: 'bg-amber-500/10 text-amber-500', // palette-ok: distinct card accent

EOF
exit 1
