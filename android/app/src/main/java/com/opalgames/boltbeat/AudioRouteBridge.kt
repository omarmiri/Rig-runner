package com.opalgames.boltbeat

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.webkit.JavascriptInterface

/**
 * window.BoltBeatAudio in the page. Dance-off timing (web/js/timing.js) keeps a separate audio
 * delay per output, because Bluetooth headphones lag far more than the phone's speaker and the
 * WebView doesn't report that reliably. Media goes to the most recently connected headset, so this
 * reports the first match in that order: bluetooth, usb, wired, hdmi, else speaker.
 */
class AudioRouteBridge(context: Context) {
    private val audio = context.getSystemService(AudioManager::class.java)

    @JavascriptInterface
    fun route(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return "speaker"
        val types = audio?.getDevices(AudioManager.GET_DEVICES_OUTPUTS)?.map { it.type }?.toSet() ?: return "speaker"
        fun any(vararg t: Int) = t.any { it in types }
        return when {
            any(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLE_HEADSET, AudioDeviceInfo.TYPE_BLE_SPEAKER) -> "bluetooth"
            any(AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE) -> "usb"
            any(AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES) -> "wired"
            any(AudioDeviceInfo.TYPE_HDMI) -> "hdmi"
            else -> "speaker"
        }
    }
}
