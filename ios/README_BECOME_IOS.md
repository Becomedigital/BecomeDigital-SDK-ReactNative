# Integrar Become Digital en el proyecto iOS de una app React Native

Para invocar la SDK desde JavaScript, primero debe integrarla en el target iOS de la app y después registrar un módulo nativo que exponga su flujo a React Native. Este directorio contiene un ejemplo de bridge. La [guía principal](../README.md) describe la integración para Android e iOS.

## Paso 1 Añadir la SDK AutoCaptureOCR y sus recursos al target

Use la [guía de integración de la SDK AutoCaptureOCR para iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS) como referencia para la distribución del framework, las dependencias, las licencias, los identificadores de app compatibles y las instrucciones de migración.

1. Configure la versión mínima de la app en **iOS 16.0 o posterior**. La SDK nativa actual usa una interfaz SwiftUI.
2. Agregue el `BDIdentityVerification.xcframework` autorizado al target de la app en Xcode y seleccione **Embed & Sign**. La versión del framework es **1.2.3**.
3. Agregue la licencia BlinkID entregada para su Bundle ID y ambiente a **Copy Bundle Resources**. La guía nativa actual usa `com.become.blinkid.key.txt`. No copie una licencia entre identificadores de app o ambientes distintos.
4. Declare `NSCameraUsageDescription` en `Info.plist` con un texto adecuado para la app. Consulte el [archivo de ejemplo](BecomeDigitalApp/Info.plist) para identificar la clave requerida por iOS. Agregue el permiso de ubicación solo cuando el flujo de su app lo necesite.
5. Agregue estas dependencias de Swift Package Manager con las versiones exactas que requiere la SDK nativa y conserve `Package.resolved` junto con el proyecto:

   | Paquete | Versión | Producto agregado al target de la app |
   | --- | --- | --- |
   | `amplify-swift` | 2.53.3 | Productos de Amplify requeridos |
   | `amplify-ui-swift-liveness` | 1.4.4 | `FaceLiveness` |
   | `blinkid-ios` | 8002.0.2 | `BlinkIDUX` (que incorpora BlinkID Core) |

6. Si migra desde Capture Core/UX, elimine las referencias anteriores a los paquetes Capture Core y Capture UX y sus productos enlazados antes de agregar BlinkID Core/UX. Conserve la configuración de React Native y CocoaPods de su app; el [`Podfile`](Podfile) de este repositorio es una referencia y no debe reemplazar al de su app. Cambiar la versión de un framework o paquete requiere volver a validar la integración nativa.

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

El target `BecomeDigitalAppUITests` verifica la disponibilidad del bridge y usa el botón JavaScript para abrir la introducción nativa. Requiere iOS 17 o posterior por el entorno de ejecución de XCTest de Xcode 27. La SDK AutoCaptureOCR requiere que el target de la app tenga como mínimo iOS 16.0. El esquema usa Release para evitar depender de Metro. La prueba de apertura necesita un perfil Testing guardado manualmente y un teléfono desbloqueado; se omite si no hay perfil y no valida el flujo biométrico. Consulte [VALIDACION.md](../docs/VALIDACION.md) para conocer los comandos y su alcance.
