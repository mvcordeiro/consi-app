# Gera o APK do Consi neste PC (sem gastar a cota de builds do EAS), assinado com a mesma chave do EAS.
# Rode na raiz do projeto: powershell -ExecutionPolicy Bypass -File scripts\apk-local.ps1
# 1a vez: instala Java 17 e o Android SDK (~5-8 GB). Depois, só o build.
$ErrorActionPreference = 'Stop'

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  winget install --id Microsoft.OpenJDK.17 -e --accept-source-agreements --accept-package-agreements
  $env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-17*' | Select-Object -First 1).FullName
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
}
if (-not (Test-Path "$sdk\cmdline-tools\latest\bin\sdkmanager.bat")) {
  New-Item -ItemType Directory -Force "$sdk\cmdline-tools" | Out-Null
  $zip = "$env:TEMP\cmdline-tools.zip"
  Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip' -OutFile $zip
  Expand-Archive $zip "$sdk\cmdline-tools" -Force
  Rename-Item "$sdk\cmdline-tools\cmdline-tools" 'latest'
  'y`n' * 20 | & "$sdk\cmdline-tools\latest\bin\sdkmanager.bat" --licenses | Out-Null
  & "$sdk\cmdline-tools\latest\bin\sdkmanager.bat" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
}
$env:ANDROID_HOME = $sdk
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')

# Chave de assinatura do EAS: baixe uma vez com
#   npx eas-cli@latest credentials -p android   (Keystore → Download) e salve como credentials.json + o .jks
if (-not (Test-Path 'credentials.json')) { throw 'Falta o credentials.json do EAS (veja o comentário acima).' }

npx expo prebuild -p android --clean
Push-Location android
.\gradlew.bat assembleRelease
Pop-Location
Write-Host 'APK: android\app\build\outputs\apk\release\app-release.apk'
