#!/bin/bash
# Pre-commit hook: block commits that modify a *.user.js or *.user.css file
# without increasing its @version.

# Which staged files to check: modified (M) or renamed (R) userscripts/userstyles
FILE_PATTERNS=('*.user.js' '*.user.css')
DIFF_FILTER='MR'

# Extract the @version value from the metadata block on stdin
get_version() {
  # Userscripts prefix metadata lines with "//"; userstyles don't
  grep -m 1 -oP '^\s*(//\s*)?@version\s+\K\S+'
}

# Succeeds if version $1 is strictly greater than version $2
version_gt() {
  [ "$1" != "$2" ] &&
    [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n 1)" == "$1" ]
}

# Nothing to compare against on the initial commit
git rev-parse --verify -q HEAD > /dev/null || exit 0

STATUS=0

# NUL-separated (-z / -d '') so paths with spaces survive
while IFS= read -r -d '' FILE; do
  # Compare the staged content (index), not the working tree
  CURRENT_VERSION=$(git show ":$FILE" | get_version)

  if [ -z "$CURRENT_VERSION" ]; then
    echo "error: $FILE has no @version in its metadata block." >&2
    STATUS=1
    continue
  fi

  # Renamed files have no HEAD:$FILE; treat them like new files
  PREVIOUS_VERSION=$(git show "HEAD:$FILE" 2> /dev/null | get_version)
  [ -z "$PREVIOUS_VERSION" ] && continue

  if ! version_gt "$CURRENT_VERSION" "$PREVIOUS_VERSION"; then
    echo "error: $FILE @version must be greater than '$PREVIOUS_VERSION' (staged: '$CURRENT_VERSION')." >&2
    STATUS=1
  fi
done < <(git diff --cached --name-only -z --diff-filter="$DIFF_FILTER" -- "${FILE_PATTERNS[@]}")

if [ "$STATUS" -ne 0 ]; then
  echo "Bump the version(s) above, or commit with --no-verify to skip this check." >&2
fi

exit $STATUS
