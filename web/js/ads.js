// Bolt Beat · Ad breaks. The ads themselves live in the Android app (window.BoltBeatAds, a native
// bridge); on the website, or with ads switched off in the app, every call here is a no-op and the
// game carries straight on.
//
//  - Level break: pressing "Next level" on a level-complete card asks the app for a break. The app
//    decides (it shows an interstitial every N levels, N pulled from Supabase) and the game moves on
//    once the ad closes.
//  - Easier boss: after losing a dance-off, an optional rewarded ad lowers what that boss needs from
//    60% to 50% (the 50 also comes from the app's config) for the rematch.
"use strict";
const ads = {
  waiting: null,     // { kind, then, timer } while an ad is on screen
  native() { try { return window.BoltBeatAds || null; } catch (e) { return null; } },
  call(fn, ...args) { const n = this.native(); try { return n && n[fn] ? n[fn](...args) : null; } catch (e) { return null; } },
  busy() { return !!this.waiting; },

  // An ad break between levels. `then` always runs exactly once: straight away when no ad shows.
  levelBreak(levelsCleared, then) {
    if (this.busy()) return;
    if (this.call("levelBreak", levelsCleared) === true) this.wait("break", then);
    else then();
  },

  // Optional rewarded ad. The button only appears when the app has one loaded.
  rewardReady() { return this.call("rewardedReady") === true; },
  easyPass() { const v = Number(this.call("easyPassPercent")); return v >= 30 && v < PASS * 100 ? v / 100 : 0.5; },
  showRewarded(onReward) {
    if (this.busy()) return;
    if (this.call("showRewarded") === true) this.wait("reward", onReward);
  },

  wait(kind, then) {
    // Safety net: if the app never reports back (it crashed out of the ad), don't strand the player.
    const timer = setTimeout(() => this.closed(kind, kind === "break"), 120000);
    this.waiting = { kind, then, timer };
  },
  // Called by the app when the ad closes. For a rewarded ad, `earned` says whether the reward was granted.
  closed(kind, earned) {
    const w = this.waiting;
    if (!w || w.kind !== kind) return;
    clearTimeout(w.timer); this.waiting = null;
    if (kind === "break" || earned) w.then();
  },
};
window.bbAdClosed = (kind, earned) => ads.closed(kind, !!earned);
