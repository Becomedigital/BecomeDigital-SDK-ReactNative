# Integrar la SDK de Become Digital en React Native

La SDK de Become Digital funciona de forma nativa en Android e iOS. Una app React Native no puede llamarla directamente desde JavaScript: necesita un **bridge** en cada plataforma. Este repositorio es una app de ejemplo con esos bridges implementados; no es un paquete NPM que se instale automáticamente en otra app.

Esta guía explica qué piezas trasladar a su proyecto, cómo conectarlas y cómo manejar la respuesta. Para las dependencias y licencias de la SDK nativa, consulte también las [instrucciones de Android](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-Android) y las [instrucciones de iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-iOS).

## Antes de comenzar

- Necesita una app React Native con proyectos nativos `android/` e `ios/` y acceso a sus compilaciones.
- Solicite a Become Digital la SDK, las licencias y las credenciales correspondientes a su integración. No copie credenciales de prueba al código ni registre `clientSecret` en logs.
- Este ejemplo usa React Native 0.84.1, Node.js 22.11 o superior, Java 17 y `minSdkVersion` 24 en Android, e iOS 15.6 como deployment target del target principal. Si su app usa otras versiones, valide la compatibilidad de sus dependencias nativas antes de trasladar la configuración.
- Es un módulo nativo clásico usado mediante la interoperabilidad de la Nueva Arquitectura de React Native, no un TurboModule generado. No funciona en Expo Go: necesita una compilación nativa propia. No se ha certificado una matriz de otras versiones de React Native.
- Confirme con Become Digital los identificadores autorizados por sus licencias. El demo usa `com.becomedigitalapp` en Android y `com.becomedigital.sdk.identity.verification.finger.ios` en iOS. Cambiar estos identificadores puede requerir licencias nuevas; una licencia de la SDK no es una llave de firma o distribución.

## Ejecutar primero el demo

Desde la raíz de este repositorio:

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

Sustituya `SERIAL` por el identificador de su dispositivo autorizado. Configure Java 17, Android SDK 36, Build Tools 36.0.0 y NDK 27.1.12297006. `android/local.properties` puede contener su `sdk.dir` local; no lo suba al repositorio. Kotlin y su plugin Compose están alineados en 2.2.10, con Android Gradle Plugin 8.12.0. No copie una ruta `JAVA_HOME` de otra máquina.

Para iOS, seleccione Ruby 3.2.2 (archivo `.ruby-version`; se requiere Ruby >= 3.2.2), e instale las versiones bloqueadas de CocoaPods y sus dependencias:

```sh
bundle install
cd ios
bundle exec pod install
open BecomeDigitalApp.xcworkspace
```

Seleccione su equipo de desarrollo en **Signing & Capabilities**, habilite el modo desarrollador del iPhone y ejecútelo desde Xcode. El ejemplo usa CocoaPods 1.16.2 y xcodeproj 1.27.0. Consulte las [instrucciones iOS](ios/README_BECOME_IOS.md) antes de resolver paquetes o modificar el ciclo de vida.

Introduzca las credenciales autorizadas en el formulario y pulse **Iniciar Verificación**. El indicador «Bridge nativo conectado» confirma el registro del módulo, no la validez de la licencia ni de las credenciales. Debug necesita Metro del **mismo proyecto**; Release incorpora JavaScript en la app. No use simultáneamente dos proyectos con el mismo puerto Metro.

El formulario empieza vacío. «Guardar Testing» y «Cargar Testing» guardan un perfil local en `AsyncStorage`, que **no es almacenamiento seguro para secretos de producción**. La pantalla muestra los errores en un campo seleccionable, bloquea pulsaciones repetidas y respeta el área segura en ambas plataformas. Usa `preventScreenCapture: false` solo para pruebas; el bridge y el ejemplo mínimo usan `true` por defecto.

## Cómo se comunican React Native y la SDK

El código JavaScript envía parámetros a `NativeModules.BecomeModule`. Android implementa ese módulo en Kotlin e iOS en Swift. Cada implementación crea `BDIVConfig`, abre la interfaz de la SDK y transforma su callback en una promesa que vuelve a JavaScript:

```text
Pantalla React Native → BecomeModule (Kotlin o Swift) → SDK nativa
Pantalla React Native ← promesa del bridge ← callback de la SDK
```

Los dos módulos nativos deben exportar el mismo nombre, `BecomeModule`, y el mismo método, `iniciarBecomeSDK`. Así la pantalla React Native usa una sola API en ambas plataformas.

## Paso 1 Instalar la SDK en cada proyecto nativo

### Android

En el ejemplo, el AAR está en [`android/app/libs/becomedigitalsdk.aar`](android/app/libs/becomedigitalsdk.aar) y la licencia en `android/app/src/main/assets/com.become.mb.key`. En su app, coloque los artefactos y la licencia autorizados para su contrato en las ubicaciones que indique la guía nativa.

Revise [`android/app/build.gradle`](android/app/build.gradle) para las dependencias, repositorios, Compose, desugaring y opciones de compilación que necesita esta versión de la SDK. Revise [`android/app/src/main/AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml) para los permisos declarados, especialmente cámara e Internet. El ejemplo también define un timeout de red en [`become_config.xml`](android/app/src/main/res/values/become_config.xml). Integre estos ajustes con los existentes en su app; no sustituya todo su archivo Gradle o manifest por el del demo. El demo usa la firma de depuración de Android también para compilaciones `release`; no incluye una llave de distribución. Configure la firma de producción por separado en su propia app.

Configure su Android SDK y `JAVA_HOME` en la máquina de desarrollo. Si necesita `android/local.properties`, indique allí la ruta `sdk.dir` de su equipo; ese archivo es local y no debe incluirse en un commit.

### iOS

Agregue `BDIdentityVerification.xcframework` al target de la app con **Embed & Sign** y el archivo de licencia `com.become.document.key.txt` a **Copy Bundle Resources**. Declare `NSCameraUsageDescription` y `NSMicrophoneUsageDescription` en `Info.plist`, incorpore los paquetes Swift que requiere la SDK y compruebe la firma del target para instalarlo en un iPhone.

La [guía iOS de este repositorio](ios/README_BECOME_IOS.md) identifica los archivos, paquetes y ajustes concretos del ejemplo. Úsela junto con la guía de la SDK nativa; las versiones de su app pueden requerir una resolución distinta.

## Paso 2 Registrar el bridge nativo

### Android

1. Incorpore [`BecomeModule.kt`](android/app/src/main/java/com/becomedigitalapp/BecomeModule.kt), [`SingleFlight.kt`](android/app/src/main/java/com/becomedigitalapp/SingleFlight.kt) y [`BecomePackage.kt`](android/app/src/main/java/com/becomedigitalapp/BecomePackage.kt) al módulo Android de su app. Cambie la declaración `package` y las rutas en los tres archivos según su proyecto. `SingleFlight` impide que un callback repetido o tardío cierre otra solicitud.
2. Registre `BecomePackage()` en la lista de paquetes de React Native. [`MainApplication.kt`](android/app/src/main/java/com/becomedigitalapp/MainApplication.kt) muestra cómo agregarlo a `PackageList(this).packages`. Al estar dentro de la app y no en una librería React Native publicada, este módulo no se registra por autolinking.
3. Compruebe que `getName()` devuelve `BecomeModule`. El método `@ReactMethod iniciarBecomeSDK` recibe los parámetros y una `Promise`: resuelve con el resultado o rechaza con un código y mensaje.

Ambos bridges configuran DNI y pasaporte, sin logo personalizado. Son elecciones del demo y deben corresponder al flujo contratado por su app. La API JavaScript no expone todas las opciones de `BDIVConfig`: para agregar otras, actualice ambos bridges, el contrato TypeScript y las pruebas. La configuración avanzada de autenticación permanece en la SDK nativa.

### iOS

1. Incorpore [`BecomeModule.swift`](ios/BecomeDigitalApp/BecomeModule.swift) y [`BecomeModuleBridge.m`](ios/BecomeDigitalApp/BecomeModuleBridge.m) al target de su app en Xcode. Ambos archivos deben figurar en **Compile Sources**.
2. `@objc(BecomeModule)` en Swift y `RCT_EXTERN_MODULE(BecomeModule, NSObject)` en Objective-C deben conservar el mismo nombre que usa JavaScript. El archivo `.m` exporta el método; la lógica de la SDK permanece en Swift.
3. Compruebe que el target puede importar `BDIdentityVerification` y que la licencia está en el bundle. El bridge presenta la UI nativa y escucha `BDIVDelegate`.
4. Integre el ciclo de vida de escenas y el callback de sesiones de red en segundo plano descritos en la [guía iOS](ios/README_BECOME_IOS.md). No sustituya la lógica propia de su `AppDelegate`.

Después de agregar o cambiar archivos nativos, **vuelva a compilar la app**. Recargar Metro solo actualiza JavaScript y no registra un módulo nativo nuevo.

## Paso 3 Llamar al bridge desde React Native

Copie [`src/types/BecomeModule.ts`](src/types/BecomeModule.ts) a su app y ajuste la ruta del `import`. Además de los tipos, contiene validación en ejecución, comprobación del módulo, bloqueo de llamadas simultáneas, solicitud del permiso de cámara en Android y validación de la respuesta. En iOS el bridge solicita cámara de forma nativa. **No instala la SDK ni registra el bridge**: primero deben estar compilados los pasos nativos anteriores. No solicite almacenamiento externo para lanzar este flujo.

| Parámetro | Tipo | Uso |
| --- | --- | --- |
| `clientId` | `string` | Identificador entregado para su integración. |
| `clientSecret` | `string` | Secreto de la integración; no lo incluya en logs ni en el repositorio. |
| `contractId` | `string` | Contrato que utilizará la verificación. |
| `userId` | `string` | Identificador de su usuario o solicitud, elegido por su app. |
| `preventScreenCapture` | `boolean` opcional | Si se omite, ambas implementaciones usan `true`. |

Ejemplo de llamada desde una pantalla o servicio de su app. Los valores se obtienen de su propia configuración y del usuario actual; no son constantes para copiar:

```ts
import {Alert} from 'react-native';
import BecomeModule, {errorDeSDK} from './src/types/BecomeModule'; // Ajuste esta ruta.

async function iniciarVerificacion(
  clientId: string,
  clientSecret: string,
  contractId: string,
  userId: string,
) {
  try {
    const result = await BecomeModule.iniciarBecomeSDK({
      clientId,
      clientSecret,
      contractId,
      userId,
      preventScreenCapture: true,
    });

    if (result.status === 'SUCCES') {
      // Continúe con el resultado de verificación.
    } else if (result.status === 'PENDING') {
      // No trate PENDING como una verificación final.
    }
    return result;
  } catch (error) {
    const nativeError = errorDeSDK(error);
    Alert.alert(
      'No se pudo verificar',
      nativeError.code + ': ' + nativeError.message,
    );
    return null;
  }
}
```

La promesa resuelta contiene `status`, `message` y `userId`. El tipo compartido incluye `requestId?` y `responseURL?`, pero no debe depender de que ambos valores estén presentes. La SDK escribe el estado de éxito `SUCCES` (así, sin la segunda «s»); el bridge conserva ese valor. `PENDING` no significa identidad verificada.

Los cuatro parámetros de texto deben ser no vacíos; el adaptador elimina espacios en los extremos. `preventScreenCapture` debe ser booleano, no el texto `"false"`. Los estados desconocidos se rechazan como `INVALID_RESPONSE`, nunca como éxito. El bridge conserva el comportamiento de consulta y finalización de la SDK nativa; no implemente polling adicional suponiendo que `PENDING` es un resultado final.

La promesa rechazada proporciona `code` y `message`. Por ejemplo, `INVALID_PARAMS` indica campos obligatorios vacíos y `SDK_ERROR` propaga un error de la SDK. Android puede devolver `USER_CANCELLED`; el delegado de la SDK iOS no expone una cancelación independiente, por lo que no se debe asumir ese código en ambas plataformas.

### Ejemplo de un solo botón, sin formulario

[`examples/OneButtonExample.tsx`](examples/OneButtonExample.tsx) recibe las credenciales mediante props, genera un `userId` de prueba, bloquea doble pulsación y muestra resultado/error. En producción use un `userId` ligado a su usuario o solicitud y su propia estrategia de obtención de credenciales.

Si desea una precarga **solo local**, ejecute `npm run setup:local` y complete `config/credentials.local.json`. El comando crea un archivo vacío desde la plantilla y no reemplaza valores existentes. Para usarlo, importe el ejemplo y el archivo local en su propia pantalla:

```tsx
import OneButtonExample from './examples/OneButtonExample';
import credentials from './config/credentials.local.json';

// Dentro de un contenedor que respete el área segura:
<OneButtonExample credentials={credentials} />;
```

El demo principal no importa ese archivo: un clon limpio funciona sin configuración secreta. El archivo local está ignorado por Git, pero cualquier secreto importado queda dentro del bundle de la app; **ignorar un archivo no lo convierte en un almacén seguro**. No publique ese bundle ni incluya valores reales en la plantilla. Antes de compartir cambios revise `git diff --cached` y no registre credenciales ni respuestas completas con datos personales.

## Paso 4 Probar la integración

Compile e instale su app en un Android y un iPhone físicos. Confirme que el módulo existe antes de probar credenciales: si `NativeModules.BecomeModule` es `undefined`, revise el registro y vuelva a compilar la app nativa. Compruebe después permisos, apertura de la UI de la SDK, respuesta exitosa y errores. Muestre el `code` y `message` rechazados para que el usuario o soporte pueda diagnosticar el problema.

Revise la [guía de validación](docs/VALIDACION.md) para comandos, cobertura automatizada, pruebas manuales y limitaciones conocidas. Que la app compile o que el módulo esté registrado no demuestra que el contrato, el servicio remoto o todo el flujo biométrico funcionen.

## Problemas habituales

- **El módulo no aparece en JavaScript:** verifique `BecomePackage()` en Android o la pertenencia de ambos archivos del bridge al target iOS. Haga una compilación nativa nueva.
- **La SDK no abre:** revise licencias, enlace del AAR o XCFramework, permiso de cámara y una pantalla activa. La ausencia de licencia se rechaza como `MISSING_LICENSE_FILES` en ambas plataformas.
- **La promesa devuelve un error:** use su `code` y `message`; no sustituya el mensaje de la SDK por un error genérico ni registre `clientSecret`.

| Código | Qué revisar |
| --- | --- |
| `SDK_NOT_LINKED` | Registro del módulo/enlace nativo y recompilación. |
| `INVALID_PARAMS` | Los cuatro textos obligatorios y el tipo booleano de la opción. |
| `SDK_BUSY` | Hay un flujo abierto; espere su callback antes de reintentar. |
| `CAMERA_PERMISSION_DENIED` | Permiso de cámara en Ajustes de la app. |
| `MISSING_CAMERA_PERMISSION` | Declaración `NSCameraUsageDescription` en iOS. |
| `MISSING_LICENSE_FILES` | Recurso de licencia incluido en el APK/bundle. Su presencia no valida su vigencia. |
| `NO_ACTIVITY` / `NO_VIEW_CONTROLLER` | App visible y una pantalla válida para presentar la SDK. |
| `CONFIG_ERROR` / `CALLBACK_ERROR` / `START_AUTH_ERROR` | Configuración, registro del callback o inicio nativo Android. |
| `USER_CANCELLED` | Cancelación reportada por Android; permita volver a intentar. |
| `SDK_ERROR` | Error reportado por la SDK; muestre su mensaje sin volcar el payload completo a logs. |
| `INVALID_RESPONSE` | Respuesta o estado no reconocido; no dar por verificada la identidad. |

Para USB, firmas distintas, Metro y fallos de primera ejecución, consulte [solución de problemas](docs/SOLUCION_DE_PROBLEMAS.md). Las [versiones y artefactos](docs/ARTEFACTOS.md) permiten identificar qué SDK está integrada y qué debe revisar antes de redistribuirla.

Para errores propios de las dependencias y del flujo biométrico, siga las guías de integración de la SDK nativa enlazadas al inicio.
