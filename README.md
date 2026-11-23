# Integrar Become Digital en React Native

Become Digital permite verificar la identidad mediante captura documental y validación facial. Este repositorio contiene un demo React Native y los bridges de Android e iOS necesarios para abrir la interfaz nativa y recibir el resultado en JavaScript.

La opción recomendada es iniciar con JWT obtenidos por el backend de su aplicación. El demo también conserva el acceso anterior con credenciales para facilitar la migración. Consulte las guías nativas de [Android](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android) e [iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS).

## Antes de comenzar

- Necesita una app React Native con proyectos nativos `android/` e `ios/`. El bridge no funciona en Expo Go; requiere una compilación nativa propia.
- El ejemplo usa React Native 0.84.1, React 19.2.3 y Node.js 22.11 o posterior. Es un módulo nativo clásico que usa la interoperabilidad de la Nueva Arquitectura.
- Android requiere Java 17, Android SDK 36, Build Tools 36.0.0, NDK 27.1.12297006 y Android 7.0 o posterior. Consulte las [versiones del ejemplo](docs/ARTEFACTOS.md).
- iOS requiere iOS 16.0 o posterior, Xcode compatible con Swift 6.4, Ruby 3.2.2 o posterior y CocoaPods 1.16.2.
- Solicite las licencias emitidas para su app. Los identificadores del demo son `com.becomedigitalapp` en Android y `com.becomedigital.sdk.identity.verification.finger.ios` en iOS.
- Su backend debe entregar los dos JWT para el mismo contrato y ambiente. `client_id` y `client_secret` permanecen en el backend.

## Ejecutar el demo

Desde la raíz:

```sh
npm ci
npm run check
npm start
```

Mantenga Metro abierto. En otra terminal, para Android:

```sh
adb devices -l
adb -s SERIAL reverse tcp:8081 tcp:8081
npm run android -- --device SERIAL
```

Sustituya `SERIAL` por el identificador del dispositivo. Configure el Android SDK y `JAVA_HOME` en su equipo. Si necesita `android/local.properties`, use su propia ruta `sdk.dir`; es un archivo local.

Para iOS:

```sh
bundle install
cd ios
bundle exec pod install
open BecomeDigitalApp.xcworkspace
```

Espere a que Xcode resuelva los paquetes. Seleccione su equipo en **Signing & Capabilities** y ejecute el target de la app. Consulte la [guía iOS](ios/README_BECOME_IOS.md).

El formulario abre en **JWT (recomendado)**. Pegue el token de creación en **JWT de creación (verification:create)** y el de consulta en **JWT de consulta (verification:get)**, ambos sin `Bearer`; complete el contrato y pulse **Iniciar Verificación**. El demo genera un `userId` de prueba para cada intento. Los JWT se muestran protegidos y permanecen solo en memoria: no se guardan en el perfil Testing.

El indicador «Bridge nativo conectado» confirma el registro del módulo. La licencia, los permisos y los JWT se validan al iniciar el flujo. Debug requiere Metro de este mismo proyecto; Release incorpora JavaScript en la app.

## Cómo se comunican React Native y la SDK

```text
React Native → BecomeModule (Kotlin o Swift) → interfaz nativa de Become
React Native ← promesa del bridge ← resultado de la verificación
```

Ambas plataformas exportan `BecomeModule.iniciarBecomeSDK`. El adaptador TypeScript valida los parámetros, solicita cámara en Android y evita llamadas simultáneas. Cada bridge construye `BDIVConfig`, asigna los tokens antes de iniciar y transforma la respuesta nativa en una promesa.

## Paso 1 Instalar la SDK en cada proyecto nativo

El demo ya consume la SDK de Android mediante Maven Central y la de iOS mediante Swift Package Manager (SPM). Para reproducir la instalación en otra app React Native, consulte la [guía de Maven Central y SPM](docs/INSTALACION_NATIVA.md), con los bloques de Gradle, los pasos de Xcode y la migración desde archivos locales.

### Android

El demo consume la distribución publicada desde Maven Central:

```groovy
dependencies {
    implementation "ai.becomedigital:identity-verification:3.5.1"
    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.5"
}
```

Conserve `google()`, `mavenCentral()` y la configuración de desugaring. El paquete incorpora sus dependencias transitivas; no agregue además el AAR local ni las dependencias anteriores de captura. Revise la [instalación Android](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android/blob/main/INSTALACION.md) e incorpore la configuración a su Gradle existente.

Agregue la licencia emitida para su `applicationId` en `android/app/src/main/assets/com.become.blinkid.key`. El archivo está ignorado por Git. La licencia anterior `com.become.mb.key` no se utiliza en esta integración.

Revise los permisos en [AndroidManifest.xml](android/app/src/main/AndroidManifest.xml) y solicite cámara en tiempo de ejecución. El demo usa firma de depuración; configure la firma de producción en su propia app.

### iOS

El proyecto fija el paquete `https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS.git` en la versión **5.3.2** y enlaza el producto **BDIdentityVerification**. SPM resuelve el binario y las dependencias necesarias; no agregue además el XCFramework local ni productos de captura anteriores.

Agregue su licencia en `ios/Application/Resources/com.become.blinkid.key.txt`. La fase **Copiar licencia local** la incorpora al demo si existe. El archivo está ignorado por Git; su ausencia se informa como `MISSING_LICENSE_FILES` al iniciar. En su propia app, agréguelo al target y a **Copy Bundle Resources**.

Declare `NSCameraUsageDescription` en `Info.plist`. Siga la [instalación iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS/blob/main/INSTALACION.md) y la [guía del bridge iOS](ios/README_BECOME_IOS.md).

## Paso 2 Registrar el bridge nativo

### Android

1. Incorpore [BecomeModule.kt](android/app/src/main/java/com/becomedigitalapp/BecomeModule.kt), [SingleFlight.kt](android/app/src/main/java/com/becomedigitalapp/SingleFlight.kt) y [BecomePackage.kt](android/app/src/main/java/com/becomedigitalapp/BecomePackage.kt). Ajuste la declaración `package` y las rutas a su app.
2. Registre `BecomePackage()` en la lista de paquetes de React Native, como en [MainApplication.kt](android/app/src/main/java/com/becomedigitalapp/MainApplication.kt). Este módulo local no se registra por autolinking.
3. Conserve `getName() = "BecomeModule"` y el método `@ReactMethod iniciarBecomeSDK`.

### iOS

1. Incorpore [BecomeModule.swift](ios/BecomeDigitalApp/BecomeModule.swift) y [BecomeModuleBridge.m](ios/BecomeDigitalApp/BecomeModuleBridge.m) al target. Ambos deben estar en **Compile Sources**.
2. Conserve `@objc(BecomeModule)` y `RCT_EXTERN_MODULE(BecomeModule, NSObject)`.
3. Compruebe la importación de `BDIdentityVerification` desde los archivos Swift del target, la licencia y el permiso de cámara. Si viene de un bridge previo a la versión `5.3.2`, revise la [firma tipada del delegado iOS](ios/README_BECOME_IOS.md#adaptar-un-bridge-ios-anterior).
4. Integre el ciclo de vida descrito en la [guía iOS](ios/README_BECOME_IOS.md) con su `AppDelegate` existente.

Ambos bridges usan onboarding, DNI y pasaporte, y consultan el resultado final. Para exponer otras opciones públicas, actualice ambas implementaciones y el contrato TypeScript. Después de cambiar código o dependencias nativas, vuelva a compilar: recargar Metro no registra un módulo nuevo.

La instalación por Maven Central o SPM conserva el punto de entrada de JavaScript `BecomeModule.iniciarBecomeSDK`. Use el bridge de este repositorio para las versiones nativas indicadas y siga el contrato JWT del paso 3.

## Paso 3 Llamar al bridge desde React Native

Copie [src/types/BecomeModule.ts](src/types/BecomeModule.ts) y ajuste el `import`. La firma recomendada recibe:

| Parámetro | Tipo | Uso |
| --- | --- | --- |
| `jwt` | `string` | Token obtenido con `grant_type: verification:create`, sin `Bearer`. |
| `verificationResultsJwt` | `string` | Token obtenido con `grant_type: verification:get`, sin `Bearer`. |
| `contractId` | `string` | Contrato autorizado para los dos tokens. |
| `userId` | `string` | Identificador de su usuario o solicitud. |
| `preventScreenCapture` | `boolean` opcional | El bridge usa `true` cuando se omite. |

```ts
import BecomeModule, {errorDeSDK} from './src/types/BecomeModule';

async function verificarIdentidad(
  jwt: string,
  verificationResultsJwt: string,
  contractId: string,
  userId: string,
) {
  try {
    return await BecomeModule.iniciarBecomeSDK({
      jwt,
      verificationResultsJwt,
      contractId,
      userId,
      preventScreenCapture: true,
    });
  } catch (cause) {
    const error = errorDeSDK(cause);
    // Muestre el código y mensaje; no registre tokens ni datos personales.
    throw error;
  }
}
```

La [guía JWT](docs/AUTENTICACION_JWT.md) explica la obtención de tokens desde su backend y su asignación en Kotlin y Swift. No mezcle JWT con `clientId` o `clientSecret`: el bridge rechaza esa combinación. En este ejemplo se exigen los dos tokens porque el flujo incluye la consulta del resultado final.

La respuesta conserva `status`, `message` y `userId`, con `requestId?` y `responseURL?` opcionales. `SUCCES` es el nombre público del estado de éxito; `PENDING` indica un resultado pendiente. El rechazo proporciona `code` y `message`. Android puede informar `USER_CANCELLED`; iOS no expone un callback de cancelación independiente en `BDIVDelegate`.

### Ejemplo de un solo botón con JWT

Al pulsar **Iniciar verificación con JWT**, [JWTExample.tsx](examples/JWTExample.tsx) solicita una sesión nueva al backend configurado. Espera los dos JWT, el contrato y el usuario, y entonces inicia la SDK. Consulte el [ejemplo completo de conexión](docs/AUTENTICACION_JWT.md#ejemplo-de-un-solo-botón). Para uso interno, también está disponible la [prueba local de un solo clic](docs/AUTENTICACION_JWT.md#prueba-local-de-un-solo-clic-con-la-api-pública).

**Credenciales para pruebas del demo.** Mantenga los secretos de prueba y producción en el entorno del servicio externo. El repositorio contiene la lógica y la documentación pública de la API. Nunca incluya credenciales ni JWT reales en código, archivos de configuración, ejemplos, pruebas o pull requests. Consulte la [regla para credenciales de prueba](docs/AUTENTICACION_JWT.md#regla-para-las-credenciales-de-prueba).

### Compatibilidad con credenciales anteriores

Seleccione **Credenciales (anterior)** para usar `clientId`, `clientSecret` y `contractId`. La firma nativa está deprecada y se conserva para integraciones existentes. [OneButtonExample.tsx](examples/OneButtonExample.tsx) mantiene esa muestra; para nuevas apps use JWT.

Solo este modo ofrece **Guardar Testing** y **Cargar Testing**. El perfil usa `AsyncStorage`, que no es almacenamiento seguro para secretos de producción. Un secreto importado en JavaScript forma parte del bundle de la app.

## Paso 4 Probar la integración

Realice las pruebas funcionales en Android e iPhone físicos con una licencia autorizada y tokens vigentes. Compruebe apertura de la interfaz, cámara, captura documental, validación facial, cancelación, errores y resultado. Use la [guía de validación](docs/VALIDACION.md).

El demo mantiene el campo de error seleccionable y el área segura en ambas plataformas. Su formulario desactiva la protección de pantalla para facilitar pruebas manuales; el bridge y el ejemplo JWT de un botón la activan por defecto.

Para problemas de instalación, Metro, licencia o JWT, consulte [solución de problemas](docs/SOLUCION_DE_PROBLEMAS.md). Las [versiones de integración](docs/ARTEFACTOS.md) permiten comprobar las dependencias seleccionadas.
