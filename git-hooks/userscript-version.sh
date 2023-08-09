#!/bin/bash

# Find staged *.user.js files
USER_JS_FILES=$(git diff --name-only --cached | grep '\.user\.js$')

# Loop through the found files and compare version numbers
for FILE in $USER_JS_FILES; do
  # Get the current version from the staged file
  CURRENT_VERSION=$(grep -oP '^\s*//\s*@version\s+\K\S+' $(git rev-parse --show-toplevel)/$FILE)

  # Get the previous version from the last commit
  PREVIOUS_VERSION=$(git show HEAD:$FILE | grep -oP '^\s*//\s*@version\s+\K\S+')

  # Check if the versions are the same, and if so, block the commit
  if [ "$CURRENT_VERSION" == "$PREVIOUS_VERSION" ]; then
    echo "Version number in $FILE has not been updated. Please increment the version number from '$CURRENT_VERSION' and try again."
    exit 1
  fi
done

# If no issues are found, allow the commit
exit 0
