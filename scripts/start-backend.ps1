param(
    [string]$BackendPath = 'D:\be\SWP391_FA26_VEGEAI_PROJECT_THEVEGANCROCO',
    [string]$JdkHome = 'C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot'
)

$ErrorActionPreference = 'Stop'
$javaExecutable = Join-Path $JdkHome 'bin\java.exe'
$mavenWrapper = Join-Path $BackendPath 'mvnw.cmd'
if (-not (Test-Path -LiteralPath $javaExecutable)) { throw "JDK không tồn tại: $JdkHome. Truyền -JdkHome với thư mục JDK 21." }
if (-not (Test-Path -LiteralPath $mavenWrapper)) { throw "Không tìm thấy mvnw.cmd. Truyền -BackendPath với thư mục backend." }

function Read-Container([string]$Name) {
    $containerJson = & docker inspect $Name
    if ($LASTEXITCODE -ne 0) { throw "Không đọc được container $Name. Kiểm tra Docker Desktop và docker compose." }
    $containers = @($containerJson | ConvertFrom-Json)
    if (-not $containers[0].State.Running) { throw "Container $Name chưa chạy. Chạy docker compose up -d postgres redis trong thư mục backend." }
    return $containers[0]
}

# Use the running development containers; do not print their credentials.
$postgresConfig = Read-Container 'vegeai-postgres'
$redisConfig = Read-Container 'vegeai-redis'
$databaseValues = @{}
foreach ($entry in $postgresConfig.Config.Env) {
    $pair = $entry.Split('=', 2)
    if ($pair[0] -in 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD') { $databaseValues[$pair[0]] = $pair[1] }
}
if (-not $databaseValues['POSTGRES_DB'] -or -not $databaseValues['POSTGRES_USER']) { throw 'Thiếu cấu hình PostgreSQL trong container.' }

$variableNames = @('JAVA_HOME', 'Path', 'DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD')
$previousValues = @{}
foreach ($name in $variableNames) { $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

try {
    $env:JAVA_HOME = $JdkHome
    $env:Path = "$JdkHome\bin;$env:Path"
    $env:DB_URL = 'jdbc:postgresql://localhost:5432/' + $databaseValues['POSTGRES_DB']
    $env:DB_USERNAME = $databaseValues['POSTGRES_USER']
    $env:DB_PASSWORD = $databaseValues['POSTGRES_PASSWORD']
    $env:REDIS_HOST = 'localhost'
    $env:REDIS_PORT = '6379'
    $env:REDIS_PASSWORD = ''
    $redisArguments = @($redisConfig.Config.Cmd)
    $passwordIndex = [Array]::IndexOf($redisArguments, '--requirepass')
    if ($passwordIndex -ge 0) { $env:REDIS_PASSWORD = $redisArguments[$passwordIndex + 1] }

    Write-Host "JAVA_HOME: $JdkHome"
    Push-Location -LiteralPath $BackendPath
    try {
        & '.\mvnw.cmd' '-version'
        if ($LASTEXITCODE -ne 0) { throw 'Không chạy được Maven với JDK đã chọn.' }
        & '.\mvnw.cmd' 'spring-boot:run' '-Dspring-boot.run.jvmArguments=-Dspring.devtools.restart.enabled=false'
        if ($LASTEXITCODE -ne 0) { throw 'Backend khởi động thất bại. Kiểm tra log ở trên.' }
    } finally { Pop-Location }
} finally {
    foreach ($name in $variableNames) { [Environment]::SetEnvironmentVariable($name, $previousValues[$name], 'Process') }
}
