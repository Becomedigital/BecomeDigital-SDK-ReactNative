package com.becomedigitalapp

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.PromiseImpl
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class BecomeBridgeDeviceTest {

    @Test
    fun opensBecomeNativeFlow() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val arguments = InstrumentationRegistry.getArguments()
        val device = UiDevice.getInstance(instrumentation)

        val clientId = arguments.requiredString("clientId")
        val clientSecret = arguments.requiredString("clientSecret")
        val contractId = arguments.requiredString("contractId")

        val launchOutput = device.executeShellCommand(
            "am start -n com.becomedigitalapp/.MainActivity"
        )
        assertTrue(
            "Android no pudo iniciar MainActivity: $launchOutput",
            !launchOutput.contains("Error", ignoreCase = true)
        )

        assertTrue(
            "El formulario React Native no apareció.",
            device.wait(Until.hasObject(By.textContains("Identidad Become")), 60_000)
        )

        val application = instrumentation.targetContext.applicationContext as MainApplication
        val reactContext = waitForReactContext(application)
        val module = reactContext.getNativeModule("BecomeModule") as? BecomeModule
        assertNotNull("BecomeModule no está registrado en React Native.", module)

        val rejection = AtomicReference<Any?>()
        val promise = PromiseImpl(
            Callback { },
            Callback { arguments -> rejection.set(arguments.firstOrNull()) }
        )
        val params = Arguments.createMap().apply {
            putString("clientId", clientId)
            putString("clientSecret", clientSecret)
            putString("contractId", contractId)
            putString("userId", "device-test-${System.currentTimeMillis()}")
            putBoolean("preventScreenCapture", false)
        }

        instrumentation.runOnMainSync {
            module!!.iniciarBecomeSDK(params, promise)
        }

        assertTrue(
            "El flujo nativo no reemplazó el formulario React Native.",
            device.wait(Until.gone(By.textContains("Identidad Become")), 30_000)
        )
        assertNull("El bridge rechazó la promesa al iniciar el SDK.", rejection.get())
        assertEquals(
            "La SDK dejó la aplicación en primer plano.",
            "com.becomedigitalapp",
            device.currentPackageName
        )
        Thread.sleep(15_000)
        assertEquals(
            "La SDK ya no está en primer plano después de 15 segundos.",
            "com.becomedigitalapp",
            device.currentPackageName
        )
        device.executeShellCommand("screencap -p /sdcard/become-sdk-proof.png")
    }

    private fun waitForReactContext(application: MainApplication): ReactApplicationContext {
        repeat(120) {
            val context = application.reactHost.currentReactContext
            if (context is ReactApplicationContext) return context
            Thread.sleep(500)
        }
        throw AssertionError("React Native no creó ReactApplicationContext en 60 segundos.")
    }

    private fun android.os.Bundle.requiredString(name: String): String {
        val value = getString(name)?.trim().orEmpty()
        assertTrue("Falta el argumento de instrumentación '$name'.", value.isNotEmpty())
        return value
    }
}
