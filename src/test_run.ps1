# 题库系统 测试运行脚本
# 用独立临时数据库跑 API 回归测试，不碰用户数据
# 用法：powershell -ExecutionPolicy Bypass -File test_run.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = [System.IO.Path]::GetFullPath((Join-Path $root "..\题库系统.exe"))
$tmpDb = Join-Path $env:TEMP ("qbank_test_" + [guid]::NewGuid().ToString("N") + ".db")

Write-Host "[1/3] 用临时数据库启动服务..." -ForegroundColor Cyan
Get-Process -Name "题库系统" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# 用 -no-browser + -db 指向临时库启动
$proc = Start-Process -FilePath $exe -ArgumentList "-no-browser", "-db", $tmpDb -PassThru
Start-Sleep -Seconds 2

try {
    $probe = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/stats" -UseBasicParsing -TimeoutSec 5
    if ($probe.StatusCode -ne 200) { throw "服务未就绪" }
} catch {
    Write-Host "[错误] 服务启动失败: $_" -ForegroundColor Red
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "[2/3] 运行 API 回归测试..." -ForegroundColor Cyan
Push-Location $root
python test_api.py
$code = $LASTEXITCODE
Pop-Location

Write-Host "[3/3] 清理测试环境..." -ForegroundColor Cyan
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Remove-Item $tmpDb -Force -ErrorAction SilentlyContinue
Remove-Item ($tmpDb + "-wal") -Force -ErrorAction SilentlyContinue
Remove-Item ($tmpDb + "-shm") -Force -ErrorAction SilentlyContinue

if ($code -ne 0) {
    Write-Host "[失败] 测试未通过" -ForegroundColor Red
    exit $code
}
Write-Host "[完成] 全部测试通过，用户数据未受影响" -ForegroundColor Green
