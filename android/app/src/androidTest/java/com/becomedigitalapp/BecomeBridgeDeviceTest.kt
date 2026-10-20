package com.becomedigitalapp

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.regex.Pattern

/** Uses a profile prepared manually in the demo; never passes secrets in shell arguments. */
@RunWith(AndroidJUnit4::class)
class BecomeBridgeDeviceTest {
    @Test fun buttonOpensBecomeNativeFlow() {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        device.executeShellCommand("am start -n com.becomedigitalapp/.MainActivity")
        assertTrue("No apareció el bridge en la pantalla React Native.",
            device.wait(Until.hasObject(By.textContains("Bridge nativo conectado")), 60_000))
        val button = device.wait(Until.findObject(By.desc("Iniciar verificación")), 10_000)
        assertTrue("No apareció el botón JavaScript.", button != null)
        // No success is reported if credentials are absent: JUnit marks this test skipped.
        assumeTrue("Guarda un perfil Testing autorizado en el demo antes de ejecutar esta prueba.",
            device.wait(Until.hasObject(By.desc("Iniciar verificación").enabled(true)), 10_000))
        button.click()
        val permission = device.wait(Until.findObject(
            By.res(Pattern.compile(".*:id/permission_allow_foreground_only_button"))), 5_000)
        permission?.click()
        assertTrue("No apareció la introducción nativa de la SDK.",
            device.wait(Until.hasObject(By.text(Pattern.compile(
                ".*(Verifiquemos tu identidad|verify your identity).*", Pattern.CASE_INSENSITIVE))), 60_000))
        // Stop before liveness/document capture; do not collect biometric data automatically.
    }
}
