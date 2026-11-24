# Bolt Beat — Android

The Android app for Bolt Beat: the web game in `../web` running full screen in a WebView.
Package `com.opalgames.boltbeat` (debug builds: `com.opalgames.boltbeat.debug`, so both can be installed side by side).

## How it works

- **One copy of the game.** Every build syncs `../web` into the APK (the `syncWebGame` task in
  `app/build.gradle.kts`), leaving out `tests/`, `tools/`, `package.json`, the READMEs and the
  website's service worker. Change the game in `web/`, rebuild the app, done.
- **Offline.** The game is served from the APK over `https://appassets.androidplatform.net/assets/game/`
  (`WebViewAssetLoader`), so saves (localStorage) and audio work as on the website, with no network.
  The app asks for no permissions.
- **Touch** uses the game's own on-screen pads, sized for phones.
- **Controllers** (Xbox, PlayStation, Switch Pro, most Bluetooth pads): Android's WebView doesn't pass
  them to the page, so `MainActivity` reads them and hands them to the game as a standard Gamepad API
  pad (the same approach as the Raptor Rush app). Physical keyboards work as on desktop.
- **Back button** follows the game: in play it pauses, in the pause menu it resumes, on the robot picker
  or an end-of-level card it goes to the home screen, and on the home screen "press back again" exits.
  This calls `window.bbBack()` in `web/js/input.js`.
- **Leaving the app** pauses the run and silences the music (`window.bbAppHidden()`); the website does
  the same when its tab is hidden.
- Immersive full screen, screen kept on, any orientation (portrait or landscape), notch-safe.
- If the WebView's renderer is killed for memory or crashes, a fresh WebView replaces it instead of the
  app closing (at most 3 times a minute).

## Build

Needs JDK 17+ and the Android SDK (platform 36, build tools 36). Android Studio has both: open this
`android/` folder. From the command line:

```bash
cd android
echo "sdk.dir=/path/to/Android/sdk" > local.properties   # Android Studio writes this for you
./gradlew assembleDebug      # app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease    # app/build/outputs/apk/release/app-release.apk (shrunk)
```

Install on a phone with USB debugging on: `adb install -r app/build/outputs/apk/debug/app-debug.apk`.

## Before Google Play

- **Signing:** `release` is signed with the debug key for sideloading. Create an upload keystore and
  wire it into `signingConfigs` in `app/build.gradle.kts` (keep the keystore and its passwords out of git).
- **Version:** bump `versionCode` (every upload) and `versionName` in `app/build.gradle.kts`.
- Build an app bundle with `./gradlew bundleRelease` for the Play Console.
- Store listing: the 512 px icon is `../web/icons/icon-512.png`; Play also needs a 1024×500 feature
  graphic and phone screenshots.

## Not in yet

Ads, Play Games sign-in and achievements, haptics on hits, translations.
