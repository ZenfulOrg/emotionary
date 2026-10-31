const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = (config) => withAppBuildGradle(config, (config) => {
  const marker = '// Emotionary upload signing';
  if (!config.modResults.contents.includes(marker)) {
    config.modResults.contents += `
${marker}
def emotionarySigning = new Properties()
def emotionarySigningFile = new File(System.getProperty('user.home'), '.config/emotionary/android-upload.properties')
if (emotionarySigningFile.exists()) {
    emotionarySigningFile.withInputStream { emotionarySigning.load(it) }
    android.signingConfigs.create('emotionaryUpload') {
        storeFile file(emotionarySigning.getProperty('storeFile'))
        storePassword emotionarySigning.getProperty('storePassword')
        keyAlias emotionarySigning.getProperty('keyAlias')
        keyPassword emotionarySigning.getProperty('keyPassword')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.emotionaryUpload
} else {
    // Never silently ship a release signed with the Android debug key.
    android.buildTypes.release.signingConfig = null
}
`;
  }
  return config;
});
