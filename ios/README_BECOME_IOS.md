# Integrar Become Digital en el proyecto iOS de una app React Native

Para invocar la SDK desde JavaScript, primero debe integrarla en el target iOS y después registrar un módulo nativo que exponga su flujo a React Native. Este directorio contiene un ejemplo de ambas piezas. La [guía principal](../README.md) explica el recorrido completo para Android e iOS.

## Paso 1 Añadir la SDK y sus recursos al target

1. Agregue su `BDIdentityVerification.xcframework` autorizado al target de la app en Xcode y seleccione **Embed & Sign**. El ejemplo lo guarda en [`BecomeDigitalApp/Frameworks/`](BecomeDigitalApp/Frameworks/).
2. Agregue `com.become.document.key.txt` a **Copy Bundle Resources** para que quede dentro del bundle. En este repositorio está en `Application/Resources/`. Use la licencia entregada para su integración.
3. Declare `NSCameraUsageDescription` y `NSMicrophoneUsageDescription` en `Info.plist` con textos adecuados para su app. Puede comparar con [el archivo del ejemplo](BecomeDigitalApp/Info.plist).
4. Agregue los paquetes Swift requeridos por la SDK y asocie sus productos al target. El [proyecto de ejemplo](BecomeDigitalApp.xcodeproj/project.pbxproj) declara como mínimos `amplify-swift` 2.45.4, `amplify-ui-swift-liveness` 1.4.4, `capture-core-sp` 1.4.3 y `capture-ux-sp` 1.4.3. Consulte la guía de la SDK nativa antes de fijar versiones en una app existente; `Package.resolved` registra las versiones que Xcode resolvió para este ejemplo.
5. Mantenga la configuración de React Native y CocoaPods de su app. El [`Podfile` del ejemplo](Podfile) es una referencia, no un archivo que deba reemplazar al suyo. Verifique también el deployment target y la firma del target para instalarlo en dispositivos físicos.

## Paso 2 Incorporar y exportar el bridge

Agregue [`BecomeModule.swift`](BecomeDigitalApp/BecomeModule.swift) y [`BecomeModuleBridge.m`](BecomeDigitalApp/BecomeModuleBridge.m) al target de su app y compruebe que ambos aparecen en **Compile Sources**. No basta con copiar los archivos al directorio: Xcode debe compilarlos en el mismo target que usa React Native.

La clase Swift marcada con `@objc(BecomeModule)` recibe los parámetros, comprueba los recursos necesarios, construye `BDIVConfig` y presenta la interfaz de la SDK. El archivo Objective-C usa `RCT_EXTERN_MODULE(BecomeModule, NSObject)` y `RCT_EXTERN_METHOD` para hacer visible `iniciarBecomeSDK` a `NativeModules.BecomeModule`. Mantenga iguales los nombres exportados en Swift, Objective-C y JavaScript.

Antes de trasladar el código sin cambios, revise los tipos de documento, `customerLogo` y `customLocalizationFileName` que se pasan a `BDIVConfig`: deben corresponder con el flujo y los recursos de su propia app. El bridge del ejemplo conserva una promesa pendiente hasta recibir `BDIVDelegate` y devuelve el resultado o un error a JavaScript.

## Paso 3 Compilar y llamar al módulo

Desde la raíz de **su** proyecto, instale sus Pods según su configuración y abra el `.xcworkspace` en Xcode. Seleccione un equipo de firma válido, conecte un iPhone y compile el target. Los cambios en Swift, Objective-C, paquetes o frameworks requieren una compilación nativa nueva; una recarga de Metro no es suficiente.

En JavaScript use el [contrato compartido](../src/types/BecomeModule.ts) como referencia para invocar `BecomeModule.iniciarBecomeSDK(params)`. Los parámetros obligatorios son `clientId`, `clientSecret`, `contractId` y `userId`. `preventScreenCapture` es opcional y el bridge usa `true` cuando se omite. La [pantalla demo](../src/screens/BecomeSDKScreen.tsx) envía `false` solo para facilitar las pruebas; no copie esa decisión sin evaluar la política de seguridad de su app.

El bridge resuelve con `status`, `message` y `userId` cuando la SDK informa `SUCCES` o `PENDING`. Rechaza con `SDK_ERROR` para `ERROR`, `NOFOUND` o el callback de error. También puede rechazar antes de abrir la SDK con `INVALID_PARAMS`, `MISSING_CAMERA_PERMISSION`, `MISSING_LICENSE_FILES`, `NO_VIEW_CONTROLLER`, `SDK_NOT_LINKED` o `SDK_BUSY`. Muestre o registre el código y mensaje del error, nunca `clientSecret`.

`BDIVDelegate` solo define callbacks de éxito y error; no ofrece uno de cancelación separado. Por eso no suponga que iOS devolverá `USER_CANCELLED` como Android. Si `NativeModules.BecomeModule` no aparece, compruebe la pertenencia de los dos archivos del bridge al target y vuelva a compilar.

Use un dispositivo físico para comprobar cámara y biometría. El simulador permite revisar la compilación y parte de la UI, pero no sustituye esa prueba.
