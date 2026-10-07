#Requires -Version 5.1
<#
  ============================================================
   Embed the app icon + sign all artifacts with our certificate
  ============================================================
   WHY THIS IS A SEPARATE STEP:
   electron-builder tries to unpack winCodeSign, which contains
   macOS symlinks. That fails on any machine without Windows
   Developer Mode. So we do the two steps ourselves:
     1. rcedit   -> embeds the .ico into the exe
     2. signtool -> signs with the self-signed certificate

   IMPORTANT ORDER: rcedit modifies the exe and therefore WIPES
   any existing signature. So we must ALWAYS run rcedit FIRST,
   then sign. Never the other way around.

   Usage: powershell -ExecutionPolicy Bypass -File tools/sign-and-icon.ps1
  ============================================================
#>

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $root 'tools\win-tools'
$rcedit = Join-Path $tools 'rcedit-x64.exe'
$signtool = Join-Path $tools 'windows-6\signtool.exe'
$pfx = Join-Path $root 'certs\AlRahma-CodeSigning.pfx'

# The certificate password is NEVER stored in this repo.
# It is read from the CSC_KEY_PASSWORD environment variable.
$pfxPass = $env:CSC_KEY_PASSWORD
if ([string]::IsNullOrWhiteSpace($pfxPass)) {
    Write-Host '[X] CSC_KEY_PASSWORD is not set.' -ForegroundColor Red
    Write-Host '    Set it first, e.g.:' -ForegroundColor Yellow
    Write-Host '      $env:CSC_KEY_PASSWORD = "<your password>"' -ForegroundColor Yellow
    exit 1
}

$ico = Join-Path $root 'build\icon.ico'
$unpacked = Join-Path $root 'dist\win-unpacked'

foreach ($tool in @($rcedit, $signtool, $pfx, $ico)) {
    if (-not (Test-Path $tool)) {
        Write-Host "[X] Missing required file: $tool" -ForegroundColor Red
        exit 1
    }
}

$appExe = Get-ChildItem $unpacked -Filter '*.exe' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike '*uninstaller*' } |
    Select-Object -First 1

if (-not $appExe) {
    Write-Host '[X] No exe found in win-unpacked - run dist:app first.' -ForegroundColor Red
    exit 1
}

# Targets to sign: the app exe, plus the generated Setup.exe if present
$targets = @($appExe.FullName)
$setup = Get-ChildItem (Join-Path $root 'dist') -Filter '*Setup*.exe' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($setup) { $targets += $setup.FullName }

# rcedit and signtool mishandle non-ASCII filenames on some Windows
# configurations (they fail with 0x800700C1). So we always work on a
# copy with a plain ASCII name, then copy the result back.
$tmpDir = Join-Path $env:TEMP 'alrahma-sign'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$tmpFile = Join-Path $tmpDir 'target.exe'

Write-Host ''
Write-Host '=========================================' -ForegroundColor Cyan
Write-Host ' Icon + Signing' -ForegroundColor Cyan
Write-Host '=========================================' -ForegroundColor Cyan
Write-Host "Artifacts: $($targets.Count)"

Write-Host ''
Write-Host '[1/2] Embedding icon into the app exe...'
# signtool/rcedit write progress lines to stderr even on success.
# With ErrorActionPreference = Stop that becomes a fatal error, so we
# lower it for these calls and rely on the exit code instead.
$ErrorActionPreference = 'Continue'
Copy-Item $appExe.FullName $tmpFile -Force
& $rcedit $tmpFile --set-icon $ico 2>&1 | Out-Null
$rc = $LASTEXITCODE
Copy-Item $tmpFile $appExe.FullName -Force
if ($rc -ne 0) {
    Write-Host "    [!] rcedit returned $rc" -ForegroundColor Yellow
} else {
    Write-Host '    [OK] Icon embedded' -ForegroundColor Green
}

Write-Host ''
Write-Host '[2/2] Signing artifacts...'
foreach ($t in $targets) {
    $leaf = Split-Path -Leaf $t
    Write-Host "    -> $leaf"

    # If it is already signed, signtool refuses to re-sign it (exit 1).
    # So check first and skip.
    Copy-Item $t $tmpFile -Force
    $existing = & $signtool verify /pa $tmpFile 2>&1 | Out-String
    if ($existing -match 'Successfully Verified') {
        Write-Host '       [OK] Already signed - skipping' -ForegroundColor DarkGray
        continue
    }

    & $signtool sign /fd SHA256 /f $pfx /p $pfxPass $tmpFile 2>&1 | Out-Null
    $rc = $LASTEXITCODE
    if ($rc -ne 0) {
        Write-Host "       [X] Signing failed (exit $rc)" -ForegroundColor Red
        exit 1
    }
    Copy-Item $tmpFile $t -Force
    Write-Host '       [OK] Signed' -ForegroundColor Green
}

Write-Host ''
foreach ($t in $targets) {
    Copy-Item $t $tmpFile -Force
    $out = & $signtool verify /pa $tmpFile 2>&1 | Out-String
    if ($out -match 'Successfully Verified') {
        Write-Host "    [VERIFIED] $(Split-Path -Leaf $t)" -ForegroundColor Green
    } else {
        Write-Host "    [SIGNED, not trusted here] $(Split-Path -Leaf $t)" -ForegroundColor Yellow
    }
}
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '=========================================' -ForegroundColor Green
Write-Host ' Done - icon embedded and all files signed.' -ForegroundColor Green
Write-Host '=========================================' -ForegroundColor Green