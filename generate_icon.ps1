Add-Type -AssemblyName System.Drawing
$srcPath = Join-Path $PSScriptRoot "Logo Amura.png"
$dstPath = Join-Path $PSScriptRoot "desktop\icon.png"

$src = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap 512, 512
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$ratio = [Math]::Min(460.0 / $src.Width, 460.0 / $src.Height)
$w = [int]($src.Width * $ratio)
$h = [int]($src.Height * $ratio)
$x = [int]((512 - $w) / 2)
$y = [int]((512 - $h) / 2)

$g.DrawImage($src, $x, $y, $w, $h)
$g.Dispose()
$src.Dispose()

$bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Icon generated successfully at $dstPath"
