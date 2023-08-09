@echo off

REM Path to the pre-commit hook
set HOOK_PATH="..\.git\hooks\pre-commit"

REM Check if pre-commit hook file exists
if not exist %HOOK_PATH% (
  REM Create the pre-commit hook file with the shebang
  echo #!/bin/bash > %HOOK_PATH%
  echo. >> %HOOK_PATH%
  echo # Check userscript version >> %HOOK_PATH%
  echo git-hooks/userscript-version.sh >> %HOOK_PATH%
  echo Pre-commit hook created and userscript-version.sh added.
) else (
  REM Check if the line calling userscript-version.sh already exists
  findstr /C:"git-hooks/userscript-version.sh" %HOOK_PATH%
  if errorlevel 1 (
    echo git-hooks/userscript-version.sh >> %HOOK_PATH%
    echo Call to userscript-version.sh added to existing pre-commit hook.
  ) else (
    echo Call to userscript-version.sh already exists in pre-commit hook.
  )
)

pause
