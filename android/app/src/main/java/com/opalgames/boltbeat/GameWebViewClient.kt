package com.opalgames.boltbeat

import android.os.Build
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/**
 * Serves the bundled game from the APK at https://appassets.androidplatform.net/assets/…
 * (an https origin, so localStorage and the Web Audio clock behave as on the website),
 * keeps navigation inside the game, and reports a dead renderer to the activity.
 */
class GameWebViewClient(
    private val assetLoader: WebViewAssetLoader,
    private val onPageReady: (WebView) -> Unit,
    private val onRendererGone: (WebView) -> Unit
) : WebViewClient() {

    override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? =
        request?.url?.let { assetLoader.shouldInterceptRequest(it) }

    // The game has no outbound links; block any navigation away from the bundled origin.
    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean =
        request?.url?.host != "appassets.androidplatform.net"

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        view?.let(onPageReady)
    }

    // Returning true keeps the app alive when the renderer dies; the activity replaces the WebView.
    override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
        view?.let(onRendererGone)
        return true
    }
}
