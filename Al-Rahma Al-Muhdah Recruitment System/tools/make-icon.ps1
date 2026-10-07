Add-Type -AssemblyName System.Drawing

$root = 'k:\WEBSIT\job Alrahma\Al-Rahma Al-Muhdah Recruitment System'
$src = Join-Path $root 'logo.jpg'
$build = Join-Path $root 'build'
$pngDir = Join-Path $build 'icon-png'
New-Item -ItemType Directory -Force -Path $pngDir | Out-Null

$img = [System.Drawing.Image]::FromFile($src)
$sizes = @(16, 24, 32, 48, 64, 128, 256)

foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $bmp.SetResolution(96, 96)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  # جودة عالية: bicubic + adaptive smoothing
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($img, 0, 0, $s, $s)
  $g.Dispose()
  $out = Join-Path $pngDir "icon-${s}.png"
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "rendered ${s}x${s}"
}

$img.Dispose()

# ── تجميع ملف ICO واحد من كل الأحجام ──
$entries = @()
foreach ($s in $sizes) {
  $bytes = [System.IO.File]::ReadAllBytes((Join-Path $pngDir "icon-${s}.png"))
  $entries += , @{ Size = $s; Data = $bytes }
}

# ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes لكل صورة) + بيانات
$header = New-Object System.Collections.ArrayList
[void]$header.Add([byte]0); [void]$header.Add([byte]0)   # reserved
[void]$header.Add([byte]1); [void]$header.Add([byte]0)   # type = 1 (icon)
[void]$header.Add([byte]$sizes.Count); [void]$header.Add([byte]0) # count

$offset = 6 + ($entries.Count * 16)
foreach ($e in $entries) {
  $dim = if ($e.Size -ge 256) { [byte]0 } else { [byte]$e.Size }
  [void]$header.Add($dim)   # width
  [void]$header.Add($dim)   # height
  [void]$header.Add([byte]0) # palette
  [void]$header.Add([byte]0) # reserved
  [void]$header.Add([byte]0); [void]$header.Add([byte]0) # planes
  [void]$header.Add([byte]0); [void]$header.Add([byte]0) # bpp -> 0 معناها PNG
  $len = $e.Data.Length
  [void]$header.Add([byte]($len -band 0xFF))
  [void]$header.Add([byte](($len -shr 8) -band 0xFF))
  [void]$header.Add([byte](($len -shr 16) -band 0xFF))
  [void]$header.Add([byte](($len -shr 24) -band 0xFF))
  [void]$header.Add([byte]($offset -band 0xFF))
  [void]$header.Add([byte](($offset -shr 8) -band 0xFF))
  [void]$header.Add([byte](($offset -shr 16) -band 0xFF))
  [void]$header.Add([byte](($offset -shr 24) -band 0xFF))
  $offset += $len
}

$ms = New-Object System.IO.MemoryStream
$hb = $header.ToArray()
$ms.Write($hb, 0, $hb.Length)
foreach ($e in $entries) { $ms.Write($e.Data, 0, $e.Data.Length) }

$ico = Join-Path $build 'icon.ico'
[System.IO.File]::WriteAllBytes($ico, $ms.ToArray())
$ms.Dispose()

$final = (Get-Item $ico).Length
Write-Output "icon.ico built: $final bytes ($($sizes.Count) sizes)"