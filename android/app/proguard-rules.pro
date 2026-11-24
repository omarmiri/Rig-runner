# The page calls AdManager.bridge (window.BoltBeatAds) by method name, which R8 cannot see:
# keep every @JavascriptInterface method.
-keepclasseswithmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
# Room, reached through play-services-ads -> androidx.work:work-runtime:2.7.0 (WorkManager
# buffers ad pings offline in a Room database). Room finds its generated implementation by
# name at runtime — Class.forName("androidx.work.impl.WorkDatabase" + "_Impl") — and then
# calls the no-arg constructor. R8 full mode, which is the default from AGP 8 on, does not
# keep default constructors just because the class is kept, and WorkManager 2.7.0's bundled
# rules predate that. Without this the app dies on the FIRST launch, in
# androidx.startup.InitializationProvider before any of our code runs:
#
#   FATAL EXCEPTION: main
#   Caused by: java.lang.RuntimeException: Failed to create an instance of
#              androidx.work.impl.WorkDatabase
#
# Verified: this is what a minified build actually did on an API 36 device before the rule
# was added. Nothing in this app uses Room directly — the rule exists purely for the
# transitive dependency, so it stays as long as play-services-ads pulls WorkManager in.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-dontwarn androidx.room.paging.**
