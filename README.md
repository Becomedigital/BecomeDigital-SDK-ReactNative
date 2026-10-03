# Bridge React Native de Become Digital

Este repositorio contiene una app de demostración que invoca la SDK de Become Digital desde React Native mediante bridges nativos en Android e iOS. Explica cómo ejecutar el demo, llamar al bridge y observar su respuesta; la configuración detallada de cada SDK nativa está en sus guías de integración.

Las credenciales de prueba no forman parte del código fuente. Cada persona debe obtenerlas por un canal seguro antes de iniciar una verificación.

## Documentación de integración de la SDK

- Android: [Guía de integración Android](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-Android)
- iOS: [Guía de integración iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-iOS)
- Configuración de este proyecto iOS: [ios/README_BECOME_IOS.md](ios/README_BECOME_IOS.md)

## Entorno recomendado

Antes de ejecutar el proyecto, validar lo siguiente:

- Node.js 22.11 o superior (requisito de `package.json`); instalar las dependencias desde la raíz con `npm ci`
- Android Studio correctamente configurado para Android
- Xcode correctamente configurado para iOS
- Ruby/Bundler disponibles para instalar Pods en iOS

### Android

- Usar Java 17
- Configurar `JAVA_HOME` localmente en cada máquina
- No dejar una ruta fija de `org.gradle.java.home` dentro del proyecto, porque puede romper macOS, Linux o instalaciones distintas de Windows
- `android/local.properties` se incluye en el repositorio como archivo de ejemplo y cada desarrollador debe ajustarlo según su equipo

#### Android SDK local

La ubicación del Android SDK se configura en:

- `android/local.properties`

Ese archivo se incluye en el repositorio como ejemplo, pero cada desarrollador debe ajustar la ruta según su máquina antes de compilar Android.

Si prefieres no editarlo a mano, Android Studio puede regenerarlo localmente con la ruta correcta del SDK al abrir el proyecto Android.

Ejemplos de referencia:

#### Mac

```properties
sdk.dir=/Users/tu_usuario/Library/Android/sdk
```

#### Windows

```properties
sdk.dir=C:\\Users\\tu_usuario\\AppData\\Local\\Android\\Sdk
```

Si Android Studio está configurado correctamente, esta ruta puede consultarse desde el SDK Manager.

#### Nota para Windows

En Windows, `JAVA_HOME` debe apuntar a un JDK 17 válido o al JBR de Android Studio si ese es el JDK que usa el equipo.

Ejemplo habitual:

```sh
C:\Program Files\Android\Android Studio\jbr
```

La ruta exacta puede variar entre equipos, por eso no debe quedar hardcodeada en el repositorio.

### iOS

- Ejecutar `bundle install` si es la primera vez que se clona el proyecto
- Ejecutar `bundle exec pod install` dentro de la carpeta `ios` cuando cambien dependencias nativas
- Abrir y trabajar con el `.xcworkspace`, no con el `.xcodeproj`, después de instalar Pods

## Objetivo del bridge

El bridge permite que una pantalla React Native invoque funcionalidades nativas de la SDK sin depender directamente de los detalles internos de Android o iOS.

En ambas plataformas, el bridge se encarga de:

- recibir parámetros desde JavaScript
- construir la configuración nativa que necesita la SDK
- lanzar el flujo visual nativo
- escuchar la respuesta del SDK
- devolver el resultado a React Native mediante una promesa

## Estructura general

La integración está dividida en tres capas:

1. Capa React Native
   - Pantallas y lógica de UI que consumen el módulo nativo
2. Capa bridge
   - Módulos nativos Android/iOS expuestos a React Native
3. Capa SDK
   - La SDK de Become y sus dependencias nativas

Archivos compartidos del lado React Native:

- [src/types/BecomeModule.ts](src/types/BecomeModule.ts)
- [src/screens/BecomeSDKScreen.tsx](src/screens/BecomeSDKScreen.tsx)

## Bridge Android

### Archivos principales

- [android/app/src/main/java/com/becomedigitalapp/BecomeModule.kt](android/app/src/main/java/com/becomedigitalapp/BecomeModule.kt)
- [android/app/src/main/java/com/becomedigitalapp/BecomePackage.kt](android/app/src/main/java/com/becomedigitalapp/BecomePackage.kt)
- [android/app/src/main/java/com/becomedigitalapp/MainApplication.kt](android/app/src/main/java/com/becomedigitalapp/MainApplication.kt)

### Cómo está construido

#### 1. Módulo nativo

`BecomeModule.kt` es el punto de entrada del bridge en Android.

Sus responsabilidades son:

- recibir el `ReadableMap` enviado desde JavaScript
- leer `clientId`, `clientSecret`, `contractId`, `userId` y la protección opcional de pantalla
- construir la configuración nativa del SDK
- iniciar el flujo del SDK usando la `Activity` actual
- escuchar la respuesta del SDK mediante callback
- resolver o rechazar la promesa devuelta a React Native

#### 2. Registro del módulo

`BecomePackage.kt` implementa `ReactPackage` y registra el módulo nativo manual.

Esto permite que React Native descubra el bridge durante la inicialización de la app.

#### 3. Registro en la aplicación

`MainApplication.kt` agrega `BecomePackage()` a la lista creada por `PackageList(this).packages`.

Este paso es obligatorio porque el módulo fue creado manualmente dentro del proyecto y no proviene de autolinking de una librería NPM.

#### 4. Consumo desde React Native

`src/types/BecomeModule.ts` expone una API simple hacia el resto de la app:

- `iniciarBecomeSDK(params)`

La pantalla React Native no llama directamente a clases nativas de Android. Solo interactúa con este contrato TS.

### Flujo resumido

1. React Native llama `BecomeModule.iniciarBecomeSDK(params)`.
2. El bridge enruta la llamada a `BecomeModule.kt`.
3. Android construye la configuración nativa.
4. El SDK abre su UI nativa.
5. El callback devuelve el resultado.
6. El bridge resuelve o rechaza la promesa hacia JS.

### Configuración de la SDK Android

La configuración de la SDK de Android, dependencias, permisos y troubleshooting no se documentan aquí. Consultar la guía específica de Android:

- [Guía de integración Android](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-Android)

## Bridge iOS

### Archivos principales

- [ios/BecomeDigitalApp/BecomeModule.swift](ios/BecomeDigitalApp/BecomeModule.swift)
- [ios/BecomeDigitalApp/BecomeModuleBridge.m](ios/BecomeDigitalApp/BecomeModuleBridge.m)

### Cómo está construido

#### 1. Módulo nativo

`BecomeModule.swift` es el punto de entrada del bridge en iOS.

Sus responsabilidades son:

- recibir parámetros desde JavaScript
- validar que existan los datos mínimos requeridos
- construir `BDIVConfig`
- crear la instancia del SDK nativo
- iniciar `startVerification()`
- escuchar la respuesta por medio de `BDIVDelegate`
- resolver o rechazar la promesa devuelta a React Native

#### 2. Exposición del módulo a React Native

`BecomeModuleBridge.m` usa `RCT_EXTERN_MODULE` para exponer el módulo Swift al runtime de React Native.

Este archivo no contiene lógica de negocio. Solo declara la interfaz visible desde JavaScript.

#### 3. Consumo desde React Native

El mismo archivo compartido:

- [src/types/BecomeModule.ts](src/types/BecomeModule.ts)

se usa para consumir el bridge iOS desde la app React Native.

### Flujo resumido

1. React Native llama `BecomeModule.iniciarBecomeSDK(params)`.
2. El bridge enruta la llamada a `BecomeModule.swift`.
3. iOS valida parámetros y contexto mínimo.
4. Swift construye `BDIVConfig`.
5. El SDK abre su UI nativa.
6. `BDIVDelegate` devuelve el resultado.
7. El bridge resuelve o rechaza la promesa hacia JS.

### Configuración de la SDK iOS

La integración de la SDK de iOS, paquetes SPM, permisos, licencias y configuración del framework no se documentan aquí. Consultar la guía específica de iOS:

- [Guía de integración iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutDirectPro-iOS)

## Contrato compartido en React Native

El contrato común entre Android, iOS y la app React Native está en:

- [src/types/BecomeModule.ts](src/types/BecomeModule.ts)

Ese archivo define:

- parámetros de entrada
- forma de la respuesta
- nombre del módulo consumido desde `NativeModules`

Esto permite que la pantalla React Native use una única interfaz sin preocuparse por la implementación específica de cada plataforma.

`iniciarBecomeSDK(params)` recibe `clientId`, `clientSecret`, `contractId` y `userId` como cadenas obligatorias. La opción `preventScreenCapture` es booleana y, si se omite, ambas plataformas la tratan como `true`. La pantalla demo genera un `userId` nuevo en cada intento.

Ejemplo de llamada desde la app (obtener las credenciales fuera del código fuente):

```ts
import BecomeModule from './src/types/BecomeModule';

const result = await BecomeModule.iniciarBecomeSDK({
  clientId,
  clientSecret,
  contractId,
  userId: `user-${Date.now()}`,
  preventScreenCapture: true,
});
```

La promesa resuelta entrega `status`, `message` y `userId`; `requestId` y `responseURL` son opcionales y pueden no estar disponibles según la plataforma y la respuesta de la SDK. Un rechazo entrega `code` y `message`. Por ejemplo, ambas plataformas pueden devolver `INVALID_PARAMS` o `SDK_ERROR`; Android también devuelve `USER_CANCELLED` cuando recibe una cancelación explícita. El demo muestra el código y el mensaje devueltos en el campo seleccionable «Error devuelto por la SDK».

El valor de éxito de la SDK se escribe `SUCCES` (sin la segunda *s*); se conserva así en `status` para no alterar el contrato nativo.

### Protección de capturas de pantalla

`iniciarBecomeSDK` acepta `preventScreenCapture?: boolean` en ambas plataformas. El valor predeterminado es `true`; al enviarlo en `false`, la SDK permite capturas y grabaciones durante el flujo. La pantalla demo usa `false` para facilitar las pruebas manuales, igual que los demos nativos.

En Android, `android/app/src/main/res/values/become_config.xml` fija en `180` segundos el timeout de conexión, lectura y escritura recomendado por la SDK. Este timeout de red es independiente del timeout de polling de resultados.

## Recomendaciones para extender el bridge

- Mantener la API JS simple y estable.
- No mezclar lógica de negocio dentro del bridge.
- Centralizar validaciones nativas antes de abrir la SDK.
- Devolver errores claros y consistentes a React Native.
- Documentar por separado la integración del SDK y la construcción del bridge.

## Ejecución del proyecto

Todos los comandos de ejecución de React Native deben lanzarse desde la raíz del proyecto:

- `BecomeDigital-SDK-ReactNative/`

Instalar las dependencias JavaScript antes de abrir el proyecto nativo:

```sh
npm ci
```

### Metro

```sh
npm start
```

### Android

Para correr en un dispositivo físico:

1. Conectar el dispositivo por USB
2. Activar `Opciones de desarrollador`
3. Activar `Depuración por USB`
4. Verificar que ADB lo detecte:

```sh
adb devices
```

Si solo hay un dispositivo conectado, puedes ejecutar:

```sh
npm run android
```

Si hay más de un dispositivo o emulador conectado, ejecutar con el `deviceId`:

```sh
npx react-native run-android --deviceId TU_DEVICE_ID
```

### iOS

Si es la primera vez o cambiaron dependencias nativas:

```sh
bundle install
cd ios
bundle exec pod install
```

Luego:

```sh
cd ..
npm run ios
```

Para correr en un dispositivo físico:

1. Conectar el iPhone por cable
2. Confiar en el computador desde el dispositivo
3. Abrir el proyecto iOS si necesitas validar firma o equipo:
   - `ios/BecomeDigitalApp.xcworkspace`
4. Ejecutar con React Native indicando el dispositivo:

```sh
npx react-native run-ios --device
```

Si tienes más de un dispositivo disponible, puedes indicar el nombre:

```sh
npx react-native run-ios --device "Nombre del iPhone"
```

## Uso del demo y pruebas manuales

1. Ingresar las credenciales de **testing** en `Client ID`, `Client Secret` y `Contract ID`. El botón «Iniciar Verificación» permanece deshabilitado mientras falte algún campo.
2. Pulsar «Iniciar Verificación» y completar el flujo en la UI nativa de la SDK. El demo solicita cámara en Android antes de llamar al bridge; iOS solicita los permisos mediante la configuración nativa de la SDK.
3. Revisar el resultado en la pantalla React Native. Si la promesa se rechaza, copiar el código y mensaje del campo «Error devuelto por la SDK» para el diagnóstico.

«Guardar Testing» conserva los tres campos en `AsyncStorage` **solo en la instalación local**; «Cargar Testing» los recupera y el demo intenta cargarlos al abrirse. Este almacenamiento no es un gestor seguro de secretos: usar únicamente credenciales de prueba, no incluirlas en archivos versionados ni en capturas/logs, y borrar los datos de la app de pruebas cuando ya no se necesiten. La app instalada desde el código del repositorio inicia con los campos vacíos si no hay un perfil guardado.

En iOS, el contenedor del demo aplica el inset superior e inferior de la ventana para respetar la zona segura del dispositivo. El valor `preventScreenCapture` se establece en `false` únicamente en esta pantalla de demostración, para facilitar la observación del flujo; una app integradora debe decidir explícitamente su política de capturas.

Validación de referencia del 2 de octubre de 2026: el demo se ejecutó en un Xiaomi físico con Android y en un iPhone 11 físico. En Android se observó el callback `SUCCES`; la prueba manual de iPhone fue confirmada por el usuario. Repetir estas comprobaciones tras actualizar la SDK o las dependencias nativas.
