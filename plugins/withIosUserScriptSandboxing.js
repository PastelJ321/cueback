const { withXcodeProject } = require('@expo/config-plugins');

/**
 * React Native's development bundle phase writes Metro's address to ip.txt
 * inside the app bundle. Xcode's user-script sandbox blocks that generated
 * output unless every file is declared up front, which the Expo build phase
 * cannot do. Keep the setting disabled across Expo prebuild regeneration.
 */
module.exports = function withIosUserScriptSandboxing(config) {
  return withXcodeProject(config, (nextConfig) => {
    const buildConfigurations = nextConfig.modResults.pbxXCBuildConfigurationSection();

    for (const buildConfiguration of Object.values(buildConfigurations)) {
      if (typeof buildConfiguration !== 'object' || !buildConfiguration?.buildSettings) continue;
      buildConfiguration.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }

    return nextConfig;
  });
};
