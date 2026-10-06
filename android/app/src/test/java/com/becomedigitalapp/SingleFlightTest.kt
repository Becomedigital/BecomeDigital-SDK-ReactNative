package com.becomedigitalapp

import org.junit.Assert.*
import org.junit.Test

class SingleFlightTest {
    @Test fun rejectsConcurrentRequests() {
        val gate = SingleFlight<String>()
        val first = gate.begin("first")!!
        assertTrue(gate.isBusy)
        assertNull(gate.begin("second"))
        assertEquals("first", gate.take(first))
        assertFalse(gate.isBusy)
    }

    @Test fun duplicateAndStaleCallbacksCannotFinishAnotherRequest() {
        val gate = SingleFlight<String>()
        val first = gate.begin("first")!!
        assertEquals("first", gate.take(first))
        assertNull(gate.take(first))
        val second = gate.begin("second")!!
        assertNull(gate.take(first))
        assertTrue(gate.isBusy)
        assertEquals("second", gate.take(second))
    }
}
