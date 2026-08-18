# 题库系统 一键构建脚本
# 用法：powershell -ExecutionPolicy Bypass -File build.ps1
# 产物：项目根目录下的 题库系统.exe

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$go = Join-Path $root "..\.tools\go\bin\go.exe"
$out = [System.IO.Path]::GetFullPath((Join-Path $root "..\题库系统.exe"))

if (-not (Test-Path $go)) {
    Write-Host "[错误] 未找到 portable Go，请先安装到 .tools\go" -ForegroundColor Red
    exit 1
}

# 运行中的 exe 会锁住输出文件，先提示关闭
$running = Get-Process -Name "题库系统" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "[提示] 正在停止运行中的题库系统..." -ForegroundColor Yellow
    $running | Stop-Process -Force
    Start-Sleep -Milliseconds 600
}

$env:GOPROXY = "https://goproxy.cn,direct"

Write-Host "[1/2] 编译中..." -ForegroundColor Cyan
Push-Location $root
& $go build -trimpath -ldflags "-s -w" -o $out .
$code = $LASTEXITCODE
Pop-Location

if ($code -ne 0) {
    Write-Host "[错误] 编译失败（exit $code）" -ForegroundColor Red
    exit $code
}

$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
$time = (Get-Item $out).LastWriteTime.ToString("HH:mm:ss")
Write-Host "[2/2] 构建完成: $out ($size MB, $time)" -ForegroundColor Green
