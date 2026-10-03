# Integración iOS del bridge React Native de Become Digital

El target `BecomeDigitalApp` ya contiene la SDK nativa, sus recursos y el módulo que expone `BecomeModule.iniciarBecomeSDK(params)` a React Native. Esta guía describe cómo reproducir esa configuración y probarla en un iPhone físico; no es necesario volver a agregar manualmente las dependencias si el proyecto clonado está intacto.

## Configuración incluida

- `BecomeModule.swift` construye `BDIVConfig`, presenta el flujo nativo y convierte las respuestas de `BDIVDelegate` en una promesa de React Native. `BecomeModuleBridge.m` exporta el método Swift mediante `RCT_EXTERN_MODULE`.
- `BecomeDigitalApp/Frameworks/BDIdentityVerification.xcframework` está enlazado con **Embed & Sign** y contiene slices para dispositivo (`ios-arm64`) y simulador (`ios-arm64_x86_64-simulator`).
- `com.become.document.key.txt` forma parte de los recursos del target. El bridge rechaza la llamada con `MISSING_LICENSE_FILES` si no lo encuentra en el bundle.
- `Info.plist` declara `NSCameraUsageDescription` y `NSMicrophoneUsageDescription`. El proyecto usa firma de desarrollo para instalarse en un iPhone físico; cada equipo debe seleccionar una identidad y un equipo de firma válidos en Xcode.
- `Podfile` instala React Native y alinea el deployment target de los Pods con el mínimo admitido por esta versión de React Native.

El proyecto Xcode declara estas versiones mínimas de Swift Package Manager: `amplify-swift` 2.45.4, `amplify-ui-swift-liveness` 1.4.4, `capture-core-sp` 1.4.3 y `capture-ux-sp` 1.4.3. Las versiones efectivamente resueltas se consultan en `BecomeDigitalApp.xcworkspace/xcshareddata/swiftpm/Package.resolved`; pueden ser superiores a los mínimos del proyecto.

## Preparación y ejecución en iPhone

Desde la raíz del repositorio:

```sh
npm ci
bundle install
cd ios
bundle exec pod install
```

Abrir `BecomeDigitalApp.xcworkspace` en Xcode, verificar la firma del target `BecomeDigitalApp`, conectar y confiar en el iPhone y seleccionar ese dispositivo como destino. Después, ejecutar desde Xcode o volver a la raíz y usar:

```sh
npx react-native run-ios --device "Nombre del iPhone"
```

Para una compilación Release de dispositivo, Xcode incluye el bundle de JavaScript en la app; una compilación Debug necesita Metro accesible desde el iPhone. El simulador sirve para comprobar compilación y UI, pero la cámara y la biometría deben validarse en un dispositivo físico.

## Contrato y diagnóstico

El método recibe `clientId`, `clientSecret`, `contractId` y `userId`; `preventScreenCapture` es opcional y vale `true` si se omite. La pantalla demo envía `false` para facilitar las pruebas manuales. No hay credenciales de testing incorporadas al código: deben introducirse en el formulario o cargarse desde un perfil guardado localmente por el usuario.

El bridge resuelve la promesa con `status`, `message` y `userId` cuando la SDK devuelve `SUCCES` o `PENDING`. Rechaza con `SDK_ERROR` cuando recibe `ERROR`, `NOFOUND` o el callback de error. También puede rechazar antes de abrir la SDK por parámetros inválidos, archivo de licencia o declaración `NSCameraUsageDescription` faltante, ausencia de controlador visible, SDK no enlazada o una verificación ya en curso. El demo muestra el código y mensaje de rechazo en «Error devuelto por la SDK».

`BDIVDelegate` expone callbacks de éxito y error, pero no uno de cancelación independiente. Por ello, no se debe asumir que iOS devuelve el código Android `USER_CANCELLED`. Para el contrato compartido y las instrucciones del demo, consultar el [README principal](../README.md).

El flujo fue probado manualmente en un iPhone 11 físico el 2 de octubre de 2026. Repetir la prueba tras cambiar el XCFramework, los paquetes Swift o el bridge.
