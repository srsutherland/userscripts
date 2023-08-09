#!/bin/bash

# Path to the pre-commit hook
HOOK_PATH="../.git/hooks/pre-commit"

# Check if pre-commit hook file exists
if [ ! -f "$HOOK_PATH" ]; then
  # Create the pre-commit hook file with the shebang
  echo "#!/bin/bash" > "$HOOK_PATH"
  echo "" >> "$HOOK_PATH"
  echo "git-hooks/userscript-version.sh" >> "$HOOK_PATH"
  chmod +x "$HOOK_PATH"
  echo "Pre-commit hook created and userscript-version.sh added."
else
  # Check if the line calling userscript-version.sh already exists
  if ! grep -q "git-hooks/userscript-version.sh" "$HOOK_PATH"; then
    echo "git-hooks/userscript-version.sh" >> "$HOOK_PATH"
    echo "Call to userscript-version.sh added to existing pre-commit hook."
  else
    echo "Call to userscript-version.sh already exists in pre-commit hook."
  fi
fi
