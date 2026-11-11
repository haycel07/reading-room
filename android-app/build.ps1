param([int]$VersionCode = 1, [string]$VersionName = '1.0.0')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$appRoot = $PSScriptRoot
$projectRoot = Split-Path $appRoot -Parent
$toolRoot = Join-Path $env:LOCALAPPDATA 'OnePageBuild'
# Store-packaged desktop tools may have virtualized LOCALAPPDATA. Reuse the
# original signing identity in place; never silently create a different signer.
$legacyToolRoot = Join-Path $env:LOCALAPPDATA 'Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OnePageBuild'
if (!(Test-Path -LiteralPath (Join-Path $toolRoot 'onepage-release.p12')) -and
    (Test-Path -LiteralPath (Join-Path $legacyToolRoot 'onepage-release.p12')) -and
    (Test-Path -LiteralPath (Join-Path $legacyToolRoot 'onepage-signing.dpapi'))) { $toolRoot = $legacyToolRoot }
$keyPath = Join-Path $toolRoot 'onepage-release.p12'
$passwordPath = Join-Path $toolRoot 'onepage-signing.dpapi'
if (!(Test-Path -LiteralPath $keyPath) -or !(Test-Path -LiteralPath $passwordPath)) {
    throw 'Original signing identity is unavailable. Restore both onepage-release.p12 and onepage-signing.dpapi; this update build never generates replacement keys.'
}
$buildRoot = Join-Path $appRoot 'build'
$outputRoot = Join-Path $projectRoot 'output\android'
New-Item -ItemType Directory -Force -Path $toolRoot,$buildRoot,$outputRoot | Out-Null

function Download([string]$Url,[string]$Path) {
    if (!(Test-Path -LiteralPath $Path) -or (Get-Item -LiteralPath $Path).Length -eq 0) {
        $partial = $Path + '.download'
        & curl.exe --location --fail --silent --show-error --retry 2 $Url --output $partial
        if ($LASTEXITCODE -ne 0) { throw "Download failed: $Url" }
        Move-Item -LiteralPath $partial -Destination $Path -Force
    }
}
function Run([string]$Executable,[string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Build command failed: $Executable" }
}
function VerifyTool([string]$Path,[string]$Sha256) {
    if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -ne $Sha256) { throw "Tool checksum mismatch: $Path. Preserve it for investigation and fetch the pinned official version." }
}

# Official, pinned open-source tool distributions. No global PATH/config changes.
$jdkArchive = Join-Path $toolRoot 'microsoft-jdk-17.0.21-windows-x64.zip'
Download 'https://aka.ms/download-jdk/microsoft-jdk-17.0.21.0.2-windows-x64.zip' $jdkArchive
VerifyTool $jdkArchive '49154292866386B2F4F09A3ECF3BE07AB80A419149C84EC1D4419B9EEC9E4B64'
if (!(Test-Path (Join-Path $toolRoot 'jdk\jdk-17.0.21.0.2+1\bin\java.exe'))) {
    Expand-Archive -LiteralPath $jdkArchive -DestinationPath (Join-Path $toolRoot 'jdk') -Force
}
$jdk = Get-ChildItem (Join-Path $toolRoot 'jdk') -Directory | Where-Object {Test-Path (Join-Path $_.FullName 'bin\javac.exe')} | Select-Object -First 1
if (!$jdk) { throw 'OpenJDK extraction failed' }
$java = Join-Path $jdk.FullName 'bin\java.exe'
$javac = Join-Path $jdk.FullName 'bin\javac.exe'
$jar = Join-Path $jdk.FullName 'bin\jar.exe'
$keytool = Join-Path $jdk.FullName 'bin\keytool.exe'
Download 'https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/8.13.2-14304508/aapt2-8.13.2-14304508-windows.jar' (Join-Path $toolRoot 'aapt2.zip')
VerifyTool (Join-Path $toolRoot 'aapt2.zip') '5DC730C3DC454B76D779A46036C06FD9C874039A31E22214434ECDBE64C3300A'
if (!(Test-Path (Join-Path $toolRoot 'aapt2\aapt2.exe'))) { Expand-Archive (Join-Path $toolRoot 'aapt2.zip') (Join-Path $toolRoot 'aapt2') -Force }
Download 'https://dl.google.com/dl/android/maven2/com/android/tools/r8/8.13.17/r8-8.13.17.jar' (Join-Path $toolRoot 'r8.jar')
Download 'https://dl.google.com/dl/android/maven2/com/android/tools/build/apksig/8.13.2/apksig-8.13.2.jar' (Join-Path $toolRoot 'apksig.jar')
VerifyTool (Join-Path $toolRoot 'r8.jar') 'D31FD0DC751D48740009CDD9A485126ACB1D0D14C59B9F05579479940F4ADF74'
VerifyTool (Join-Path $toolRoot 'apksig.jar') 'C070ED1394629D74641AA0906F60B2FFA1EE77E6366A1F93437F59717B1AEB89'
$androidJar = Join-Path $toolRoot 'android.jar'
if (!(Test-Path $androidJar)) {
    $encoded = Invoke-WebRequest 'https://android.googlesource.com/platform/prebuilts/sdk/+/refs/heads/android15-release/35/public/android.jar?format=TEXT' -UseBasicParsing
    [IO.File]::WriteAllBytes($androidJar,[Convert]::FromBase64String($encoded.Content))
}
VerifyTool $androidJar 'EE568219AA3754977207A8FD849FDBF3A299658DD26DD0907D39CA830587F8AA'
$aapt = Join-Path $toolRoot 'aapt2\aapt2.exe'
$classes = Join-Path $buildRoot 'classes'
$dex = Join-Path $buildRoot 'dex'
New-Item -ItemType Directory -Force -Path $classes,$dex | Out-Null
$manifest = Join-Path $buildRoot 'AndroidManifest.xml'
$xml = [IO.File]::ReadAllText((Join-Path $appRoot 'AndroidManifest.xml')).Replace('android:versionCode="1"', ('android:versionCode="'+$VersionCode+'"')).Replace('android:versionName="1.0.0"', ('android:versionName="'+$VersionName+'"'))
[IO.File]::WriteAllText($manifest,$xml,[Text.UTF8Encoding]::new($false))
Run $aapt @('compile','--dir',(Join-Path $appRoot 'res'),'-o',(Join-Path $buildRoot 'resources.zip'))
$unsigned = Join-Path $buildRoot 'unsigned.apk'
Run $aapt @('link','-I',$androidJar,'--manifest',$manifest,'-o',$unsigned,'--min-sdk-version','26','--target-sdk-version','35',(Join-Path $buildRoot 'resources.zip'))
Run $javac @('--release','8','-encoding','UTF-8','-cp',$androidJar,'-d',$classes,(Join-Path $appRoot 'src\chat\tangqichen\onepage\MainActivity.java'))
$classJar = Join-Path $buildRoot 'classes.jar'
Run $jar @('cf',$classJar,'-C',$classes,'chat')
Run $java @('-cp',(Join-Path $toolRoot 'r8.jar'),'com.android.tools.r8.D8','--release','--lib',$androidJar,'--min-api','26','--output',$dex,$classJar)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($unsigned,[IO.Compression.ZipArchiveMode]::Update)
try {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $dex 'classes.dex'),'classes.dex',[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $dist = (Resolve-Path (Join-Path $projectRoot 'dist')).Path
    foreach ($file in Get-ChildItem -LiteralPath $dist -Recurse -File) {
        $relative = $file.FullName.Substring($dist.Length+1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,('assets/reader/'+$relative),[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $zip.Dispose() }

# Keep this identity for future upgrades. The signing key never enters the repo/APK.
# Password is DPAPI encrypted for this Windows user, not stored in plain text.
$secure = (Get-Content -LiteralPath $passwordPath -Raw).Trim() | ConvertTo-SecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $env:ONEPAGE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    Run $javac @('--release','8','-cp',(Join-Path $toolRoot 'apksig.jar'),'-d',$classes,(Join-Path $appRoot 'tools\SignApk.java'))
    $apk = Join-Path $outputRoot ('一页之间-'+$VersionName+'.apk')
    $signClassPath = $classes+';'+(Join-Path $toolRoot 'apksig.jar')
    Run $java @('-cp',$signClassPath,'SignApk',$unsigned,$apk,$keyPath)
    Run $java @('-cp',$signClassPath,'SignApk','verify',$apk,'638620ea11f4f1ce0df43d37fb98ec856dfbb5951f065f4fc44771de6fa84d26')
    Run $aapt @('dump','badging',$apk)
    $assetHashes = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'dist') -Recurse -File | ForEach-Object {
        [ordered]@{path=$_.FullName.Substring($dist.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
    }
    $assetHashes | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $outputRoot 'app-assets-sha256.json') -Encoding UTF8
    Get-FileHash -Algorithm SHA256 -LiteralPath $apk | Format-List Path,Hash
} finally {
    Remove-Item Env:ONEPAGE_KEY_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
