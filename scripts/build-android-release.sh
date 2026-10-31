#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export NODE_ENV=production
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [[ ! -f "$HOME/.config/emotionary/android-upload.properties" ]]; then
  echo 'Missing Emotionary upload signing configuration.' >&2
  exit 1
fi
# Prebuild must finish before Gradle starts. Never run concurrently.
CI=1 npx expo prebuild --platform android --no-install
./android/gradlew -p android :app:bundleRelease :app:assembleRelease \
  --console=plain --max-workers=2 \
  -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1536m'
