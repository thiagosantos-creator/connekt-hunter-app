param(
  [Parameter(Mandatory = $true)]
  [string]$StackName,

  [string]$Region = "us-east-1",

  [string]$OutputPath = ".env.aws.generated"
)

$ErrorActionPreference = "Stop"

function Get-StackOutputMap {
  param([string]$Name, [string]$StackRegion)

  $stackJson = aws cloudformation describe-stacks --stack-name $Name --region $StackRegion --query "Stacks[0].Outputs" --output json
  $outputs = $stackJson | ConvertFrom-Json
  $map = @{}
  foreach ($item in $outputs) {
    $map[$item.OutputKey] = $item.OutputValue
  }
  return $map
}

function Get-UserPoolClientSecret {
  param(
    [string]$PoolId,
    [string]$ClientId,
    [string]$StackRegion
  )

  $clientJson = aws cognito-idp describe-user-pool-client --user-pool-id $PoolId --client-id $ClientId --region $StackRegion --query "UserPoolClient.ClientSecret" --output text
  if ($LASTEXITCODE -ne 0) {
    throw "Nao foi possivel obter o client secret do pool $PoolId"
  }
  return $clientJson
}

$outputs = Get-StackOutputMap -Name $StackName -StackRegion $Region
$workforceSecret = Get-UserPoolClientSecret -PoolId $outputs.WorkforceUserPoolId -ClientId $outputs.WorkforceClientId -StackRegion $Region
$candidateSecret = Get-UserPoolClientSecret -PoolId $outputs.CandidateUserPoolId -ClientId $outputs.CandidateClientId -StackRegion $Region

$envLines = @(
  "APP_ENV=staging"
  "AWS_REGION=$Region"
  "S3_REGION=$Region"
  "S3_BUCKET=$($outputs.AssetsBucketName)"
  "S3_ENDPOINT="
  "S3_FORCE_PATH_STYLE=false"
  "FF_STORAGE_REAL=true"
  "FF_AUTH_REAL=true"
  "FF_AI_REAL=true"
  "FF_CV_PARSER_REAL=true"
  "FF_TRANSCRIPTION_REAL=true"
  "STORAGE_FALLBACK_TO_MOCK=true"
  "AUTH_FALLBACK_TO_MOCK=true"
  "AI_FALLBACK_TO_MOCK=true"
  "CV_PARSER_FALLBACK_TO_MOCK=true"
  "TRANSCRIPTION_FALLBACK_TO_MOCK=true"
  "COGNITO_USER_POOL_ID=$($outputs.WorkforceUserPoolId)"
  "COGNITO_CLIENT_ID=$($outputs.WorkforceClientId)"
  "COGNITO_CLIENT_SECRET=$workforceSecret"
  "COGNITO_DOMAIN=$($outputs.WorkforceDomain)"
  "COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback"
  "COGNITO_LOGOUT_URI=http://localhost:5173"
  "COGNITO_CANDIDATE_POOL_ID=$($outputs.CandidateUserPoolId)"
  "COGNITO_CANDIDATE_CLIENT_ID=$($outputs.CandidateClientId)"
  "COGNITO_CANDIDATE_CLIENT_SECRET=$candidateSecret"
  "COGNITO_CANDIDATE_DOMAIN=$($outputs.CandidateDomain)"
  "COGNITO_CANDIDATE_REDIRECT_URI=http://localhost:5174/auth/callback"
  "COGNITO_CANDIDATE_LOGOUT_URI=http://localhost:5174"
  "CANDIDATE_WEB_URL=http://localhost:5174"
  "OPENAI_API_KEY=__REPLACE_ME__"
  "AI_PROVIDER_API_KEY=__REPLACE_ME__"
  "AWS_ACCESS_KEY_ID=__REPLACE_ME__"
  "AWS_SECRET_ACCESS_KEY=__REPLACE_ME__"
  "AWS_SESSION_TOKEN="
  "AWS_TRANSCRIBE_REGION=$Region"
  "AWS_COMPREHEND_REGION=$Region"
)

Set-Content -Path $OutputPath -Value $envLines -Encoding ascii
Write-Output "Arquivo gerado em $OutputPath"
