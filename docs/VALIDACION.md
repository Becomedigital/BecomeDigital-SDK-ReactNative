# Validación del bridge

## Capas de validación

| Capa | Qué demuestra | Qué no demuestra |
| --- | --- | --- |
| TypeScript, lint y Jest | Contrato JS, validación, estados, permiso, errores y doble pulsación con mocks. | Registro nativo real, licencia ni servicio remoto. |
| JUnit Android | Una solicitud activa y descarte de callbacks repetidos/tardíos. | Apertura de la cámara o validez de credenciales. |
| Compilaciones nativas | Enlace y compatibilidad de código/dependencias para la arquitectura compilada. | Funcionamiento completo en un dispositivo. |
| Instrumentación / XCTest | Registro del módulo, validación nativa y apertura desde el botón real, según la prueba. | Verificación biométrica completa ni resultado del backend. |
| Prueba manual física | Permisos, UI, captura y resultado del flujo con un contrato autorizado. | Todas las versiones de SO, dispositivos o contratos. |

## Comprobaciones sin dispositivo

Desde la raíz:

```sh
npm ci
npm run check
```

`check` ejecuta TypeScript, ESLint y Jest. Los tests cubren módulo ausente, parámetros inválidos, captura protegida por defecto, cámara denegada y reintento, exclusión de permisos de almacenamiento, error nativo, respuesta desconocida, `PENDING` diferenciado, campo de error y pulsaciones repetidas.

Con Java 17 y el Android SDK configurados:

```sh
cd android
./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleRelease :app:assembleAndroidTest -PreactNativeArchitectures=arm64-v8a
```

El ejemplo anterior comprueba ARM64, no todas las ABI. Los tests JUnit están en `app/src/test`; las pruebas de validación nativa y UI están en `app/src/androidTest`. Compilar `assembleAndroidTest` **no ejecuta** estas últimas. Los reportes JUnit quedan en `app/build/reports/tests/testDebugUnitTest/`.

Para iOS, después de instalar Pods, desde la raíz:

```sh
xcodebuild -workspace ios/BecomeDigitalApp.xcworkspace \
  -scheme BecomeDigitalApp -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath ios/DerivedData \
  CODE_SIGNING_ALLOWED=NO build-for-testing
```

Este comando compila app y tests sin firma ni instalación. No certifica una ejecución en iPhone. El target de pruebas ya está registrado; `bundle exec ruby scripts/configure-ios-tests.rb` permite regenerar su registro en este demo, no debe ejecutarse indiscriminadamente sobre el proyecto de un cliente.

## Pruebas en dispositivos físicos

Use un dispositivo de pruebas desbloqueado y con las autorizaciones USB/desarrollo correspondientes. Antes de instalar, confirme la firma: un APK con firma distinta puede requerir desinstalar la app anterior y perder su perfil local. No desinstale automáticamente.

### Android

Para la prueba UI, inicie Metro de este repositorio y configure el reverse USB. Instale/abra el demo, complete las credenciales manualmente y pulse «Guardar Testing». Termine cualquier flujo previo de la SDK y deje el formulario listo. No pase secretos como argumentos de Gradle, ADB o del runner.

```sh
cd android
ANDROID_SERIAL=SERIAL ./gradlew :app:connectedDebugAndroidTest -PreactNativeArchitectures=arm64-v8a
```

`BecomeModuleValidationTest` comprueba rechazo de parámetros y falta de Activity. `BecomeBridgeDeviceTest` pulsa el botón JavaScript, acepta cámara si aparece el diálogo y espera la introducción de la SDK. Si falta el perfil, esa prueba se marca **omitida**. Se detiene antes de capturar documentos o rostros. El texto esperado de la introducción puede requerir actualización si la SDK cambia su localización.

### iOS

Configure la firma del target app **y** del target `BecomeDigitalAppUITests`. Instale el demo con esa misma identidad, guarde un perfil Testing autorizado y deje el iPhone desbloqueado. Desde Xcode use **Product → Test**, o desde la raíz:

El target de UI tests requiere iOS 17 o superior, acorde con XCTest de Xcode 27. El mínimo del target de la app sigue siendo iOS 15.6; los dispositivos anteriores al mínimo del runner requieren otra estrategia de pruebas compatible.

```sh
xcodebuild -workspace ios/BecomeDigitalApp.xcworkspace \
  -scheme BecomeDigitalApp -configuration Release \
  -destination 'platform=iOS,id=UDID_DEL_IPHONE' \
  -derivedDataPath ios/DerivedData test
```

`testDemoExposesBridge` comprueba UI y módulo disponible. `testButtonOpensNativeSDKFromPreparedProfile` usa el botón y comprueba la introducción; se omite explícitamente si no hay perfil. No introduzca credenciales como argumentos de XCTest. Los reportes de UI pueden contener capturas automáticas del sistema: revíselos antes de compartirlos.

### Lista manual para ambas plataformas

1. Clon/configuración sin secretos: la pantalla inicia vacía y respeta notch, barra de estado y teclado.
2. Bridge conectado; el botón queda deshabilitado sin credenciales completas.
3. Denegar cámara: se muestra un error y se puede reintentar tras habilitarla en Ajustes.
4. Con licencia/contrato autorizados, pulsar el botón abre la introducción de la SDK. Doble pulsación no abre un segundo flujo.
5. Completar captura documental y biométrica manualmente; comprobar los callbacks y distinguir `SUCCES`, `PENDING` y error.
6. Cancelar/cerrar con los controles disponibles: comprobar el comportamiento real de cada SDK y el reintento. iOS no expone un callback de cancelación independiente en `BDIVDelegate`.
7. Repetir tras error de servicio/red, cambio de orientación si está soportado, ida a segundo plano y retorno. No añadir polling ni desbloquear otra sesión mientras la SDK siga activa.
8. Comprobar también Release sin Metro. Revisar que no se publican credenciales, respuestas con datos personales ni llaves de distribución.

## Registro de esta actualización

Validación local del 6 de octubre de 2026, rama `feature/react-native-bridge-stabilization`, antes de commit:

- TypeScript y ESLint: correctos. Jest: 22 pruebas aprobadas.
- Android ARM64: Debug y Release compilados. JUnit: 2 pruebas aprobadas. APK de instrumentación compilado; las pruebas instrumentadas no se ejecutaron en dispositivo en esta revisión.
- iOS ARM64: CocoaPods instalado y `build-for-testing` de app y UI tests correcto en Release con Xcode 27.0, sin firma ni instalación. Las pruebas XCTest no se ejecutaron en dispositivo.
- Se reparó una caché local de Swift Package Manager restaurando el archivo de objetos faltante de `aws-sdk-swift` desde una copia válida; no fue necesario alterar el código de esa dependencia ni borrar cachés compartidas.
- No se instaló esta revisión en los teléfonos ni se realizó una nueva verificación biométrica física. Las pruebas anteriores del proyecto `Become` no certifican automáticamente esta rama.
- Se conservan como incidencias de la SDK las observaciones de ANR inicial Android y clases AWS/Amplify duplicadas en iOS; consulte [solución de problemas](SOLUCION_DE_PROBLEMAS.md).

Los logs locales se guardan en `artifacts/`, ignorado por Git. Una prueba omitida o una compilación correcta no debe reportarse como un flujo físico validado.
