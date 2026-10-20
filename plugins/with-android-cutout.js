// Lets the app draw into the notch area, so the status bar shows each screen's own top colour.
//
// Why: React Native only sets the cutout mode at runtime. Some OEM skins (ColorOS on the Oppo F15)
// decide per app at launch and black out the notch strip for apps that don't opt in. The activity
// launches with the splash theme, so the opt-in goes on that theme as well as the app theme, plus
// the manifest flags other skins read (Oppo/Vivo full-screen aspect, Huawei, Xiaomi).
const { withAndroidManifest, withAndroidStyles, AndroidConfig } = require("expo/config-plugins");

const THEMES = ["AppTheme", "Theme.App.SplashScreen"];

const META = [
  ["android.max_aspect", "2.4"], // full screen on tall displays (Oppo/Vivo/ColorOS)
  ["android.notch_support", "true"], // Huawei EMUI
  ["notch.config", "portrait|landscape"], // Xiaomi MIUI
];

function withCutoutThemes(config) {
  return withAndroidStyles(config, (cfg) => {
    for (const name of THEMES) {
      const exists = cfg.modResults.resources.style?.some((s) => s.$.name === name);
      if (!exists) continue;
      cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
        add: true,
        parent: { name },
        name: "android:windowLayoutInDisplayCutoutMode",
        value: "shortEdges",
        targetApi: "28",
      });
    }
    return cfg;
  });
}

function withCutoutManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    for (const [name, value] of META) AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, name, value);
    return cfg;
  });
}

module.exports = function withAndroidCutout(config) {
  return withCutoutManifest(withCutoutThemes(config));
};
