package com.opalgames.boltbeat

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.graphics.Color
import android.hardware.input.InputManager
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader

/**
 * Bolt Beat for Android: the web game (../web, copied in at build time) running full screen in
 * a WebView, served from the APK over a virtual https origin so it works offline.
 *
 * Native jobs, all small:
 *  - immersive full screen, screen kept on, display-cutout padding;
 *  - the back button drives the game (pause, resume, back to the home screen) and only exits
 *    from the home screen, with "press back again";
 *  - leaving the app pauses the run and silences the music;
 *  - controllers are read here and handed to the page as a standard Gamepad API pad
 *    (the WebView does not pass them through itself);
 *  - a crashed or killed WebView renderer is replaced instead of taking the app down;
 *  - ads (AdManager): an interstitial every few levels and an opt-in "easier boss" reward, off for now.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var adManager: AdManager
    private var lastBackPress = 0L
    private val rendererDeaths = ArrayDeque<Long>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // The volume buttons always mean game (media) volume, even in a quiet moment between sounds.
        volumeControlStream = AudioManager.STREAM_MUSIC

        root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#0B1018")) }
        setContentView(root)
        // System bars are hidden, but a notch or punch-hole still takes screen space: keep the
        // game (its HUD and touch pads) clear of it.
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val c = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
            v.setPadding(c.left, c.top, c.right, c.bottom)
            insets
        }

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        adManager = AdManager(this) { if (::webView.isInitialized) webView else null }
        createWebView()
        adManager.start()

        getSystemService(InputManager::class.java)?.registerInputDeviceListener(padDeviceListener, null)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = onBack()
        })
        enableImmersiveMode()
    }

    // --- WebView ----------------------------------------------------------------

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView() {
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setBackgroundColor(Color.parseColor("#0B1018"))
            isFocusable = true
            isFocusableInTouchMode = true
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
        }
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true                  // saves (localStorage)
            mediaPlaybackRequiresUserGesture = false  // music starts on the first tap
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            // The page checks for this to skip the website's offline cache (service worker).
            userAgentString = "$userAgentString BoltBeatAndroid/${BuildConfigLite.versionName(this@MainActivity)}"
        }
        webView.webViewClient = GameWebViewClient(
            assetLoader,
            onPageReady = { it.evaluateJavascript(INIT_JS, null) },
            onRendererGone = { dead -> replaceDeadWebView(dead) }
        )
        // window.BoltBeatAds: level breaks and the easier-boss reward (web/js/ads.js).
        webView.addJavascriptInterface(adManager.bridge, "BoltBeatAds")
        // window.BoltBeatAudio: which output is playing, so dance-off timing is kept per output.
        webView.addJavascriptInterface(AudioRouteBridge(this), "BoltBeatAudio")
        root.addView(webView)
        webView.loadUrl(GAME_URL)
        webView.requestFocus()
    }

    /** The renderer was killed (low memory) or crashed. That WebView is unusable: swap in a
     *  fresh one. More than 3 deaths in a minute means something is badly wrong, so stop. */
    private fun replaceDeadWebView(dead: WebView) {
        val now = SystemClock.elapsedRealtime()
        while (rendererDeaths.isNotEmpty() && now - rendererDeaths.first() > 60_000) rendererDeaths.removeFirst()
        rendererDeaths.addLast(now)
        root.removeView(dead)
        dead.destroy()
        if (rendererDeaths.size > 3) { finish(); return }
        createWebView()
    }

    // --- Back button --------------------------------------------------------------

    private fun onBack() {
        // The game decides: pause, resume, or back to its home screen. It answers false on the
        // home screen, and only then does back leave the app.
        webView.evaluateJavascript("window.bbBack ? window.bbBack() : false") { used ->
            if (used == "true") return@evaluateJavascript
            val now = SystemClock.elapsedRealtime()
            if (now - lastBackPress <= BACK_EXIT_WINDOW_MS) moveTaskToBack(true)
            else {
                lastBackPress = now
                Toast.makeText(this, R.string.press_back_again, Toast.LENGTH_SHORT).show()
            }
        }
    }

    // --- Window and lifecycle -----------------------------------------------------

    private fun enableImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                )
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableImmersiveMode()
            if (::webView.isInitialized) webView.requestFocus() // keyboard keys reach the page only through focus
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        enableImmersiveMode()
    }

    override fun onPause() {
        // Pause the run and suspend the music before the page is frozen.
        webView.evaluateJavascript("window.bbAppHidden && window.bbAppHidden();", null)
        webView.onPause()
        webView.pauseTimers()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.resumeTimers()
        webView.onResume()
        webView.evaluateJavascript("window.bbAppShown && window.bbAppShown();", null)
        enableImmersiveMode()
        adManager.preload()
    }

    override fun onDestroy() {
        getSystemService(InputManager::class.java)?.unregisterInputDeviceListener(padDeviceListener)
        if (::webView.isInitialized) {
            root.removeView(webView)
            webView.destroy()
        }
        super.onDestroy()
    }

    /* ---------------------------- Controllers ---------------------------- *
     * Android's WebView leaves navigator.getGamepads() empty, so the activity reads the
     * controller and INIT_JS's shim presents it to the page as a W3C "standard" pad, the layout
     * the game's pollGamepad() reads. Consuming the events also stops B (and Select) from
     * falling back to the system BACK action. */

    private val padButtons = FloatArray(17)   // A B X Y LB RB LT RT Select Start L3 R3 Up Down Left Right Home
    private val padAxes = FloatArray(4)       // LX LY RX RY
    private var padName = ""
    private var padDirty = false
    private var padPushPosted = false

    private fun isGamepad(dev: InputDevice?): Boolean {
        val s = dev?.sources ?: return false
        return (s and InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD ||
            (s and InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
    }

    private fun padButtonIndex(keyCode: Int): Int = when (keyCode) {
        KeyEvent.KEYCODE_BUTTON_A -> 0
        KeyEvent.KEYCODE_BUTTON_B -> 1
        KeyEvent.KEYCODE_BUTTON_X -> 2
        KeyEvent.KEYCODE_BUTTON_Y -> 3
        KeyEvent.KEYCODE_BUTTON_L1 -> 4
        KeyEvent.KEYCODE_BUTTON_R1 -> 5
        KeyEvent.KEYCODE_BUTTON_L2 -> 6
        KeyEvent.KEYCODE_BUTTON_R2 -> 7
        KeyEvent.KEYCODE_BUTTON_SELECT -> 8
        KeyEvent.KEYCODE_BUTTON_START -> 9
        KeyEvent.KEYCODE_BUTTON_THUMBL -> 10
        KeyEvent.KEYCODE_BUTTON_THUMBR -> 11
        KeyEvent.KEYCODE_DPAD_UP -> 12
        KeyEvent.KEYCODE_DPAD_DOWN -> 13
        KeyEvent.KEYCODE_DPAD_LEFT -> 14
        KeyEvent.KEYCODE_DPAD_RIGHT -> 15
        KeyEvent.KEYCODE_BUTTON_MODE -> 16
        else -> -1
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // A pad's D-pad keys come from a gamepad device; a keyboard's arrows do not, and pass through.
        if ((event.source and InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD || isGamepad(event.device)) {
            val i = padButtonIndex(event.keyCode)
            if (i >= 0) {
                if (event.action == KeyEvent.ACTION_DOWN || event.action == KeyEvent.ACTION_UP) {
                    padButtons[i] = if (event.action == KeyEvent.ACTION_DOWN) 1f else 0f
                    markPad(event.device)
                }
                return true
            }
        }
        // Esc is the game's pause key. Left alone, Android turns an unused Esc into BACK.
        if (event.keyCode == KeyEvent.KEYCODE_ESCAPE) {
            super.dispatchKeyEvent(event)
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
        if (event.actionMasked == MotionEvent.ACTION_MOVE && isGamepad(event.device) &&
            (event.source and InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
        ) {
            val dev = event.device
            padAxes[0] = event.getAxisValue(MotionEvent.AXIS_X)
            padAxes[1] = event.getAxisValue(MotionEvent.AXIS_Y)
            padAxes[2] = event.getAxisValue(MotionEvent.AXIS_Z)
            padAxes[3] = event.getAxisValue(MotionEvent.AXIS_RZ)
            // A hat-switch D-pad arrives as axes rather than D-pad keys.
            if (dev?.getMotionRange(MotionEvent.AXIS_HAT_X) != null) {
                val hx = event.getAxisValue(MotionEvent.AXIS_HAT_X)
                val hy = event.getAxisValue(MotionEvent.AXIS_HAT_Y)
                padButtons[12] = if (hy < -0.5f) 1f else 0f
                padButtons[13] = if (hy > 0.5f) 1f else 0f
                padButtons[14] = if (hx < -0.5f) 1f else 0f
                padButtons[15] = if (hx > 0.5f) 1f else 0f
            }
            markPad(dev)
            return true
        }
        return super.dispatchGenericMotionEvent(event)
    }

    private fun markPad(dev: InputDevice?) {
        padName = dev?.name ?: "Gamepad"
        padDirty = true
        if (!padPushPosted && ::webView.isInitialized) {
            padPushPosted = true
            webView.postOnAnimation { pushPad() }
        }
    }

    // At most once per frame, and only when something changed: a stick streams hundreds of events a second.
    private fun pushPad() {
        padPushPosted = false
        if (!padDirty) return
        padDirty = false
        val name = padName.replace("\\", "").replace("'", "")
        webView.evaluateJavascript(
            "window.__bbPad&&window.__bbPad('$name',[${padButtons.joinToString(",")}],[${padAxes.joinToString(",")}]);", null
        )
    }

    private val padDeviceListener = object : InputManager.InputDeviceListener {
        override fun onInputDeviceAdded(deviceId: Int) {}
        override fun onInputDeviceChanged(deviceId: Int) {}
        override fun onInputDeviceRemoved(deviceId: Int) {
            val anyLeft = InputDevice.getDeviceIds().any { isGamepad(InputDevice.getDevice(it)) }
            if (!anyLeft && ::webView.isInitialized) {
                padButtons.fill(0f); padAxes.fill(0f)
                webView.evaluateJavascript("window.__bbPad&&window.__bbPad(null);", null)
            }
        }
    }

    companion object {
        const val GAME_URL = "https://appassets.androidplatform.net/assets/game/index.html"
        private const val BACK_EXIT_WINDOW_MS = 2000L

        /** Injected after each page load: getGamepads() returns the native pad first. */
        private const val INIT_JS = """
            (function(){
              if (window.__bbPadShim) return;
              window.__bbPadShim = true;
              var pad = null;
              var orig = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : function(){ return []; };
              window.__bbPad = function(id, b, a) {
                if (id === null) { pad = null; return; }
                var first = !pad;
                pad = { id: id, index: 0, connected: true, mapping: 'standard',
                  timestamp: performance.now(), axes: a,
                  buttons: b.map(function(v){ return { pressed: v > 0.5, touched: v > 0, value: v }; }) };
                if (first) { try { window.dispatchEvent(new Event('gamepadconnected')); } catch (e) {} }
              };
              navigator.getGamepads = function() {
                var n = orig() || [];
                if (!pad) return n;
                var out = [pad];
                for (var i = 0; i < n.length; i++) if (n[i]) out.push(n[i]);
                return out;
              };
            })();
        """
    }
}

/** Version name without turning on BuildConfig generation. */
private object BuildConfigLite {
    fun versionName(a: AppCompatActivity): String = try {
        a.packageManager.getPackageInfo(a.packageName, 0).versionName ?: "?"
    } catch (_: Exception) { "?" }
}
