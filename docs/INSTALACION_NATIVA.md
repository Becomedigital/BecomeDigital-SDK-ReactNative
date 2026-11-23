# Instalar Become Digital en React Native con Maven Central y SPM

Instale la SDK en los proyectos nativos de su app y registre el bridge que llama desde JavaScript. El demo ya fija las mismas versiones descritas aquí. Use una app React Native con proyectos nativos `android/` e `ios/` y compile de nuevo después de cambiar las dependencias o el bridge.

| Plataforma | Dependencia nativa | Requisito mínimo |
| --- | --- | --- |
| Android | Maven Central: `ai.becomedigital:identity-verification:3.5.1` | Android 7.0 (API 24), ARMv7 o ARM64 |
| iOS | Swift Package Manager (SPM): producto `BDIdentityVerification`, versión exacta `5.3.2` | iOS 16.0 y Xcode compatible con Swift 6.4 |

## Android con Maven Central

1. Incluya `google()` y `mavenCentral()` en el bloque que gestiona los repositorios de dependencias de la app. Si su proyecto los centraliza, agréguelos a `dependencyResolutionManagement.repositories` en `android/settings.gradle` o `android/settings.gradle.kts`. Si los declara por proyecto o módulo, use el bloque `repositories` existente. Conserve los repositorios que necesitan las demás dependencias de su app.
2. Incorpore estos ajustes al archivo Gradle del módulo de la app. Conserve la configuración de compilación y los plugins de su versión de React Native.

   ```groovy
   // android/app/build.gradle
   android {
       compileOptions {
           coreLibraryDesugaringEnabled true
       }
   }

   dependencies {
       implementation "ai.becomedigital:identity-verification:3.5.1"
       coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.5"
   }
   ```

   ```kotlin
   // android/app/build.gradle.kts
   android {
       compileOptions {
           isCoreLibraryDesugaringEnabled = true
       }
   }

   dependencies {
       implementation("ai.becomedigital:identity-verification:3.5.1")
       coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
   }
   ```

3. Solicite la licencia emitida para el `applicationId` de su app y agréguela en `android/app/src/main/assets/com.become.blinkid.key`. Revise que el manifiesto combinado incluya `INTERNET` y `CAMERA` y solicite el permiso de cámara en tiempo de ejecución. El adaptador TypeScript del demo ya realiza la solicitud.
4. Sincronice Gradle y confirme la versión resuelta. Desde la carpeta `android/`, puede usar:

   ```sh
   ./gradlew :app:dependencyInsight --configuration debugRuntimeClasspath --dependency ai.becomedigital:identity-verification
   ```

Gradle descarga el AAR y las dependencias transitivas declaradas en Maven Central. Si migra desde un AAR local, retire su declaración `files` o `fileTree` para Become y los enlaces manuales que usaba la distribución anterior. Conserve las dependencias que su app usa directamente. Revise la [guía nativa de Android](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android/blob/main/INSTALACION.md) y, si su variante de producción usa minificación, la [configuración de R8](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android/blob/main/docs/R8.md).

## iOS con Swift Package Manager

1. Instale los Pods de React Native según la configuración de su app y abra el archivo `.xcworkspace` en Xcode. Establezca la versión mínima de iOS del target de la app en `16.0` o posterior.
2. En **File > Add Package Dependencies**, ingrese `https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS.git`. Seleccione **Exact Version** e indique `5.3.2`.
3. Agregue el producto `BDIdentityVerification` al target que compila el bridge. Compruebe la versión en **Package Dependencies** y el producto en **Link Binary With Libraries**. Conserve el `Package.resolved` del proyecto.
4. Agregue `com.become.blinkid.key.txt`, emitido para el **Bundle Identifier** de su app, a **Copy Bundle Resources** del mismo target. En el demo, ubíquelo en `ios/Application/Resources/`. Declare `NSCameraUsageDescription` en `Info.plist` con un texto que explique el uso de la cámara.

SPM descarga la SDK y sus dependencias. Si migra desde un XCFramework local, quite su referencia de enlace y de los frameworks integrados, así como los paquetes agregados solo para esa distribución. Mantenga CocoaPods para React Native y las dependencias que su app usa directamente. Consulte la [guía nativa de iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS/blob/main/INSTALACION.md).

## Registrar y comprobar el bridge

1. En Android, incorpore las clases Kotlin y registre `BecomePackage()` en `MainApplication`. En iOS, compile `BecomeModule.swift` y `BecomeModuleBridge.m` dentro del target que consume el producto SPM. Consulte el [paso de registro del bridge](../README.md#paso-2-registrar-el-bridge-nativo).
2. Si su bridge Swift anterior recibía `AnyObject`, use la firma con `BDIdentityVerificationResponse` de la versión `5.3.2`. El ejemplo conserva los campos públicos de la promesa mediante la conversión de la respuesta nativa. Consulte la [adaptación del delegado iOS](../ios/README_BECOME_IOS.md#adaptar-un-bridge-ios-anterior).
3. Recompile la app y compruebe que React Native encuentre `NativeModules.BecomeModule.iniciarBecomeSDK`. En el demo esto se muestra como **Bridge nativo conectado**.
4. Para iniciar la verificación, entregue `jwt` y `verificationResultsJwt` desde su backend, además de `contractId` y `userId`. Maven Central y SPM resuelven las dependencias nativas; el registro del módulo y la llamada JavaScript siguen siendo pasos de la app. Consulte la [guía JWT](AUTENTICACION_JWT.md) y la [validación en dispositivos físicos](VALIDACION.md#prueba-manual-con-jwt).
