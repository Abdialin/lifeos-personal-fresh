plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.lifeos.companion"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.lifeos.companion"
        minSdk = 26
        targetSdk = 35
        versionCode = 5
        versionName = "0.5-v232"
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
