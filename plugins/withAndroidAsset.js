const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidAsset = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const sourceFile = path.join(projectRoot, 'assets/bible/eng-kjv.osis.xml');
            const androidAssetsDir = path.join(
                projectRoot,
                'android/app/src/main/assets/bible'
            );

            // Ensure the destination directory exists
            if (!fs.existsSync(androidAssetsDir)) {
                fs.mkdirSync(androidAssetsDir, { recursive: true });
            }

            const destinationFile = path.join(androidAssetsDir, 'eng-kjv.osis.xml');

            // Copy the file
            fs.copyFileSync(sourceFile, destinationFile);

            console.log('✅ Copied Bible XML to Android assets');

            return config;
        },
    ]);
};

module.exports = withAndroidAsset;
