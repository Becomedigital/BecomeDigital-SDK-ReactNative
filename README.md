# Integrar la SDK de Become Digital en React Native

La SDK de Become Digital funciona de forma nativa en Android e iOS. Una app React Native no puede llamarla directamente desde JavaScript: necesita un **bridge** en cada plataforma. Este repositorio es una app de ejemplo con esos bridges implementados; no es un paquete NPM que se instale automáticamente en otra app.

Esta guía explica qué piezas trasladar a su proyecto, cómo conectarlas y cómo manejar la respuesta. Para las dependencias y licencias de la SDK nativa, consulte también las [instrucciones de Android](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-Android) y las [instrucciones de iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-iOS).

## Antes de comenzar

- Necesita una app React Native con proyectos nativos `android/` e `ios/` y acceso a sus compilaciones.
- Solicite a Become Digital la SDK, las licencias y las credenciales correspondientes a su integración. No copie credenciales de prueba al código ni registre `clientSecret` en logs.
- Este ejemplo usa React Native 0.84.1, Node.js 22.11 o superior, Java 17 y `minSdkVersion` 24 en Android, e iOS 15.6 como deployment target del target principal. Si su app usa otras versiones, valide la compatibilidad de sus dependencias nativas antes de trasladar la configuración.

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

1. Incorpore [`BecomeModule.kt`](android/app/src/main/java/com/becomedigitalapp/BecomeModule.kt) y [`BecomePackage.kt`](android/app/src/main/java/com/becomedigitalapp/BecomePackage.kt) al módulo Android de su app. Cambie la declaración `package` y las rutas según su proyecto.
2. Registre `BecomePackage()` en la lista de paquetes de React Native. [`MainApplication.kt`](android/app/src/main/java/com/becomedigitalapp/MainApplication.kt) muestra cómo agregarlo a `PackageList(this).packages`. Al estar dentro de la app y no en una librería React Native publicada, este módulo no se registra por autolinking.
3. Compruebe que `getName()` devuelve `BecomeModule`. El método `@ReactMethod iniciarBecomeSDK` recibe los parámetros y una `Promise`: resuelve con el resultado o rechaza con un código y mensaje.

Antes de usar el módulo en su producto, revise los tipos de documento y las demás opciones con las que `BecomeModule.kt` construye `BDIVConfig`; son elecciones del demo y deben corresponder al flujo contratado por su app.

### iOS

1. Incorpore [`BecomeModule.swift`](ios/BecomeDigitalApp/BecomeModule.swift) y [`BecomeModuleBridge.m`](ios/BecomeDigitalApp/BecomeModuleBridge.m) al target de su app en Xcode. Ambos archivos deben figurar en **Compile Sources**.
2. `@objc(BecomeModule)` en Swift y `RCT_EXTERN_MODULE(BecomeModule, NSObject)` en Objective-C deben conservar el mismo nombre que usa JavaScript. El archivo `.m` exporta el método; la lógica de la SDK permanece en Swift.
3. Compruebe que el target puede importar `BDIdentityVerification` y que la licencia está en el bundle. El bridge presenta la UI nativa y escucha `BDIVDelegate`.

Después de agregar o cambiar archivos nativos, **vuelva a compilar la app**. Recargar Metro solo actualiza JavaScript y no registra un módulo nativo nuevo.

## Paso 3 Llamar al bridge desde React Native

Puede usar [`src/types/BecomeModule.ts`](src/types/BecomeModule.ts) como envoltorio de `NativeModules.BecomeModule`. Copie el archivo a su app y ajuste la ruta del `import`; la [pantalla demo](src/screens/BecomeSDKScreen.tsx) muestra una implementación completa de UI. El archivo TypeScript solo describe la API: **no instala la SDK ni registra el bridge**. Para que la llamada funcione, los pasos nativos anteriores deben estar compilados en la app.

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
import BecomeModule from './src/types/BecomeModule'; // Ajuste esta ruta.

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
    const nativeError = error as {code?: string; message?: string};
    Alert.alert(
      'No se pudo verificar',
      (nativeError.code ?? 'SDK_ERROR') + ': ' + (nativeError.message ?? 'Sin detalle'),
    );
    return null;
  }
}
```

La promesa resuelta contiene `status`, `message` y `userId`. El tipo compartido incluye `requestId?` y `responseURL?`, pero no debe depender de que ambos valores estén presentes. La SDK escribe el estado de éxito `SUCCES` (así, sin la segunda «s»); el bridge conserva ese valor. `PENDING` no significa identidad verificada.

La promesa rechazada proporciona `code` y `message`. Por ejemplo, `INVALID_PARAMS` indica campos obligatorios vacíos y `SDK_ERROR` propaga un error de la SDK. Android puede devolver `USER_CANCELLED`; el delegado de la SDK iOS no expone una cancelación independiente, por lo que no se debe asumir ese código en ambas plataformas.

## Paso 4 Probar la integración

Compile e instale su app en un Android y un iPhone físicos. Confirme que el módulo existe antes de probar credenciales: si `NativeModules.BecomeModule` es `undefined`, revise el registro y vuelva a compilar la app nativa. Compruebe después permisos, apertura de la UI de la SDK, respuesta exitosa y errores. Muestre el `code` y `message` rechazados para que el usuario o soporte pueda diagnosticar el problema.

El demo de este repositorio sirve como referencia ejecutable. Desde su raíz, instale dependencias con `npm ci` y arranque Metro con `npm start`. En Android, verifique `adb devices` y ejecute `npm run android`. En iOS, ejecute `bundle install`, luego `bundle exec pod install` dentro de `ios/`, abra `ios/BecomeDigitalApp.xcworkspace` para configurar la firma y ejecute la app desde Xcode o con `npx react-native run-ios --device "Nombre del iPhone"`.

El formulario del demo inicia sin credenciales precargadas. Sus botones «Guardar Testing» y «Cargar Testing» usan `AsyncStorage` local para pruebas; **no son un mecanismo de almacenamiento seguro para secretos de producción**. La pantalla usa `preventScreenCapture: false` para facilitar las pruebas y muestra los errores de la SDK en un campo seleccionable. En su app, mantenga la protección de capturas acorde con su política de seguridad y diseñe su propia gestión de credenciales.

## Problemas habituales

- **El módulo no aparece en JavaScript:** verifique `BecomePackage()` en Android o la pertenencia de ambos archivos del bridge al target iOS. Haga una compilación nativa nueva.
- **La SDK no abre:** revise licencias, enlace del AAR o XCFramework, permisos y un contexto de pantalla activo. En iOS el bridge puede devolver `MISSING_LICENSE_FILES`, `MISSING_CAMERA_PERMISSION`, `SDK_NOT_LINKED` o `NO_VIEW_CONTROLLER`. En Android la ausencia de la licencia se registra en el log nativo del ejemplo.
- **La promesa devuelve un error:** use su `code` y `message`; no sustituya el mensaje de la SDK por un error genérico ni registre `clientSecret`.

Para errores propios de las dependencias y del flujo biométrico, siga las guías de integración de la SDK nativa enlazadas al inicio.
