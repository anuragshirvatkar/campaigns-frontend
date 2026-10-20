// Turns on Java core library desugaring in the generated android/app/build.gradle.
//
// Why: newer Java APIs (e.g. List.removeLast, only on Android 15+) can reach the app through
// compiled library code and crash older phones with NoSuchMethodError. Desugaring bundles
// replacements so they work down to minSdk. expo-build-properties has no option for this.
const { withAppBuildGradle } = require("expo/config-plugins");

const DESUGAR_LIBS = "com.android.tools:desugar_jdk_libs:2.1.5";

module.exports = function withAndroidDesugaring(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    if (!gradle.includes("coreLibraryDesugaringEnabled")) {
      gradle = gradle.replace(
        /android\s*\{/,
        (match) => `${match}\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }\n`,
      );
    }
    if (!gradle.includes("desugar_jdk_libs")) {
      gradle = gradle.replace(
        /dependencies\s*\{/,
        (match) => `${match}\n    coreLibraryDesugaring("${DESUGAR_LIBS}")`,
      );
    }

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
