plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val signingFile = providers.environmentVariable("LIFEOS_SIGNING_STORE_FILE").orNull
val signingPassword = providers.environmentVariable("LIFEOS_SIGNING_STORE_PASSWORD").orNull
val signingAlias = providers.environmentVariable("LIFEOS_SIGNING_KEY_ALIAS").orNull
val signingKeyPassword = providers.environmentVariable("LIFEOS_SIGNING_KEY_PASSWORD").orNull
val stableSigningReady = listOf(signingFile, signingPassword, signingAlias, signingKeyPassword)
    .all { !it.isNullOrBlank() }

android {
    namespace = "com.lifeos.companion"
    compileSdk = 35

    defaultConfig {
        // Distinct from the installed com.lifeos.companion APK:
        // users can install this beta without uninstalling or clearing its data.
        applicationId = "com.lifeos.companion.beta"
        minSdk = 26
        targetSdk = 35
        versionCode = 11
        versionName = "0.11-v244-today-aplus"
    }

    signingConfigs {
        if (stableSigningReady) {
            create("privateBeta") {
                storeFile = file(signingFile!!)
                storePassword = signingPassword
                keyAlias = signingAlias
                keyPassword = signingKeyPassword
                enableV1Signing = true
                enableV2Signing = true
            }
        }
    }

    buildTypes {
        getByName("debug") {
            // Disposable CI debug signature; not upgrade-safe across runners.
            // Use a stable signed release for subsequent persistent beta updates.
            applicationIdSuffix = ".preview"
            versionNameSuffix = "-preview"
        }
        getByName("release") {
            isMinifyEnabled = false
            if (stableSigningReady) {
                signingConfig = signingConfigs.getByName("privateBeta")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
