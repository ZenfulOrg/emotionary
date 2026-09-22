const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET_NAME = 'ExpoWidgetsTarget';
const ASSET_CATALOG = `${TARGET_NAME}/Assets.xcassets`;

// The brand's two families, bundled so the widget speaks in the same voice.
const WIDGET_FONTS = [
  'node_modules/@expo-google-fonts/cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf',
  'node_modules/@expo-google-fonts/dm-mono/400Regular/DMMono_400Regular.ttf',
];
const fontName = (file) => path.basename(file);

function withWidgetAssetFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const source = path.join(
        modConfig.modRequest.projectRoot,
        'assets/images/widget-moody-nature.png',
      );
      const catalog = path.join(
        modConfig.modRequest.platformProjectRoot,
        TARGET_NAME,
        'Assets.xcassets',
      );
      const imageSet = path.join(catalog, 'MoodyNature.imageset');

      for (const font of WIDGET_FONTS) {
        fs.copyFileSync(
          path.join(modConfig.modRequest.projectRoot, font),
          path.join(modConfig.modRequest.platformProjectRoot, TARGET_NAME, fontName(font)),
        );
      }
      const infoPlistPath = path.join(modConfig.modRequest.platformProjectRoot, TARGET_NAME, 'Info.plist');
      if (fs.existsSync(infoPlistPath)) {
        const plist = require('@expo/plist').default;
        const info = plist.parse(fs.readFileSync(infoPlistPath, 'utf8'));
        info.UIAppFonts = WIDGET_FONTS.map(fontName);
        fs.writeFileSync(infoPlistPath, plist.build(info));
      }

      fs.mkdirSync(imageSet, { recursive: true });
      fs.copyFileSync(source, path.join(imageSet, 'widget-moody-nature.png'));
      fs.writeFileSync(
        path.join(catalog, 'Contents.json'),
        `${JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2)}\n`,
      );
      fs.writeFileSync(
        path.join(imageSet, 'Contents.json'),
        `${JSON.stringify(
          {
            images: [
              {
                filename: 'widget-moody-nature.png',
                idiom: 'universal',
                scale: '1x',
              },
              { idiom: 'universal', scale: '2x' },
              { idiom: 'universal', scale: '3x' },
            ],
            info: { author: 'xcode', version: 1 },
          },
          null,
          2,
        )}\n`,
      );

      return modConfig;
    },
  ]);
}

function withWidgetAssetBuildPhase(config) {
  return withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const extensionTarget = project.getTarget('com.apple.product-type.app-extension');
    if (!extensionTarget) {
      throw new Error(`Could not find ${TARGET_NAME} while adding widget assets.`);
    }

    const target = project.pbxNativeTargetSection()[extensionTarget.uuid];
    const existingResourcesPhase = target.buildPhases?.find(
      (phase) => phase.comment === 'Resources',
    );
    if (!existingResourcesPhase) {
      project.addBuildPhase(
        [ASSET_CATALOG, ...WIDGET_FONTS.map((font) => `${TARGET_NAME}/${fontName(font)}`)],
        'PBXResourcesBuildPhase',
        'Resources',
        extensionTarget.uuid,
      );
    }
    return modConfig;
  });
}

module.exports = function withWidgetAssets(config) {
  config = withWidgetAssetFiles(config);
  return withWidgetAssetBuildPhase(config);
};
