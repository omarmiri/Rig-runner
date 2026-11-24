# Bolt Beat — Android

The Android app for Bolt Beat: the web game in `../web` running full screen in a WebView.
Package `com.opalgames.boltbeat` (debug builds: `com.opalgames.boltbeat.debug`, so both can be installed side by side).

## How it works

- **One copy of the game.** Every build syncs `../web` into the APK (the `syncWebGame` task in
  `app/build.gradle.kts`), leaving out `tests/`, `tools/`, `package.json`, the READMEs and the
  website's service worker. Change the game in `web/`, rebuild the app, done.
- **Offline.** The game is served from the APK over `https://appassets.androidplatform.net/assets/game/`
  (`WebViewAssetLoader`), so saves (localStorage) and audio work as on the website. The game itself needs no
  network; only ads and their settings use it.
- **Touch** uses the game's own on-screen pads, sized for phones.
- **Controllers** (Xbox, PlayStation, Switch Pro, most Bluetooth pads): Android's WebView doesn't pass
  them to the page, so `MainActivity` reads them and hands them to the game as a standard Gamepad API
  pad (the same approach as the Raptor Rush app). Physical keyboards work as on desktop.
- **Back button** follows the game: in play it pauses, in the pause menu it resumes, on the robot picker
  or an end-of-level card it goes to the home screen, and on the home screen "press back again" exits.
  This calls `window.bbBack()` in `web/js/input.js`.
- **Leaving the app** pauses the run and silences the music (`window.bbAppHidden()`); the website does
  the same when its tab is hidden.
- **Dance-off timing per audio output.** `AudioRouteBridge` tells the game whether sound goes to the
  speaker, wired, USB or Bluetooth headphones (`window.BoltBeatAudio`), and `web/js/timing.js` keeps a
  separate tap-along calibration for each, so switching to Bluetooth doesn't make every hit "late".
- The volume buttons always control the game's (media) volume.
- Immersive full screen, screen kept on, any orientation (portrait or landscape), notch-safe.
- If the WebView's renderer is killed for memory or crashes, a fresh WebView replaces it instead of the
  app closing (at most 3 times a minute).

## Ads (built, switched OFF)

Two ad moments, both driven by the game through `window.BoltBeatAds` (`AdManager.kt` ↔ `web/js/ads.js`):

- **Level break (interstitial):** when the player presses *Next level* (or *Keep going* after the story),
  an interstitial shows once every **N cleared levels** and never twice within **M seconds**. The game
  waits for the ad to close, then starts the next level. If one is due but none has loaded, it shows at
  the next break instead.
- **Easier boss (rewarded interstitial, opt-in):** after losing a dance-off, the Out-danced card offers
  *Watch an ad · rematch needs 50%*. Watching it to the end lowers what that boss needs from 60% to 50%
  until the player beats it (it carries over a fall, not to the next level). Skipping the ad gives nothing.
  The button only appears when an ad is loaded.

On the website, or with ads off, `BoltBeatAds` isn't there (or says no) and the game carries straight on.

**Turning ads on:** put `bb.adsEnabled=true` in `local.properties` and rebuild. Debug builds always use
Google's test ads; add `bb.adForceTest=true` for test ads in a release build. Before a real release, put
the real AdMob app ID and the two unit IDs in `res/values/strings.xml` (the app ID there now is Google's
test ID) and publish a consent (UMP) message in the AdMob console: ads only load after consent is settled.

**Settings from Supabase:** `AdConfig.kt` pulls the numbers on each launch and caches them (built-in
defaults until the first pull, last known values when offline):

| key (`app = 'bolt-beat'`) | default | meaning |
|---|---|---|
| `interstitial_every_levels` | 3 | an interstitial after every Nth cleared level (0 = never) |
| `interstitial_min_interval_sec` | 120 | minimum gap between interstitials |
| `rewarded_easy_pass_percent` | 50 | what a boss needs after the rewarded ad (normally 60; 30–59 allowed) |
| `ads_enabled` | true | remote kill switch (the build switch above must be on as well) |

To connect it: run [`supabase/app_config.sql`](supabase/app_config.sql) in the project's SQL editor (it
creates a read-only-to-the-public `app_config` table with those rows), then put the project URL and anon
key in `supabase_url` / `supabase_anon_key` in `res/values/strings.xml`. While those are blank nothing is fetched.

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

Play Games sign-in and achievements, haptics on hits, translations.
