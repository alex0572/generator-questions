# build-and-push.ps1 - build and push production images to Docker Hub (Windows).
# Run: docker login, then .\build-and-push.ps1
# DOCKER_USER задаётся в deploy\.env

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$RootDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ScriptDir ".env"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$DockerUser = if ($env:DOCKER_USER) { $env:DOCKER_USER.Trim() } else { "" }
$ImageTag   = if ($env:IMAGE_TAG) { $env:IMAGE_TAG.Trim() } else { "latest" }

if (-not $DockerUser -or $DockerUser -eq "your-docker-hub-username") {
    Write-Host "ERROR: задайте DOCKER_USER в deploy\.env" -ForegroundColor Red
    Write-Host "  1. copy deploy\.env.example deploy\.env"
    Write-Host "  2. DOCKER_USER=ваш_ник_на_hub.docker.com"
    exit 1
}

$BackendImage  = "${DockerUser}/questions-backend:${ImageTag}"
$FrontendImage = "${DockerUser}/questions-frontend:${ImageTag}"

Write-Host "Docker Hub user: $DockerUser"
Write-Host "=== Building backend: $BackendImage ==="
docker build -f "$RootDir\Dockerfile.prod" -t $BackendImage $RootDir
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Building frontend: $FrontendImage ==="
docker build -f "$RootDir\frontend\Dockerfile.prod" -t $FrontendImage "$RootDir\frontend"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Pushing to Docker Hub (docker login required) ==="
docker push $BackendImage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker push $FrontendImage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Done ==="
Write-Host "  $BackendImage"
Write-Host "  $FrontendImage"
