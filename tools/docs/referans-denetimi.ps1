# Referans denetleyicisi: docs/ altindaki "dosya:satir" referanslarini kodla karsilastirir.
# Kullanim (repo kokunden):
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/docs/referans-denetimi.ps1 -Repo .
# Ne yapar:
#   - Verilen klasordeki (varsayilan: docs/plan) tum *.md dosyalarindaki "dosya:satir"
#     referanslarini toplar.
#   - Dosyanin gercekten var oldugunu ve satir numarasinin dosya uzunlugunu asmadigini kontrol eder.
#   - Ayni ada sahip birden fazla dosya varsa (or. ui.tsx, types.ts) adaylar arasinda
#     yeterince uzun olani arar; hicbiri uygun degilse hatayi bildirir.
#   - Kelime sayisini da raporlar (docs/plan setinin sozlesmesi icin).
# Not: Betik ASCII yazilmistir; Windows PowerShell 5.1 Turkce karakterleri bozmaz.

param(
  [string]$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$Docs = 'docs\plan',
  [switch]$Table,
  [switch]$UpdateIndex
)

$r = (Resolve-Path $Repo).Path
$plan = Join-Path $r $Docs
if (-not (Test-Path $plan)) { Write-Output "Klasor yok: $plan"; exit 1 }

$index = @{}
Get-ChildItem $r -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\\.git\\|\\node_modules\\|\\obj\\|\\bin\\|\\test-results\\|\\dist\\' } |
  ForEach-Object {
    $rel = $_.FullName.Substring($r.Length + 1)
    if (-not $index.ContainsKey($_.Name)) { $index[$_.Name] = @() }
    $index[$_.Name] += $rel
  }

$rx = [regex]'([A-Za-z0-9_\-\./\\]+\.(?:tsx|ts|cs|css|md|json|yml|yaml|mjs|py|sh)):(\d+)(?:-(\d+))?'
# Kodlama hatalarini ASCII kalarak yakalamak icin desenler karakter kodlarindan kurulur:
# 0x00C3, 0x00C5, 0x00C4 = UTF-8'in CP1252 gibi okunmasindan dogan tipik bozuk harfler.
$mojiPattern = '[' + [char]0x00C3 + [char]0x00C5 + [char]0x00C4 + ']'
# Basliktaki "NN - Baslik" onekini kirpmak icin tire/suslu cizgi deseni (0x2014 = em dash).
$titlePattern = '^\d+\s*[' + [char]0x2014 + '\-]\s*'
$grand = 0; $grandBad = 0; $grandAmb = 0; $allBad = @(); $encWarn = @()

foreach ($doc in (Get-ChildItem $plan -File -Filter *.md | Sort-Object Name)) {
  $text = [System.IO.File]::ReadAllText($doc.FullName)
  $mojibake = ([regex]::Matches($text, $mojiPattern)).Count
  $raw = [System.IO.File]::ReadAllBytes($doc.FullName)
  $hasBom = ($raw.Length -ge 3 -and $raw[0] -eq 0xEF -and $raw[1] -eq 0xBB -and $raw[2] -eq 0xBF)
  if ($mojibake -gt 0 -or $hasBom) { $encWarn += ("{0}: bozuk-karakter={1} BOM={2}" -f $doc.Name, $mojibake, $hasBom) }
  $seen = @{}; $bad = @(); $amb = 0
  foreach ($m in $rx.Matches($text)) {
    $rel = $m.Groups[1].Value.TrimStart('.', '/', '\')
    $ln = [int]$m.Groups[2].Value
    $key = "${rel}|${ln}"
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $candPath = $null
    foreach ($p in @((Join-Path $r $rel), (Join-Path $plan $rel), (Join-Path $r ('docs\' + $rel)))) {
      if (Test-Path $p) { $candPath = $p; break }
    }
    $cands = @()
    if ($candPath) { $cands = @($candPath) }
    else {
      $bn = Split-Path $rel -Leaf
      if ($index.ContainsKey($bn)) { $cands = $index[$bn] | ForEach-Object { Join-Path $r $_ } }
    }
    if ($cands.Count -eq 0) { $bad += "MISSING: ${rel}:${ln}"; continue }
    $ok = $cands | Where-Object { ([System.IO.File]::ReadAllLines($_)).Count -ge $ln }
    if (-not $ok) { $bad += "OUT-OF-RANGE: ${rel}:${ln} (aday=$($cands.Count))"; continue }
    if ($cands.Count -gt 1) { $amb++ }
  }
  $w = (($text -split '\s+' | Where-Object { $_ -ne '' }).Count)
  $grand += $seen.Count; $grandBad += $bad.Count; $grandAmb += $amb
  "{0,-42} kelime={1,-6} referans={2,-4} bozuk={3,-3} cok-adli={4}" -f $doc.Name, $w, $seen.Count, $bad.Count, $amb
  foreach ($b in $bad) { "      $b"; $allBad += "$($doc.Name) -> $b" }
}

$totalWords = 0
$docFiles = Get-ChildItem $plan -File -Filter *.md
foreach ($d in $docFiles) { $totalWords += (([System.IO.File]::ReadAllText($d.FullName)) -split '\s+' | Where-Object { $_ -ne '' }).Count }

"=== TOPLAM: $($docFiles.Count) belge | $totalWords kelime | referans=$grand | bozuk=$grandBad | cok-adli=$grandAmb ==="
if ($encWarn.Count -gt 0) { "--- KODLAMA UYARILARI (mojibake/BOM) ---"; $encWarn | ForEach-Object { $_ } }
if ($allBad.Count -gt 0) { "--- DUZELTILECEKLER ---"; $allBad | ForEach-Object { $_ } }

function Get-DocRows {
  foreach ($doc in ($docFiles | Sort-Object Name)) {
    $text = [System.IO.File]::ReadAllText($doc.FullName)
    $w = (($text -split '\s+' | Where-Object { $_ -ne '' }).Count)
    $refs = ($rx.Matches($text) | ForEach-Object { $_.Groups[1].Value + '|' + $_.Groups[2].Value } | Select-Object -Unique).Count
    $h1 = [regex]::Match($text, '(?m)^#\s+(.+?)\s*$')
    $title = ''
    if ($h1.Success) { $title = ($h1.Groups[1].Value -replace $titlePattern, '') }
    $num = ($doc.BaseName -split '-')[0]
    $broken = 0
    foreach ($m in $rx.Matches($text)) {
      $rel = $m.Groups[1].Value.TrimStart('.', '/', '\'); $ln = [int]$m.Groups[2].Value
      $c = @()
      foreach ($q in @((Join-Path $r $rel), (Join-Path $plan $rel), (Join-Path $r ('docs\' + $rel)))) { if (Test-Path $q) { $c = @($q); break } }
      if ($c.Count -eq 0) { $bn = Split-Path $rel -Leaf; if ($index.ContainsKey($bn)) { $c = $index[$bn] | ForEach-Object { Join-Path $r $_ } } }
      if ($c.Count -eq 0) { $broken++; continue }
      if (-not ($c | Where-Object { ([System.IO.File]::ReadAllLines($_)).Count -ge $ln })) { $broken++ }
    }
    $status = 'genisletilecek'
    if ($num -eq '00') { $status = 'dizin' }
    elseif ($num -eq '01') { $status = 'sartname' }
    elseif ($broken -gt 0) { $status = 'referans duzeltilecek' }
    elseif ($w -ge 1000) { $status = 'yazildi' }
    "| $num | [$($doc.Name)]($($doc.Name)) | $title | $w | $refs | $broken | $status |"
  }
}

if ($Table) {
  # 00-DIZIN.md icin markdown durum tablosu uretir.
  ""
  "| # | Belge | Baslik | Kelime | Referans | Bozuk | Durum |"
  "|---|---|---|---|---|---|---|"
  foreach ($row in (Get-DocRows)) { $row }
}

if ($UpdateIndex) {
  # 00-DIZIN.md icindeki TABLO blokunu gercek olcumlerle yeniden yazar.
  $indexPath = Join-Path $plan '00-DIZIN.md'
  if (-not (Test-Path $indexPath)) { "00-DIZIN.md bulunamadi: $indexPath"; exit 1 }
  $rows = @(Get-DocRows)
  $present = @()
  foreach ($doc in $docFiles) { $present += ($doc.BaseName -split '-')[0] }
  $missing = @()
  foreach ($n in 0..34) { $nn = '{0:D2}' -f $n; if ($present -notcontains $nn) { $missing += $nn } }
  $block = @()
  $block += '<!-- TABLO:BASLANGIC (bu blok tools/docs/referans-denetimi.ps1 -UpdateIndex ile uretilir) -->'
  $block += ''
  $block += '| # | Belge | Konu | Kelime | Referans | Bozuk | Durum |'
  $block += '|---|---|---|---|---|---|---|'
  foreach ($row in $rows) { $block += $row }
  if ($missing.Count -gt 0) {
    $block += ''
    $block += 'Eksik belgeler: ' + ($missing -join ', ')
  }
  $block += ''
  $block += '<!-- TABLO:BITTI -->'
  $idx = [System.IO.File]::ReadAllText($indexPath)
  $pattern = '(?s)<!-- TABLO:BASLANGIC.*?<!-- TABLO:BITTI -->'
  if (-not [regex]::IsMatch($idx, $pattern)) { "00-DIZIN.md icinde TABLO isaretleri yok."; exit 1 }
  $idx2 = [regex]::Replace($idx, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) ($block -join "`r`n") })
  [System.IO.File]::WriteAllText($indexPath, $idx2, (New-Object System.Text.UTF8Encoding($false)))
  "00-DIZIN.md guncellendi: $($rows.Count) belge satiri, $($missing.Count) eksik belge."
}
