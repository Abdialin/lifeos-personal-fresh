package com.lifeos.companion

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Optional encrypted device-only token storage, never logs or exports secrets. */
object NativePrivateToken {
    private const val ALIAS = "lifeos_private_sync_v1"
    private const val PREFS = "lifeos_secure_sync"
    private const val IV = "iv"
    private const val DATA = "blob"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build())
        }.generateKey()
    }
    fun save(context: Context, token: String): Boolean {
        if (token.length !in 16..256 || token.any { it.code < 33 || it.code > 126 }) return false
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key())
            val bytes = cipher.doFinal(token.toByteArray(Charsets.UTF_8))
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
                .putString(DATA, Base64.encodeToString(bytes, Base64.NO_WRAP))
                .commit()
        } catch (_: Exception) { false }
    }
    fun read(context: Context): String? {
        return try {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val iv = Base64.decode(prefs.getString(IV, null) ?: return null, Base64.NO_WRAP)
            val encrypted = Base64.decode(prefs.getString(DATA, null) ?: return null, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(encrypted), Charsets.UTF_8)
        } catch (_: Exception) { null }
    }
    fun clear(context: Context): Boolean = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().remove(IV).remove(DATA).commit()
}
