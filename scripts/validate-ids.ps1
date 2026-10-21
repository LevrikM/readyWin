$ErrorActionPreference = 'SilentlyContinue'
$ids = Get-Content -Path (Join-Path $PSScriptRoot 'candidates.txt') | Where-Object { $_.Trim() -ne '' }
$results = @()
$i = 0
foreach ($id in $ids) {
  $i++
  $out = & winget show --id $id -e --source winget --accept-source-agreements --disable-interactivity 2>&1 | Out-String
  $code = $LASTEXITCODE
  $ok = ($code -eq 0)
  $name = ''
  $version = ''
  if ($ok) {
    $nameMatch = [regex]::Match($out, '(?m)^Found\s+(.+?)\s+\[')
    if ($nameMatch.Success) { $name = $nameMatch.Groups[1].Value.Trim() }
    $verMatch = [regex]::Match($out, '(?m)^Version:\s*(.+)$')
    if ($verMatch.Success) { $version = $verMatch.Groups[1].Value.Trim() }
  }
  $results += [pscustomobject]@{ Id = $id; Ok = $ok; Exit = $code; Name = $name; Version = $version }
  Write-Host ("[{0}/{1}] {2} {3}" -f $i, $ids.Count, $id, $(if ($ok) { 'OK' } else { 'MISS' }))
}
$results | ConvertTo-Json -Depth 3 | Set-Content -Path (Join-Path $PSScriptRoot 'validation.json') -Encoding UTF8
Write-Host ("DONE {0}/{1}" -f ($results | Where-Object Ok).Count, $results.Count)
