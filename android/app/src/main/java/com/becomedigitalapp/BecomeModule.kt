package com.becomedigitalapp

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.becomedigital.sdk.identity.becomedigitalsdk.core.callback.BecomeCallBackManager
import com.becomedigital.sdk.identity.becomedigitalsdk.core.callback.BecomeInterfaseCallback
import com.becomedigital.sdk.identity.becomedigitalsdk.core.callback.BecomeResponseManager
import com.becomedigital.sdk.identity.becomedigitalsdk.models.BDIVConfig
import com.becomedigital.sdk.identity.becomedigitalsdk.models.BDIdentityVerificationResponse
import com.becomedigital.sdk.identity.becomedigitalsdk.models.DocumetType
import com.facebook.react.bridge.*

/** App-local adapter. All request state and SDK UI calls stay on the main thread. */
class BecomeModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val callbacks = BecomeCallBackManager.createNew()
    private val requests = SingleFlight<Promise>()

    override fun getName() = "BecomeModule"

    @ReactMethod
    fun iniciarBecomeSDK(params: ReadableMap, promise: Promise) {
        UiThreadUtil.runOnUiThread { start(params, promise) }
    }

    private fun start(params: ReadableMap, promise: Promise) {
        if (requests.isBusy) {
            promise.reject("SDK_BUSY", "Ya existe una verificación en curso.")
            return
        }
        val values = listOf("clientId", "clientSecret", "contractId", "userId").map { key ->
            if (params.hasKey(key) && !params.isNull(key) && params.getType(key) == ReadableType.String)
                params.getString(key)?.trim().orEmpty() else ""
        }
        if (values.any { it.isBlank() }) {
            promise.reject("INVALID_PARAMS", "clientId, clientSecret, contractId y userId son requeridos y deben ser texto.")
            return
        }
        var preventCapture = true
        if (params.hasKey("preventScreenCapture") && !params.isNull("preventScreenCapture")) {
            if (params.getType("preventScreenCapture") != ReadableType.Boolean) {
                promise.reject("INVALID_PARAMS", "preventScreenCapture debe ser booleano.")
                return
            }
            preventCapture = params.getBoolean("preventScreenCapture")
        }
        val activity = context.currentActivity
        if (activity == null || activity.isFinishing || activity.isDestroyed) {
            promise.reject("NO_ACTIVITY", "No hay una pantalla activa para iniciar la SDK.")
            return
        }
        try {
            context.assets.open("com.become.mb.key").use { }
        } catch (_: Exception) {
            promise.reject("MISSING_LICENSE_FILES", "Falta com.become.mb.key en app/src/main/assets.")
            return
        }
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("CAMERA_PERMISSION_DENIED", "Concede el permiso de cámara antes de iniciar.")
            return
        }

        val (clientId, clientSecret, contractId, userId) = values
        val request = requests.begin(promise) ?: return
        val config: BDIVConfig
        try {
            config = BDIVConfig(clientId, clientSecret, contractId,
                arrayOf(DocumetType.DNI, DocumetType.PASSPORT), true, userId, null)
            config.setPreventScreenCapture(preventCapture)
        } catch (_: Exception) {
            reject(request, "CONFIG_ERROR", "No fue posible construir la configuración de la SDK.")
            return
        }

        try {
            // Register before launching. A late callback cannot finish a newer request.
            BecomeResponseManager.getInstance().registerCallback(callbacks, object : BecomeInterfaseCallback {
                override fun onFinish(response: BDIdentityVerificationResponse) {
                    UiThreadUtil.runOnUiThread {
                        when (response.responseStatus) {
                            BDIdentityVerificationResponse.StatusType.SUCCES,
                            BDIdentityVerificationResponse.StatusType.PENDING -> {
                                val result = Arguments.createMap().apply {
                                    putString("status", response.responseStatus.name)
                                    putString("message", response.message ?: "Proceso completado.")
                                    putString("userId", userId)
                                }
                                requests.take(request)?.resolve(result)
                            }
                            BDIdentityVerificationResponse.StatusType.CANCEL ->
                                reject(request, "USER_CANCELLED", "El usuario canceló la verificación.")
                            BDIdentityVerificationResponse.StatusType.ERROR,
                            BDIdentityVerificationResponse.StatusType.NOFOUND ->
                                reject(request, "SDK_ERROR", response.message ?: "La SDK devolvió un error.")
                            else -> reject(request, "INVALID_RESPONSE", "La SDK devolvió un estado no reconocido.")
                        }
                    }
                }
                override fun onCancel() {
                    UiThreadUtil.runOnUiThread {
                        reject(request, "USER_CANCELLED", "El usuario canceló la verificación.")
                    }
                }
            })
        } catch (_: Exception) {
            reject(request, "CALLBACK_ERROR", "No fue posible registrar la respuesta de la SDK.")
            return
        }
        try {
            BecomeResponseManager.getInstance().startAuthentication(activity, config)
        } catch (_: Exception) {
            reject(request, "START_AUTH_ERROR", "No fue posible iniciar la SDK. Revisa sus dependencias y recursos.")
        }
    }

    private fun reject(request: SingleFlight.Ticket<Promise>, code: String, message: String) {
        requests.take(request)?.reject(code, message)
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
