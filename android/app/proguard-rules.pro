# The page calls nothing native by name yet (all calls go native -> page through
# evaluateJavascript), but keep any @JavascriptInterface methods added later.
-keepclasseswithmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
