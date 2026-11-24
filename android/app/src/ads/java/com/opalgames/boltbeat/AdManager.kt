package com.opalgames.boltbeat

import android.app.Activity
import android.content.Context
import android.content.pm.ApplicationInfo
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAd
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAdLoadCallback

/**
 * The game's two ad moments, both asked for by the page through [bridge] (window.BoltBeatAds,
 * see web/js/ads.js):
 *
 *  - Level break: an interstitial every [AdConfig.interstitialEveryLevels] cleared levels, at most
 *    once per [AdConfig.interstitialMinIntervalSec], shown when the player presses "Next level".
 *  - Easier boss: after a lost dance-off the player can opt in to a rewarded interstitial; earning
 *    the reward lowers what that boss needs from 60% to [AdConfig.easyPassPercent].
 *
 * OFF for now: BuildConfig.ADS_ENABLED is false unless `bb.adsEnabled=true` is in local.properties.
 * While off, the SDK is never started, no consent form shows, and the page carries straight on.
 * Debug builds always use Google's test ad units.
 */
class AdManager(private val activity: Activity, private val webView: () -> WebView?) {

    private val config = AdConfig(activity)
    private val consent = GoogleMobileAdsConsentManager(activity)
    private val main = Handler(Looper.getMainLooper())
    private val prefs = activity.getSharedPreferences("ad_state", Context.MODE_PRIVATE)

    @Volatile private var interstitial: InterstitialAd? = null
    @Volatile private var rewarded: RewardedInterstitialAd? = null
    @Volatile private var showing = false
    private var interstitialLoading = false
    private var rewardedLoading = false
    private var interstitialRetryAt = 0L
    private var rewardedRetryAt = 0L
    private var sdkStarted = false
    private var consentInFlight = false
    private var lastInterstitialAt = 0L   // elapsedRealtime of the last interstitial shown

    private val isDebug = (activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
    private val on: Boolean get() = BuildConfig.ADS_ENABLED && config.adsEnabled

    private fun interstitialUnit() =
        if (isDebug || BuildConfig.AD_FORCE_TEST) TEST_INTERSTITIAL else activity.getString(R.string.admob_interstitial_unit_id).trim()
    private fun rewardedUnit() =
        if (isDebug || BuildConfig.AD_FORCE_TEST) TEST_REWARDED_INTERSTITIAL else activity.getString(R.string.admob_rewarded_interstitial_unit_id).trim()

    /** Levels cleared since the last interstitial; kept across launches so quitting doesn't reset it. */
    private var levelsSinceAd: Int
        get() = prefs.getInt("levels_since_ad", 0)
        set(v) { prefs.edit().putInt("levels_since_ad", v).apply() }

    // --- Start-up -------------------------------------------------------------------

    fun start() {
        config.refresh()
        if (!on) return
        if (consentInFlight) return
        consentInFlight = true
        consent.gatherConsent(activity) { err ->
            consentInFlight = false
            if (err != null) Log.w(TAG, "Consent failed: [${err.errorCode}] ${err.message}; ads won't serve until it succeeds")
            if (consent.canRequestAds && !sdkStarted) {
                sdkStarted = true
                MobileAds.initialize(activity) { preload() }
            }
        }
    }

    fun preload() {
        if (!on || !sdkStarted || !consent.canRequestAds) return
        loadInterstitial()
        loadRewarded()
    }

    private fun loadInterstitial() {
        if (interstitial != null || interstitialLoading || SystemClock.elapsedRealtime() < interstitialRetryAt) return
        val unit = interstitialUnit().ifBlank { return }
        interstitialLoading = true
        InterstitialAd.load(activity, unit, AdRequest.Builder().build(), object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: InterstitialAd) { interstitialLoading = false; interstitial = ad }
            override fun onAdFailedToLoad(e: LoadAdError) {
                interstitialLoading = false; interstitial = null
                interstitialRetryAt = SystemClock.elapsedRealtime() + NO_FILL_BACKOFF_MS
            }
        })
    }

    private fun loadRewarded() {
        if (rewarded != null || rewardedLoading || SystemClock.elapsedRealtime() < rewardedRetryAt) return
        val unit = rewardedUnit().ifBlank { return }
        rewardedLoading = true
        RewardedInterstitialAd.load(activity, unit, AdRequest.Builder().build(), object : RewardedInterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: RewardedInterstitialAd) { rewardedLoading = false; rewarded = ad }
            override fun onAdFailedToLoad(e: LoadAdError) {
                rewardedLoading = false; rewarded = null
                rewardedRetryAt = SystemClock.elapsedRealtime() + NO_FILL_BACKOFF_MS
            }
        })
    }

    // --- Showing ----------------------------------------------------------------------

    /** Decides on the JS thread whether this level break gets an ad; returns true if one will show. */
    private fun levelBreak(): Boolean {
        if (!on || showing) return false
        val every = config.interstitialEveryLevels
        if (every <= 0) return false
        val count = levelsSinceAd + 1
        val gapOk = lastInterstitialAt == 0L ||
            SystemClock.elapsedRealtime() - lastInterstitialAt >= config.interstitialMinIntervalSec * 1000L
        val ad = interstitial
        if (count < every || !gapOk || ad == null) {
            // Not this time. If one was due but nothing is loaded, it shows at the next break instead.
            levelsSinceAd = count
            main.post { preload() }
            return false
        }
        levelsSinceAd = 0
        interstitial = null
        showing = true
        main.post {
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() = done()
                override fun onAdFailedToShowFullScreenContent(e: AdError) = done()
                fun done() { showing = false; tellPage("'break'", false); preload() }
            }
            lastInterstitialAt = SystemClock.elapsedRealtime()
            ad.show(activity)
        }
        return true
    }

    private fun showRewarded(): Boolean {
        if (!on || showing) return false
        val ad = rewarded ?: run { main.post { preload() }; return false }
        rewarded = null
        showing = true
        main.post {
            var earned = false
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() = done()
                override fun onAdFailedToShowFullScreenContent(e: AdError) = done()
                fun done() { showing = false; tellPage("'reward'", earned); preload() }
            }
            // The reward counts only when the SDK says the ad was watched.
            ad.show(activity) { earned = true }
        }
        return true
    }

    private fun tellPage(kind: String, earned: Boolean) {
        main.post { webView()?.evaluateJavascript("window.bbAdClosed&&window.bbAdClosed($kind,$earned);", null) }
    }

    /** window.BoltBeatAds in the page. These run on the WebView's JS thread, not the main thread. */
    val bridge = object {
        @JavascriptInterface fun enabled(): Boolean = on
        @JavascriptInterface fun levelBreak(levelsCleared: Int): Boolean = this@AdManager.levelBreak()
        @JavascriptInterface fun rewardedReady(): Boolean = on && !showing && rewarded != null
        @JavascriptInterface fun showRewarded(): Boolean = this@AdManager.showRewarded()
        @JavascriptInterface fun easyPassPercent(): Int = config.easyPassPercent
    }

    companion object {
        private const val TAG = "BoltBeatAds"
        private const val NO_FILL_BACKOFF_MS = 60_000L
        // Google's public test units: safe to click, never pay out.
        private const val TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712"
        private const val TEST_REWARDED_INTERSTITIAL = "ca-app-pub-3940256099942544/5354046379"
    }
}
