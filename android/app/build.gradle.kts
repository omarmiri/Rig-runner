import javax.inject.Inject

plugins {
    id("com.android.application")
}

/* The game itself is NOT copied into this project by hand. Every build syncs ../web (the
 * website version, the single source of truth) into a generated assets folder, so the app
 * always ships exactly what the web folder has. Development-only files stay out of the APK. */
abstract class SyncWebGame : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val webDir: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val fs: FileSystemOperations

    @TaskAction
    fun sync() {
        fs.sync {
            from(webDir) {
                exclude(
                    "tests/**", "tools/**", "dist/**", "node_modules/**",
                    "package.json", "package-lock.json", "README.md",
                    // The service worker is for the website; the app already has every file.
                    "sw.js"
                )
            }
            into(outputDir.dir("game"))
        }
    }
}

val syncWebGame = tasks.register<SyncWebGame>("syncWebGame") {
    webDir.set(rootProject.layout.projectDirectory.dir("../web"))
}

android {
    namespace = "com.opalgames.boltbeat"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.opalgames.boltbeat"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            // Sideload builds are signed with the debug key. Wire in a real upload
            // keystore here before publishing to Google Play.
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    androidResources {
        // Images and audio are already compressed; store them raw so the WebView reads them straight from the APK.
        noCompress += listOf("png", "jpg", "jpeg", "webp", "mp3", "ogg", "wav")
    }
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(syncWebGame, SyncWebGame::outputDir)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
