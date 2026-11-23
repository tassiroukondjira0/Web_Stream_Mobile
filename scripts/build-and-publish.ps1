# Script tout-en-un : incremente la version, build local, copie APK, commit et push
#
# Usage :
#   .\scripts\build-and-publish.ps1
#   .\scripts\build-and-publish.ps1 -Message "Mon message personnalise"
#
# Ce script :
#   0. Incremente la version (patch par defaut : 1.1.0 -> 1.1.1)
#   1. Lance le build Gradle (assembleRelease)
#   2. Copie l'APK vers Web_Stream/apk/
#   3. Commit la nouvelle version dans Web_Stream_Mobile
#   4. Commit et push l'APK dans le depot Web_Stream

param(
    [string]$Message = "Plateforme de streaming"
)

$ErrorActionPreference = 'Stop'

# Chemins
$GradlewPath = Join-Path $PSScriptRoot '..\android\gradlew.bat'
$ApkSource = Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\release\app-release.apk'
$ApkDestDir = Join-Path $PSScriptRoot '..\..\Web_Stream\apk'
$WebStreamRoot = Join-Path $PSScriptRoot '..\..\Web_Stream'

Write-Host "========================================"
Write-Host "  Cinemax - Build & Publish APK"
Write-Host "========================================"
Write-Host ""

# Etape 0 : Nettoyer les anciens APK (local + Git)
Write-Host "[0/6] Nettoyage des anciens APK..."
if (Test-Path $ApkDestDir) {
    $deleted = Get-ChildItem -Path $ApkDestDir -Filter "*.apk" | ForEach-Object {
        Remove-Item $_.FullName -Force
        $_.Name
    }
    if ($deleted.Count -gt 0) {
        Write-Host "  Local supprime : $($deleted -join ', ')"
    } else {
        Write-Host "  Aucun ancien APK local a supprimer."
    }
} else {
    New-Item -ItemType Directory -Path $ApkDestDir -Force | Out-Null
    Write-Host "  Dossier de destination cree."
}

# Supprimer les anciens APK de Git pour eviter qu'ils restent sur GitHub
Push-Location $WebStreamRoot
try {
    $gitDeleted = git ls-files -- 'apk/*.apk' 2>$null
    if ($gitDeleted) {
        git rm --cached $gitDeleted | Out-Null
        Write-Host "  Git supprime : $($gitDeleted -replace 'apk/', '')"
    }
} catch {
    Write-Warning "Impossible de nettoyer les anciens APK de Git."
}
Pop-Location
Write-Host ""

# Etape 1 : Incrementer la version
Write-Host "[1/6] Incrementation de la version..."
node ./scripts/bump-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "L'incrementation de la version a echoue."
    exit 1
}
Write-Host ""

# Etape 2 : Build Gradle
Write-Host "[2/6] Build Gradle en cours..."

# Verifier que Java est installe et configurer JAVA_HOME si necessaire
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
    Write-Host ""
    Write-Host "Java n'est pas installe."
    Write-Host ""
    Write-Host "Le build Gradle necessite Java 17 (OpenJDK)."
    Write-Host ""
    Write-Host "Installation rapide :"
    Write-Host "  1. Ouvre PowerShell en tant qu'administrateur"
    Write-Host "  2. Execute : choco install openjdk17 -y"
    Write-Host "  3. Redemarre ton ordinateur"
    Write-Host ""
    Write-Host "Ou telecharge manuellement :"
    Write-Host "  https://adoptium.net/temurin/releases/?version=17"
    Write-Host ""
    Write-Host "Apres installation, verifie avec : java -version"
    Write-Host ""
    exit 1
}

# Detecter et corriger JAVA_HOME automatiquement
if (-not $env:JAVA_HOME) {
    $adoptiumDir = "C:\Program Files\Eclipse Adoptium"
    if (Test-Path $adoptiumDir) {
        $jdkDir = Get-ChildItem $adoptiumDir -Directory | Where-Object { $_.Name -like "jdk-17*" } | Sort-Object Name -Descending | Select-Object -First 1
        if ($jdkDir) {
            $env:JAVA_HOME = $jdkDir.FullName
            Write-Host "  JAVA_HOME detecte : $env:JAVA_HOME"
        }
    }
}

# Si JAVA_HOME est defini mais invalide, essayer de le corriger
if ($env:JAVA_HOME -and -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    Write-Host "  JAVA_HOME invalide : $env:JAVA_HOME"
    $adoptiumDir = "C:\Program Files\Eclipse Adoptium"
    if (Test-Path $adoptiumDir) {
        $jdkDir = Get-ChildItem $adoptiumDir -Directory | Where-Object { $_.Name -like "jdk-17*" } | Sort-Object Name -Descending | Select-Object -First 1
        if ($jdkDir) {
            $env:JAVA_HOME = $jdkDir.FullName
            Write-Host "  JAVA_HOME corrige : $env:JAVA_HOME"
        } else {
            Write-Host ""
            Write-Host "Impossible de trouver Java 17 dans $adoptiumDir"
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "JAVA_HOME pointe vers un repertoire invalide et Eclipse Adoptium n'est pas trouve."
        exit 1
    }
}

# Verifier que l'Android SDK est installe et configurer local.properties
$androidSdkPath = $null
if ($env:ANDROID_HOME) {
    if (Test-Path (Join-Path $env:ANDROID_HOME "platform-tools")) {
        $androidSdkPath = $env:ANDROID_HOME
    }
}
if ($env:ANDROID_SDK_ROOT) {
    if (Test-Path (Join-Path $env:ANDROID_SDK_ROOT "platform-tools")) {
        $androidSdkPath = $env:ANDROID_SDK_ROOT
    }
}
# Chercher dans les emplacements par defaut
if (-not $androidSdkPath) {
    $defaultSdkPaths = @(
        "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk",
        "C:\Program Files\Android\Android SDK"
    )
    foreach ($sdkPath in $defaultSdkPaths) {
        if (Test-Path (Join-Path $sdkPath "platform-tools")) {
            $androidSdkPath = $sdkPath
            break
        }
    }
}

if (-not $androidSdkPath) {
    Write-Host ""
    Write-Host "Android SDK non trouve."
    Write-Host ""
    Write-Host "Le build Gradle necessite l'Android SDK."
    Write-Host ""
    Write-Host "Installation :"
    Write-Host "  1. Telecharge Android Studio : https://developer.android.com/studio"
    Write-Host "  2. Installe-le et lance-le une fois pour accepter les licences SDK"
    Write-Host "  3. Dans Android Studio : Tools > SDK Manager > SDK Platforms"
    Write-Host "     -> Coche 'Android 14.0 (API 34)' ou superieur"
    Write-Host "  4. Dans SDK Tools -> Coche 'Android SDK Build-Tools' et 'Android SDK Platform-Tools'"
    Write-Host ""
    Write-Host "Apres installation, relance ce script - il detectera le SDK automatiquement."
    Write-Host ""
    exit 1
}

# Creer android/local.properties si necessaire
$AndroidDir = Join-Path $PSScriptRoot '..\android'
$localPropsPath = Join-Path $AndroidDir 'local.properties'

# S'assurer que le dossier android existe
if (-not (Test-Path $AndroidDir)) {
    Write-Host "  Creation du dossier android..."
    New-Item -ItemType Directory -Path $AndroidDir -Force | Out-Null
}

$sdkForProps = $androidSdkPath -replace '\\', '/'
Set-Content -Path $localPropsPath -Value "sdk.dir=$sdkForProps" -Encoding ascii
Write-Host "  local.properties : sdk.dir=$sdkForProps"

# Verifier que le NDK est installe (requis par React Native)
$ndkPath = Join-Path $androidSdkPath 'ndk'
if (-not (Test-Path $ndkPath)) {
    Write-Host ""
    Write-Host "NDK (Native Development Kit) non trouve."
    Write-Host ""
    Write-Host "React Native necessite le NDK pour compiler les modules natifs."
    Write-Host ""
    Write-Host "Installation via Android Studio :"
    Write-Host "  1. Ouvre Android Studio"
    Write-Host "  2. File > Settings > Appearance & Behavior > System Settings > Android SDK"
    Write-Host "  3. Clique sur l'onglet 'SDK Tools'"
    Write-Host "  4. Coche 'NDK (Side by side)'"
    Write-Host "  5. Clique sur 'Apply' puis 'OK' pour installer"
    Write-Host "  6. Ferme Android Studio et relance ce script"
    Write-Host ""
    exit 1
}

# Définir ANDROID_HOME pour que Gradle trouve le SDK (évite les erreurs de validation de chemin)
$env:ANDROID_HOME = $androidSdkPath

if (-not (Test-Path $GradlewPath)) {
    Write-Error "gradlew.bat non trouve. Executez d'abord 'npx expo prebuild'."
    exit 1
}

Push-Location $AndroidDir
try {
    & .\gradlew.bat assembleRelease
} catch {
    Write-Error "Le build Gradle a echoue."
    Pop-Location
    exit 1
}
Pop-Location

if (-not (Test-Path $ApkSource)) {
    Write-Error "APK non trouve apres le build : $ApkSource"
    exit 1
}
Write-Host "[2/6] Build termine avec succes !"
Write-Host ""

# Etape 3 : Copier et renommer l'APK avec la version
Write-Host "[3/6] Copie de l'APK..."

# Lire la version pour le nom de fichier
$version = node -p "require('./app.json').expo.version"
$ApkDest = Join-Path $ApkDestDir "cinemax-${version}.apk"

Copy-Item -Path $ApkSource -Destination $ApkDest -Force
$Stat = Get-Item $ApkDest
$Size = [math]::Round($Stat.Length / 1MB, 2)
Write-Host "[3/6] APK copie et renomme : cinemax-${version}.apk (${Size} MB)"
Write-Host ""

# Etape 4 : Commit des changements de version dans le repo mobile
Write-Host "[4/6] Commit de la nouvelle version dans Web_Stream_Mobile..."
$MobileRoot = Join-Path $PSScriptRoot '..'
Push-Location $MobileRoot
try {
    $versionInfo = node -p "require('./app.json').expo.version"
    git add app.json package.json android/app/build.gradle
    git commit -m "Bump version to $versionInfo"
    git push
} catch {
    Write-Warning "Le commit de la version a echoue - vous pouvez le faire manuellement."
}
Pop-Location
Write-Host ""

# Etape 5 : Message de commit
Write-Host "[5/6] Preparation du commit..."
if (-not $Message) {
    $DateStr = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "Update local APK build ($DateStr)"
}
Write-Host "  Message : $Message"
Write-Host ""

# Etape 6 : Commit et push
Write-Host "[6/6] Commit et push dans Web_Stream..."
Push-Location $WebStreamRoot
try {
    git add .gitattributes
    git add "apk\cinemax-${version}.apk"
    git commit -m $Message
    git push
} catch {
    Write-Error "Le commit ou le push a echoue."
    Write-Host ""
    Write-Host "Vous pouvez le faire manuellement :"
    Write-Host "  git add .gitattributes"
    Write-Host "  git add apk\cinemax-${version}.apk"
    Write-Host "  git commit -m `"$Message`""
    Write-Host "  git push"
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "========================================"
Write-Host "  Build publie avec succes !"
Write-Host "  Fichier : cinemax-${version}.apk"
Write-Host "  Taille  : ${Size} MB"
Write-Host "  Date    : $($Stat.LastWriteTime)"
Write-Host ""
Write-Host "  Pour installer sur votre telephone :"
Write-Host "    1. Transfert le fichier vers votre telephone"
Write-Host "    2. Autorisez l'installation depuis une source inconnue"
Write-Host "    3. Ouvrez le fichier cinemax-${version}.apk"
Write-Host "========================================"
