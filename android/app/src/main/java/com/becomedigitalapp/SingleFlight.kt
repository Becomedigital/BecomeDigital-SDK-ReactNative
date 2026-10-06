package com.becomedigitalapp

/** Main-thread-only gate; identity prevents duplicate/stale callbacks settling another call. */
internal class SingleFlight<T> {
    class Ticket<T>(val value: T)
    private var active: Ticket<T>? = null
    val isBusy: Boolean get() = active != null

    fun begin(value: T): Ticket<T>? {
        if (isBusy) return null
        return Ticket(value).also { active = it }
    }

    fun take(ticket: Ticket<T>): T? {
        if (active !== ticket) return null
        active = null
        return ticket.value
    }
}
