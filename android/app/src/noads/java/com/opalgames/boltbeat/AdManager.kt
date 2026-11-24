package com.opalgames.boltbeat

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * The no-ads build (the default): same shape as src/ads/.../AdManager.kt, but with no Ads SDK in
 * the app at all, so no ad permissions, no consent form and no network. The page's ad hooks
 * (web/js/ads.js) get "no" from every call and the game carries straight on.
 * Build with `bb.adsEnabled=true` in local.properties to use the real one.
 */
@Suppress("UNUSED_PARAMETER")
class AdManager(activity: Activity, webView: () -> WebView?) {
    fun start() {}
    fun preload() {}

    val bridge = object {
        @JavascriptInterface fun enabled(): Boolean = false
        @JavascriptInterface fun levelBreak(levelsCleared: Int): Boolean = false
        @JavascriptInterface fun rewardedReady(): Boolean = false
        @JavascriptInterface fun showRewarded(): Boolean = false
        @JavascriptInterface fun easyPassPercent(): Int = 50
    }
}
