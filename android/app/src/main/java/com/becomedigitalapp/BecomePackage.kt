package com.becomedigitalapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * BecomePackage – React Native Package registration
 *
 * Registers BecomeModule so it can be discovered by React Native's
 * native module system. Add an instance of this class to the
 * packageList in MainApplication.kt.
 */
class BecomePackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> =
        listOf(BecomeModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> =
        emptyList()
}
