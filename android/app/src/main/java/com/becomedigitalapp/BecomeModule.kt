package com.becomedigitalapp

import android.app.Activity
import android.util.Log
import com.becomedigital.sdk.identity.becomedigitalsdk.core.callback.BecomeCallBackManager
import com.becomedigital.sdk.identity.becomedigitalsdk.core.callback.BecomeInterfaseCallback
import com.becomedigital.sdk.identity.becomedigitalsdk.core.callback.BecomeResponseManager
import com.becomedigital.sdk.identity.becomedigitalsdk.models.BDIVConfig
import com.becomedigital.sdk.identity.becomedigitalsdk.models.BDIdentityVerificationResponse
import com.becomedigital.sdk.identity.becomedigitalsdk.models.DocumetType
import com.facebook.react.bridge.*

/**
 * BecomeModule – React Native ↔ Android Native Module Bridge
 *
 * API surface verified via `javap` directly from becomedigitalsdk.aar.
 * Screen capture protection is enabled by default and can be configured from JS.
 *
 * BecomeCallBackManager.createNew()  ← static factory method
 * BecomeResponseManager.getInstance().startAuthentication(activity, config)
 * BecomeResponseManager.getInstance().registerCallback(callbackManager, listener)
 *
 * BDIdentityVerificationResponse.StatusType enum values:
 *   SUCCES (sic), ERROR, PENDING, NOFOUND, CANCEL
 */
class BecomeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BecomeModule"
    }

    // Static factory method confirmed via javap
    private val mCallbackManager: BecomeCallBackManager = BecomeCallBackManager.createNew()

    override fun getName(): String = "BecomeModule"

    /**
     * Starts the Become Digital identity verification flow.
     *
     * JS params (ReadableMap):
     *   clientId     : String
     *   clientSecret : String
     *   contractId   : String
     *   userId       : String
     *   preventScreenCapture : Boolean? (defaults to true)
     */
    @ReactMethod
    fun iniciarBecomeSDK(params: ReadableMap, promise: Promise) {

        Log.d(TAG, "▶ iniciarBecomeSDK() llamado desde JS")

        // ── 1. Verificar Activity activa ────────────────────────────────────
        val activity: Activity = reactContext.currentActivity ?: run {
            Log.e(TAG, "✗ currentActivity es NULL — no hay Activity activa")
            promise.reject("NO_ACTIVITY", "No hay una Activity activa para lanzar el SDK.")
            return
        }
        Log.d(TAG, "✓ Activity disponible: ${activity.javaClass.simpleName}")

        // ── 2. Leer parámetros ───────────────────────────────────────────────
        val clientId     = params.getString("clientId")     ?: ""
        val clientSecret = params.getString("clientSecret") ?: ""
        val contractId   = params.getString("contractId")   ?: ""
        val userId       = params.getString("userId")       ?: ""
        val preventScreenCapture = if (
            params.hasKey("preventScreenCapture") && !params.isNull("preventScreenCapture")
        ) {
            params.getBoolean("preventScreenCapture")
        } else {
            true
        }

        if (clientId.isBlank() || clientSecret.isBlank() || contractId.isBlank()) {
            Log.e(TAG, "✗ Parámetros vacíos — abortando")
            promise.reject("INVALID_PARAMS", "clientId, clientSecret y contractId son requeridos.")
            return
        }

        // ── 3. Verificar que el archivo de licencia existe en assets ────────
        try {
            val assets = reactContext.assets.list("") ?: emptyArray()
            val keyFound = assets.contains("com.become.mb.key")
            Log.d(TAG, "  Licencia 'com.become.mb.key' en assets: $keyFound")
            if (!keyFound) {
                Log.e(TAG, "✗ ARCHIVO DE LICENCIA NO ENCONTRADO en assets/")
            }
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error al listar assets: ${e.message}")
        }

        // ── 4. Verificar permisos de cámara ──────────────────────────────────
        val cameraPermission = android.content.pm.PackageManager.PERMISSION_GRANTED
        val hasCameraPermission = androidx.core.content.ContextCompat.checkSelfPermission(
            reactContext,
            android.Manifest.permission.CAMERA
        ) == cameraPermission
        Log.d(TAG, "  Permiso CAMERA concedido: $hasCameraPermission")

        // ── 5. Construir configuración del SDK ───────────────────────────────
        Log.d(TAG, "▶ Construyendo BDIVConfig...")
        val config: BDIVConfig
        try {
            config = BDIVConfig(
                clientId,                                             // clienId (typo in SDK)
                clientSecret,                                         // clientSecret
                contractId,                                           // contractId
                arrayOf(DocumetType.PASSPORT, DocumetType.DNI),       // documentTypes (typo in SDK field)
                true,                                                 // allowLibraryLoading
                userId,                                               // userId
                null                                                  // customerLogo (byte[]) — optional
            )
            config.setPreventScreenCapture(preventScreenCapture)
            Log.d(TAG, "✓ BDIVConfig construido correctamente")
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error construyendo BDIVConfig: ${e::class.simpleName} — ${e.message}", e)
            promise.reject("CONFIG_ERROR", "Error al construir la configuración del SDK: ${e.message}")
            return
        }

        // ── 6. Registrar callback ANTES de lanzar (evitar race condition) ────
        Log.d(TAG, "▶ Registrando callback en BecomeResponseManager...")
        try {
            BecomeResponseManager.getInstance().registerCallback(
                mCallbackManager,
                object : BecomeInterfaseCallback {

                    override fun onFinish(response: BDIdentityVerificationResponse) {
                        Log.d(TAG, "▶ onFinish() recibido del SDK")
                        Log.d(TAG, "  responseStatus = ${response.responseStatus}")
                        Log.d(TAG, "  message        = ${response.message}")

                        // StatusType is an inner enum: BDIdentityVerificationResponse.StatusType
                        // Values confirmed via javap: SUCCES (sic), ERROR, PENDING, NOFOUND, CANCEL
                        when (response.responseStatus) {
                            BDIdentityVerificationResponse.StatusType.ERROR,
                            BDIdentityVerificationResponse.StatusType.NOFOUND -> {
                                Log.e(TAG, "✗ SDK retornó ERROR/NOFOUND: ${response.message}")
                                promise.reject(
                                    "SDK_ERROR",
                                    response.message ?: "Error desconocido en la verificación."
                                )
                            }
                            BDIdentityVerificationResponse.StatusType.CANCEL -> {
                                Log.d(TAG, "  Usuario canceló el SDK")
                                promise.reject(
                                    "USER_CANCELLED",
                                    "El usuario canceló la verificación dentro del SDK."
                                )
                            }
                            else -> {
                                // SUCCES or PENDING → resolve
                                Log.d(TAG, "✓ SDK completó con éxito: ${response.responseStatus}")
                                val result: WritableMap = Arguments.createMap().apply {
                                    putString("status",  response.responseStatus?.name ?: "SUCCES")
                                    putString("message", response.message ?: "Verificación exitosa")
                                    putString("userId",  userId)
                                }
                                promise.resolve(result)
                            }
                        }
                    }

                    override fun onCancel() {
                        Log.d(TAG, "▶ onCancel() recibido del SDK")
                        promise.reject(
                            "USER_CANCELLED",
                            "El usuario cerró el SDK sin completar la verificación."
                        )
                    }
                }
            )
            Log.d(TAG, "✓ Callback registrado")
        } catch (e: Exception) {
            Log.e(TAG, "✗ Error registrando callback: ${e::class.simpleName} — ${e.message}", e)
            promise.reject("CALLBACK_ERROR", "Error al registrar callback: ${e.message}")
            return
        }

        // ── 7. Lanzar autenticación ──────────────────────────────────────────
        Log.d(TAG, "▶ Llamando startAuthentication()...")
        try {
            BecomeResponseManager.getInstance().startAuthentication(activity, config)
            Log.d(TAG, "✓ startAuthentication() ejecutado — esperando callback del SDK")
        } catch (e: Exception) {
            Log.e(TAG, "✗ CRASH en startAuthentication(): ${e::class.simpleName} — ${e.message}", e)
            promise.reject("START_AUTH_ERROR", "Error al iniciar autenticación: ${e.message}")
        }
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
