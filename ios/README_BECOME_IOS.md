# Integrating Become Digital into an iOS React Native project

To call the SDK from JavaScript, first integrate it into the iOS app target and then register a native module that exposes its flow to React Native. This directory contains a bridge example. The [main guide](../README.md) describes the Android and iOS integration paths.

## Step 1: add the AutoCaptureOCR SDK and resources to the target

Use the [AutoCaptureOCR iOS SDK integration guide](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS) as the source of truth for framework distribution, dependencies, licenses, supported app identifiers, and migration instructions.

1. Set the app deployment target to **iOS 16.0 or later**. The current native SDK uses a SwiftUI interface.
2. Add the authorized `BDIdentityVerification.xcframework` to the app target in Xcode and select **Embed & Sign**. The framework version is **1.2.3**.
3. Add the BlinkID license supplied for your Bundle ID and environment to **Copy Bundle Resources**. The current native guide uses `com.become.blinkid.key.txt`. Do not copy a license between app identifiers or environments.
4. Declare `NSCameraUsageDescription` in `Info.plist` using text appropriate for the app. See the [example file](BecomeDigitalApp/Info.plist) for the required iOS key. Add location permission only when the app’s own flow requires it.
5. Add these Swift Package Manager dependencies at the exact native-SDK versions, and retain `Package.resolved` with the project:

   | Package | Version | Product added to the app target |
   | --- | --- | --- |
   | `amplify-swift` | 2.53.3 | Required Amplify products |
   | `amplify-ui-swift-liveness` | 1.4.4 | `FaceLiveness` |
   | `blinkid-ios` | 8002.0.2 | `BlinkIDUX` (which brings in BlinkID Core) |

6. If migrating from Capture Core/UX, remove the previous Capture Core and Capture UX package references and linked products before adding BlinkID Core/UX. Keep the existing React Native and CocoaPods configuration for the app; this repository’s [`Podfile`](Podfile) is a reference, not a replacement for an app’s Podfile. Changing a framework or package version requires a new native validation.

## Paso 2 Incorporar y exportar el bridge

Agregue [`BecomeModule.swift`](BecomeDigitalApp/BecomeModule.swift) y [`BecomeModuleBridge.m`](BecomeDigitalApp/BecomeModuleBridge.m) al target de su app y compruebe que ambos aparecen en **Compile Sources**. No basta con copiar los archivos al directorio: Xcode debe compilarlos en el mismo target que usa React Native.

La clase Swift marcada con `@objc(BecomeModule)` recibe los parámetros, comprueba los recursos necesarios, construye `BDIVConfig` y presenta la interfaz de la SDK. El archivo Objective-C usa `RCT_EXTERN_MODULE(BecomeModule, NSObject)` y `RCT_EXTERN_METHOD` para hacer visible `iniciarBecomeSDK` a `NativeModules.BecomeModule`. Mantenga iguales los nombres exportados en Swift, Objective-C y JavaScript.

Antes de trasladar el código sin cambios, revise los tipos de documento, `customerLogo` y `customLocalizationFileName` que se pasan a `BDIVConfig`: deben corresponder con el flujo y los recursos de su propia app. El bridge del ejemplo conserva una promesa pendiente hasta recibir `BDIVDelegate` y devuelve el resultado o un error a JavaScript.

## Paso 3 Compilar y llamar al módulo

Desde la raíz de **su** proyecto, instale sus Pods según su configuración y abra el `.xcworkspace` en Xcode. Seleccione un equipo de firma válido, conecte un iPhone y compile el target. Los cambios en Swift, Objective-C, paquetes o frameworks requieren una compilación nativa nueva; una recarga de Metro no es suficiente.

En JavaScript use el [contrato compartido](../src/types/BecomeModule.ts) como referencia para invocar `BecomeModule.iniciarBecomeSDK(params)`. Los parámetros obligatorios son `clientId`, `clientSecret`, `contractId` y `userId`. `preventScreenCapture` es opcional y el bridge usa `true` cuando se omite. La [pantalla demo](../src/screens/BecomeSDKScreen.tsx) envía `false` solo para facilitar las pruebas; no copie esa decisión sin evaluar la política de seguridad de su app.

El bridge resuelve con `status`, `message` y `userId` cuando la SDK informa `SUCCES` o `PENDING`. Rechaza con `SDK_ERROR` para `ERROR`, `NOFOUND` o el callback de error. También puede rechazar antes de abrir la SDK con `INVALID_PARAMS`, `MISSING_CAMERA_PERMISSION`, `MISSING_LICENSE_FILES`, `NO_VIEW_CONTROLLER`, `SDK_NOT_LINKED` o `SDK_BUSY`. Muestre o registre el código y mensaje del error, nunca `clientSecret`.

Solicita el permiso real de cámara mediante `AVCaptureDevice` y devuelve `CAMERA_PERMISSION_DENIED` si se rechaza o restringe. Un texto en `Info.plist` no concede ese permiso. Valida `userId` no vacío y `preventScreenCapture` booleano, presenta y finaliza en el hilo principal e ignora callbacks duplicados. Un estado desconocido se rechaza como `INVALID_RESPONSE`. Conserva `responseURL` solo cuando la SDK lo entrega; no dependa de ese campo para determinar el éxito.

`BDIVDelegate` solo define callbacks de éxito y error; no ofrece uno de cancelación separado. Por eso no suponga que iOS devolverá `USER_CANCELLED` como Android. Si `NativeModules.BecomeModule` no aparece, compruebe la pertenencia de los dos archivos del bridge al target y vuelva a compilar.

Use un dispositivo físico para comprobar cámara y biometría. El simulador permite revisar la compilación y parte de la UI, pero no sustituye esa prueba.

## Ciclo de vida y tareas de red

El ejemplo usa `SceneDelegate` y declara `UIApplicationSceneManifest` en `Info.plist`. [`AppDelegate.swift`](BecomeDigitalApp/AppDelegate.swift) incluye ambas clases: la escena crea la ventana y llama a un único método que inicia React Native. Integre estos cambios con el ciclo de vida de su app; no inicialice React Native dos veces ni mantenga dos ventanas raíz. La configuración soporta una sola escena.

El callback `application(_:handleEventsForBackgroundURLSession:completionHandler:)` se reenvía a `BecomeDigitalSDK.handleEventsForBackgroundURLSession`. La SDK devuelve si reconoce el identificador de sesión. Si lo reconoce, deja a la SDK gestionar el completion; si no, enrútelo al propietario correspondiente de su app. El demo llama al completion para sesiones desconocidas porque no tiene otros propietarios. No llame al completion dos veces ni reemplace otros manejadores de su aplicación.

## Dependencias y diagnóstico

- Ejecute `bundle install` con Ruby >= 3.2.2 y `bundle exec pod install` en `ios/`. El lockfile fija CocoaPods 1.16.2 y xcodeproj 1.27.0; evite usar accidentalmente el Ruby del sistema.
- Abra el `.xcworkspace`, no solo el `.xcodeproj`. En Debug, Metro debe corresponder a este proyecto y estar accesible desde el iPhone; Release lleva el bundle JavaScript incluido.
- No agregue productos `Amplify` o `AWSCognitoAuthPlugin` directamente al target sin revisar qué incorpora el XCFramework. Se han observado clases AWS/Amplify duplicadas con la SDK distribuida; fijar versiones no elimina automáticamente esa duplicación. Si aparece, entregue el log al proveedor para revisar el empaquetado de la SDK, en lugar de añadir más copias.
- La licencia y el Bundle ID deben estar autorizados conjuntamente. Cambiar el equipo de firma no sustituye una licencia válida.
- Los mensajes de error pueden contener información de la transacción. No registre respuestas completas, URLs de resultado ni datos personales; comparta con soporte solo evidencia sanitizada.

## Pruebas

The `BecomeDigitalAppUITests` target verifies bridge availability and uses the JavaScript button to open the native introduction. It requires iOS 17 or later because of the Xcode 27 XCTest runtime. This does not lower the AutoCaptureOCR SDK requirement: the app target must remain iOS 16.0 or later. The scheme uses Release, avoiding a Metro dependency. The opening test requires a manually saved Testing profile and an unlocked phone; it is skipped when no profile exists and does not validate the biometric flow. See [VALIDACION.md](../docs/VALIDACION.md) for commands and scope.
