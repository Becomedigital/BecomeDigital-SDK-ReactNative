# Integrar Become Digital en el proyecto iOS de una app React Native

Integre el producto nativo en el target iOS y registre el bridge que lo expone a JavaScript. La [guía principal](../README.md) explica la integración compartida y la [guía JWT](../docs/AUTENTICACION_JWT.md) detalla cómo recibir los tokens desde su backend.

## Paso 1 Agregar el paquete y la licencia

1. Configure iOS **16.0 o posterior** y use Xcode compatible con Swift 6.4.
2. En **File > Add Package Dependencies**, agregue `https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS.git` con **Exact Version 5.3.2**.
3. Agregue el producto **BDIdentityVerification** al target de su app. SPM resuelve el binario y sus dependencias.
4. Si migra desde la distribución por archivo, retire el XCFramework local y sus productos enlazados anteriores. Conserve las dependencias que su propia app utiliza directamente. Siga la [instalación nativa](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS/blob/main/INSTALACION.md).
5. Agregue la licencia `com.become.blinkid.key.txt` emitida para su Bundle ID al target y a **Copy Bundle Resources**.
6. Declare `NSCameraUsageDescription` en `Info.plist`; agregue ubicación solo si el flujo de su app la requiere.

En este demo, coloque la licencia en `ios/Application/Resources/com.become.blinkid.key.txt`. La fase **Copiar licencia local** la incorpora si existe. El archivo está ignorado por Git y no se incluyen licencias nuevas en el repositorio. Puede compilar sin él, pero el inicio informa `MISSING_LICENSE_FILES`.

## Paso 2 Incorporar y exportar el bridge

Agregue [BecomeModule.swift](BecomeDigitalApp/BecomeModule.swift) y [BecomeModuleBridge.m](BecomeDigitalApp/BecomeModuleBridge.m) al target y a **Compile Sources**. Conserve los nombres `@objc(BecomeModule)` y `RCT_EXTERN_MODULE(BecomeModule, NSObject)`.

El método `iniciarBecomeSDK` recibe `jwt`, `verificationResultsJwt`, `contractId`, `userId` y la opción `preventScreenCapture`. Crea `BDIVConfig(jwt:...)`, asigna `verificationResultsJwt` y luego presenta la SDK. El ejemplo configura onboarding, DNI, pasaporte y consulta del resultado final.

El bridge exige los dos tokens sin `Bearer` y no permite mezclarlos con credenciales. También conserva la firma anterior con `clientId` y `clientSecret`, deprecada por la SDK, para integraciones existentes. No hay cambio automático entre ambos métodos cuando falla una verificación.

## Paso 3 Compilar y llamar desde JavaScript

Ejecute `bundle install` con Ruby 3.2.2 o posterior y `bundle exec pod install` desde `ios/`. Mantenga la configuración de React Native y CocoaPods de su app; use el [Podfile](Podfile) como referencia.

Abra el `.xcworkspace`, resuelva los paquetes y seleccione un equipo de firma válido. Cambios en Swift, Objective-C o dependencias requieren volver a compilar; Metro solo actualiza JavaScript.

Use el [contrato TypeScript](../src/types/BecomeModule.ts) y el [ejemplo JWT de un botón](../examples/JWTExample.tsx). La protección de pantalla se activa por defecto; el formulario del demo la desactiva para facilitar las pruebas manuales.

## Permisos, resultados y errores

El bridge solicita cámara mediante `AVCaptureDevice` y devuelve `CAMERA_PERMISSION_DENIED` si el usuario la rechaza. La descripción en `Info.plist` no concede el permiso.

La promesa resuelve con `status`, `message` y `userId` para `SUCCES` o `PENDING`. `responseURL` es opcional y se conserva cuando la respuesta de consulta lo entrega. No dependa de ese campo para determinar el éxito.

El rechazo conserva `code` y `message`. Antes de abrir, puede informar `INVALID_PARAMS`, `MISSING_CAMERA_PERMISSION`, `MISSING_LICENSE_FILES`, `NO_VIEW_CONTROLLER`, `SDK_NOT_LINKED` o `SDK_BUSY`. Los errores del delegado se entregan como `SDK_ERROR`; los estados desconocidos se rechazan como `INVALID_RESPONSE`.

`BDIVDelegate` no ofrece un callback de cancelación independiente. No suponga que iOS devuelve `USER_CANCELLED` como Android. No registre JWT ni credenciales al mostrar errores.

## Ciclo de vida

El ejemplo usa `SceneDelegate` y `UIApplicationSceneManifest`. [AppDelegate.swift](BecomeDigitalApp/AppDelegate.swift) inicia React Native desde la ventana de la escena. Integre esta ruta con su propio ciclo de vida sin crear dos ventanas ni iniciar React Native dos veces.

El callback `application(_:handleEventsForBackgroundURLSession:completionHandler:)` se reenvía a `BecomeDigitalSDK.handleEventsForBackgroundURLSession`. Si la SDK reconoce la sesión, administra su finalización. Las sesiones de otros componentes deben dirigirse al propietario correspondiente de su app; no invoque dos veces el mismo completion.

## Validar la integración

Compruebe la compilación y el enlace del producto SPM. Realice las pruebas funcionales con cámara, documento y rostro en un iPhone físico autorizado. La compilación y el registro del bridge no certifican los tokens ni el flujo biométrico.

Consulte la [validación](../docs/VALIDACION.md) y la [solución de problemas](../docs/SOLUCION_DE_PROBLEMAS.md).
