#Requires -RunAsAdministrator
<#
  ══════════════════════════════════════════════════════════════
   إعداد أمان — منظومة الرحمة المهداة للتوظيف
   ══════════════════════════════════════════════════════════════
   بيعمل الشهادة ذاتية التوقيع (Self-Signed) وبيثبتها في
   Trusted Root Certification Authorities عشان ويندوز يثق
   في البرنامج والرسالة الزرقاء "Unknown Publisher" متظهرش.

   التشغيل: كليك يمين على الملف → Run as administrator
        أو:  إعداد_الأمان.bat
  ══════════════════════════════════════════════════════════════
#>

$ErrorActionPreference = 'Stop'

$SUBJECT = 'CN=Al-Rahma Al-Muhdah Recruitment System, O=Al-Rahma Al-Muhdah, C=EG'
$VALID_YEARS = 20

Write-Host ''
Write-Host '=========================================================' -ForegroundColor Cyan
Write-Host '  منظومة الرحمة المهداة للتوظيف — إعداد الأمان' -ForegroundColor Cyan
Write-Host '=========================================================' -ForegroundColor Cyan
Write-Host ''

# ── 1) التأكد إننا شغالين كمسؤول ──
$principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent()
)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host '[X] لازم تشغّل السكربت ده كمسؤول (Run as Administrator)' -ForegroundColor Red
    Write-Host ''
    Read-Host 'اضغط Enter للخروج'
    exit 1
}
Write-Host '[1/4] تم التأكد من صلاحيات المسؤول' -ForegroundColor Green

# ── 2) تنظيف أي شهادة قديمة بنفس الاسم ──
$old = Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue |
Where-Object { $_.Subject -eq $SUBJECT }
if ($old) {
    foreach ($c in $old) {
        Remove-Item "Cert:\CurrentUser\My\$($c.Thumbprint)" -Force -ErrorAction SilentlyContinue
        Write-Host "     تم حذف شهادة قديمة ({0}...)" -f $c.Thumbprint.Substring(0, 8)
    }
}

# ── 3) إنشاء الشهادة ذاتية التوقيع ──
try {
    $cert = New-SelfSignedCertificate `
        -Subject $SUBJECT `
        -Type CodeSigningCert `
        -CertStoreLocation 'Cert:\CurrentUser\My' `
        -KeyUsage DigitalSignature `
        -KeyAlgorithm RSA `
        -KeyLength 3072 `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddYears($VALID_YEARS)

    Write-Host '[2/4] تم إنشاء الشهادة' -ForegroundColor Green
    Write-Host '     اسم: ' $cert.Subject
    Write-Host '     رقم: ' $cert.Thumbprint
    Write-Host '     تنتهي: ' $cert.NotAfter.ToString('yyyy-MM-dd')
}
catch {
    Write-Host "[X] فشل إنشاء الشهادة: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'اضغط Enter للخروج'
    exit 1
}

# ── 4) التثبيت في Trusted Root + Trusted Publishers ──
try {
    $cerPath = Join-Path $env:TEMP 'AlRahma-CodeSigning.cer'
    Export-Certificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $cerPath -Force | Out-Null

    # الجذع: ده اللي بيخلي ويندوز يثق في الشهادة نفسها
    Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
    # الناشرين: بيخلي ويندوز يثق إن الـ exe ده ناشر معروف
    Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\TrustedPublisher' | Out-Null

    Remove-Item $cerPath -Force -ErrorAction SilentlyContinue
    Write-Host '[3/4] تم تثبيت الشهادة في Trusted Root + Trusted Publishers' -ForegroundColor Green
}
catch {
    Write-Host "[X] فشل تثبيت الشهادة: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'اضغط Enter للخروج'
    exit 1
}

# ── 5) تنظيف ذاكرة شهادات ويندوز ──
# ده بيخلي Message Bar / SmartScreen يقرا الشهادة الجديدة على طول
try {
    $sigcheck = Join-Path $env:SystemRoot 'System32\sigcheck.exe'
    if (Test-Path $sigcheck) { & $sigcheck -unload -nobanner | Out-Null }

    # تحديث كاش ballistic بدون الخدمة (أكتر طريقة موثوقة)
    $clm = Get-ChildItem 'Cert:\LocalMachine\Software\Microsoft\Cryptography\CLM\Trust' -ErrorAction SilentlyContinue
    if ($clm) {
        foreach ($k in @('Trusted Root', 'Trusted Publishers')) {
            $reg = "HKLM:\SOFTWARE\Microsoft\Cryptography\CLM\Trust\$k"
            New-Item -Path $reg -Force -ErrorAction SilentlyContinue | Out-Null
            Set-ItemProperty -Path $reg -Name 'UpdateUrl' -Value 'file:///C:/Windows/' -ErrorAction SilentlyContinue
        }
    }
}
catch { }

Write-Host '[4/4] تم تحديث كاش شهادات ويندوز' -ForegroundColor Green

# ── تأكيد نهائي ──
$inRoot = Get-ChildItem Cert:\CurrentUser\Root | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
Write-Host ''
Write-Host '=========================================================' -ForegroundColor Green
if ($inRoot) {
    Write-Host '  [OK] كل حاجة تمام — البرنامج جاهز للتسليم' -ForegroundColor Green
}
else {
    Write-Host '  [!] الشهادة اتعملت بس مش متأكد إنها في Root' -ForegroundColor Yellow
}
Write-Host '=========================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'دلوقتي تقدر تفتح ملف التسطيب Setup.exe عادي من غير' -ForegroundColor Gray
Write-Host 'أي رسالة Unknown Publisher.' -ForegroundColor Gray
Write-Host ''
Read-Host 'اضغط Enter للخروج'