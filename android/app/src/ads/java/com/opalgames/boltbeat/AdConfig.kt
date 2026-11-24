package com.opalgames.boltbeat

import android.content.Context
import android.util.Log
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.concurrent.thread

/**
 * Ad settings that can be tuned without shipping an update. They live in a Supabase table
 * (see android/supabase/app_config.sql), one row per setting:
 *
 *   app = 'bolt-beat', key = 'interstitial_every_levels', value = 3
 *
 * [refresh] pulls them over Supabase's REST API on launch and caches them, so the app uses the
 * last known values when offline and the built-in defaults until the first successful pull.
 * Nothing is fetched while the Supabase URL or key in strings.xml is blank.
 */
class AdConfig(private val context: Context) {

    private val prefs = context.getSharedPreferences("ad_config", Context.MODE_PRIVATE)

    /** Remote kill switch. The compiled-in switch (BuildConfig.ADS_ENABLED) must be on too. */
    val adsEnabled: Boolean get() = prefs.getBoolean(KEY_ADS_ENABLED, true)

    /** Show an interstitial once every this many cleared levels (0 = never). */
    val interstitialEveryLevels: Int get() = prefs.getInt(KEY_EVERY_LEVELS, 3).coerceIn(0, 50)

    /** …and never twice within this many seconds, however fast levels go. */
    val interstitialMinIntervalSec: Int get() = prefs.getInt(KEY_MIN_INTERVAL, 120).coerceIn(0, 3600)

    /** What a boss needs after the player watches the rewarded ad (normally 60). */
    val easyPassPercent: Int get() = prefs.getInt(KEY_EASY_PASS, 50).coerceIn(30, 59)

    fun refresh() {
        val base = context.getString(R.string.supabase_url).trim().trimEnd('/')
        val key = context.getString(R.string.supabase_anon_key).trim()
        if (base.isEmpty() || key.isEmpty()) return
        thread(name = "ad-config", isDaemon = true) {
            try {
                val app = URLEncoder.encode(APP_ID, "UTF-8")
                val conn = URL("$base/rest/v1/app_config?app=eq.$app&select=key,value").openConnection() as HttpURLConnection
                conn.connectTimeout = 8000
                conn.readTimeout = 8000
                conn.setRequestProperty("apikey", key)
                conn.setRequestProperty("Authorization", "Bearer $key")
                conn.setRequestProperty("Accept", "application/json")
                if (conn.responseCode != 200) {
                    Log.w(TAG, "Ad config fetch: HTTP ${conn.responseCode}, keeping cached values")
                    return@thread
                }
                val rows = JSONArray(conn.inputStream.bufferedReader().use { it.readText() })
                val edit = prefs.edit()
                for (i in 0 until rows.length()) {
                    val row = rows.getJSONObject(i)
                    val v = row.opt("value")
                    when (val k = row.optString("key")) {
                        KEY_ADS_ENABLED -> (v as? Boolean)?.let { edit.putBoolean(k, it) }
                        KEY_EVERY_LEVELS, KEY_MIN_INTERVAL, KEY_EASY_PASS -> (v as? Number)?.let { edit.putInt(k, it.toInt()) }
                    }
                }
                edit.apply()
                Log.i(TAG, "Ad config: every=$interstitialEveryLevels levels, min=${interstitialMinIntervalSec}s, easy=$easyPassPercent%, on=$adsEnabled")
            } catch (e: Exception) {
                Log.w(TAG, "Ad config fetch failed, keeping cached values", e)
            }
        }
    }

    companion object {
        private const val TAG = "BoltBeatAds"
        const val APP_ID = "bolt-beat"
        const val KEY_ADS_ENABLED = "ads_enabled"
        const val KEY_EVERY_LEVELS = "interstitial_every_levels"
        const val KEY_MIN_INTERVAL = "interstitial_min_interval_sec"
        const val KEY_EASY_PASS = "rewarded_easy_pass_percent"
    }
}
