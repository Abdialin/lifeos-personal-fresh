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
        versionCode = 1
        versionName = "0.1-v222"
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
