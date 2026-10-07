#Requires -RunAsAdministrator
<#
  تفعيل Windows Developer Mode
  ده بيخلي electron-builder يقدر يعمل symlinks أثناء البناء (خطوة winCodeSign)
  وبكده الأيقونة بتتحفر صح في الـ exe.
#>

$ErrorActionPreference = 'Stop'
$key = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock'

Write-Host '=============================================='
Write-Host ' تفعيل Windows Developer Mode'
Write-Host '=============================================='

try {
    if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
    Set-ItemProperty -Path $key -Name 'AllowDevelopmentWithoutDevLicense' -Value 1 -Type DWord -Force

    $v = (Get-ItemProperty -Path $key).AllowDevelopmentWithoutDevLicense
    if ($v -eq 1) {
        Write-Host '[OK] Developer Mode اتفعل بنجاح' -ForegroundColor Green
        Write-Host ''
        Write-Host 'اقفل النافذة دي وارجعBUILD تاني.'
        exit 0
    } else {
        Write-Host '[X] القيمة مش متظبطة' -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[X] فشل: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}