param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$InstructorEmail = "faculty@brocku.ca",
    [string]$InstructorPassword = "password123",
    [int]$WaitSeconds = 75,
    [string]$DbContainer = "code_checker_db",
    [switch]$SkipApiRedactionCheck
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Require-Command {
    param([string]$Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-CurlJson {
    param([string[]]$ReqArgs)
    $raw = & curl.exe @Args
    if ($LASTEXITCODE -ne 0) {
        throw "curl request failed. Args: $($Args -join ' ')"
    }

    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    try {
        return $raw | ConvertFrom-Json
    }
    catch {
        throw "Expected JSON but got: $raw"
    }
}

function Invoke-PsqlScalar {
    param(
        [string]$Sql,
        [string]$ContainerName
    )

    $result = & docker exec $ContainerName psql -U user -d codechecker -t -A -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "psql query failed: $Sql"
    }
    return ($result | Out-String).Trim()
}

Require-Command -Name "curl.exe"
Require-Command -Name "docker"

Write-Step "Health check"
$health = Invoke-CurlJson -Args @("-sS", "-X", "GET", "$BaseUrl/api/v1/health")
if (-not $health -or $health.status -ne "ok") {
    throw "Backend health check failed at $BaseUrl/api/v1/health"
}
Write-Host "Backend is healthy."

Write-Step "Login as instructor"
$login = Invoke-CurlJson -Args @(
    "-sS", "-X", "POST", "$BaseUrl/api/v1/auth/login",
    "-H", "Content-Type: application/x-www-form-urlencoded",
    "-d", "username=$InstructorEmail",
    "-d", "password=$InstructorPassword"
)

if (-not $login.access_token) {
    throw "Login failed. Check instructor credentials."
}

$token = $login.access_token
$authHeader = "Authorization: Bearer $token"
Write-Host "Instructor login successful."

Write-Step "Create temporary Java submission zip"
$tempRoot = Join-Path $env:TEMP ("archive-e2e-" + [guid]::NewGuid().ToString("N"))
$null = New-Item -Path $tempRoot -ItemType Directory -Force
$javaPath = Join-Path $tempRoot "Main.java"
$zipPath = Join-Path $tempRoot "submission.zip"

@(
    'public class Main {',
    '    public static void main(String[] args) {',
    '        System.out.println("archive scheduler test");',
    '    }',
    '}'
) | Set-Content -Path $javaPath -Encoding UTF8

Compress-Archive -Path $javaPath -DestinationPath $zipPath -Force
Write-Host "Created $zipPath"

Write-Step "Create assignment with future deadline"
$courseCode = "ARCHIVE_TEST"
$title = "Archive Scheduler E2E " + (Get-Date -Format "yyyyMMdd-HHmmss")
$futureDeadline = [DateTime]::UtcNow.AddMinutes(15).ToString("yyyy-MM-ddTHH:mm:ssZ")

$assignment = Invoke-CurlJson -Args @(
    "-sS", "-X", "POST", "$BaseUrl/api/v1/instructor/assignments",
    "-H", $authHeader,
    "-F", "course_code=$courseCode",
    "-F", "title=$title",
    "-F", "language=JAVA",
    "-F", "deadline=$futureDeadline"
)

if (-not $assignment.id -or -not $assignment.access_key) {
    throw "Assignment creation failed. Response missing id or access_key."
}

$assignmentId = $assignment.id
$accessKey = $assignment.access_key
Write-Host "Created assignment $assignmentId with access key $accessKey"

Write-Step "Submit one student file"
$submit = Invoke-CurlJson -Args @(
    "-sS", "-X", "POST", "$BaseUrl/api/v1/student/submit",
    "-F", "access_key=$accessKey",
    "-F", "student_name=Archive Test Student",
    "-F", "student_id=A1234567",
    "-F", "file=@$zipPath"
)

if (-not $submit.submission_id) {
    throw "Submission failed."
}

$submissionId = $submit.submission_id
Write-Host "Created submission $submissionId"

Write-Step "Move deadline to 31 days in the past"
$pastDeadline = [DateTime]::UtcNow.AddDays(-31).ToString("yyyy-MM-ddTHH:mm:ssZ")
$null = Invoke-CurlJson -Args @(
    "-sS", "-X", "PATCH", "$BaseUrl/api/v1/instructor/assignments/$assignmentId",
    "-H", $authHeader,
    "-F", "deadline=$pastDeadline"
)
Write-Host "Deadline moved to $pastDeadline"

Write-Step "Wait for scheduler"
Write-Host "Sleeping for $WaitSeconds second(s)..."
Start-Sleep -Seconds $WaitSeconds

Write-Step "DB assertions (verifies scheduler without hitting lazy archive endpoints)"
$statusSql = "SELECT status FROM assignments WHERE id = '$assignmentId';"
$piiSql = "SELECT COUNT(*) FROM submissions WHERE assignment_id = '$assignmentId' AND (student_name_encrypted IS NOT NULL OR student_id_encrypted IS NOT NULL);"
$repoSql = "SELECT COUNT(*) FROM repositories WHERE source_assignment_id = '$assignmentId';"
$cmpSql = @"
SELECT COUNT(*)
FROM comparison_results
WHERE source_submission_id IN (SELECT id FROM submissions WHERE assignment_id = '$assignmentId')
   OR target_submission_id IN (SELECT id FROM submissions WHERE assignment_id = '$assignmentId');
"@

$dbStatus = Invoke-PsqlScalar -Sql $statusSql -ContainerName $DbContainer
$piiRemaining = [int](Invoke-PsqlScalar -Sql $piiSql -ContainerName $DbContainer)
$repoCount = [int](Invoke-PsqlScalar -Sql $repoSql -ContainerName $DbContainer)
$cmpCount = [int](Invoke-PsqlScalar -Sql $cmpSql -ContainerName $DbContainer)

Write-Host "Assignment status in DB: $dbStatus"
Write-Host "Submissions with remaining PII: $piiRemaining"
Write-Host "Repositories linked to assignment: $repoCount"
Write-Host "Comparison rows remaining for assignment submissions: $cmpCount"

if ($dbStatus -ne "Archived") {
    throw "FAILED: assignment is not Archived in DB."
}
if ($piiRemaining -ne 0) {
    throw "FAILED: PII was not fully stripped from submissions."
}
if ($repoCount -lt 1) {
    throw "FAILED: repository snapshot was not created."
}
if ($cmpCount -ne 0) {
    throw "FAILED: comparison results were not cleared."
}

if (-not $SkipApiRedactionCheck) {
    Write-Step "API redaction check"
    $subs = Invoke-CurlJson -Args @(
        "-sS", "-X", "GET", "$BaseUrl/api/v1/instructor/assignments/$assignmentId/submissions",
        "-H", $authHeader
    )

    if (-not $subs -or $subs.Count -lt 1) {
        throw "FAILED: submissions API returned no rows."
    }

    $allRedacted = $true
    foreach ($row in $subs) {
        if ($row.masked_student_id -ne "REDACTED") {
            $allRedacted = $false
        }
    }

    if (-not $allRedacted) {
        throw "FAILED: submissions API still exposes non-redacted student IDs."
    }

    Write-Host "Submissions API shows REDACTED identities as expected."
}

Write-Step "PASS"
Write-Host "Archive scheduler test passed for assignment $assignmentId"

Write-Host "\nCleanup note: this script intentionally leaves test data so you can inspect it in UI/DB."
