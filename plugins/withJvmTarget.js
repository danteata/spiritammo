const { withProjectBuildGradle } = require('expo/config-plugins');

const withJvmTarget = (config) => {
    return withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            config.modResults.contents += `
// Force JVM Target 17 for all Kotlin tasks to avoid incompatibility
allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}
`;
        }
        return config;
    });
};

module.exports = withJvmTarget;
