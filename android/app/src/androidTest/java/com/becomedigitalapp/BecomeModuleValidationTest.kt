package com.becomedigitalapp

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.AndroidJUnit4
import com.facebook.react.bridge.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class BecomeModuleValidationTest {
    private fun rejects(params: JavaOnlyMap, expected: String) {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val module = BecomeModule(BridgeReactContext(instrumentation.targetContext))
        val finished = CountDownLatch(1)
        val code = AtomicReference<String>()
        val promise = PromiseImpl(
            Callback { code.set("UNEXPECTED_RESOLVE"); finished.countDown() },
            Callback { args ->
                code.set((args.firstOrNull() as? ReadableMap)?.getString("code"))
                finished.countDown()
            }
        )
        module.iniciarBecomeSDK(params, promise)
        assertTrue(finished.await(5, TimeUnit.SECONDS))
        assertEquals(expected, code.get())
    }

    @Test fun rejectsMissingUserId() {
        rejects(JavaOnlyMap.of("clientId", "test", "clientSecret", "test", "contractId", "2"), "INVALID_PARAMS")
    }
    @Test fun rejectsWrongParameterTypes() {
        rejects(JavaOnlyMap.of("clientId", 2, "clientSecret", "test", "contractId", "2", "userId", "test"), "INVALID_PARAMS")
        rejects(JavaOnlyMap.of("clientId", "test", "clientSecret", "test", "contractId", "2", "userId", "test", "preventScreenCapture", "false"), "INVALID_PARAMS")
    }
    @Test fun rejectsMissingActivity() {
        rejects(JavaOnlyMap.of("clientId", "test", "clientSecret", "test", "contractId", "2", "userId", "test"), "NO_ACTIVITY")
    }
}
