# Solución de problemas de integración

Identifique primero dónde falla: instalación del APK/app, carga de JavaScript, registro del módulo o flujo de la SDK. No son la misma capa.

## Android: conexión e instalación

Ejecute `adb devices -l`. Si aparece `unauthorized`, desbloquee el teléfono y acepte su huella RSA. Si hay varios dispositivos, use `adb -s SERIAL` y `npm run android -- --device SERIAL` para seleccionar uno explícitamente.

En Xiaomi, `INSTALL_FAILED_USER_RESTRICTED` suele corresponder a restricciones de instalación por USB. Revise las opciones de desarrollador y confirme el diálogo de instalación. Los errores de `INJECT_EVENTS` durante automatización son distintos: revise la opción de depuración USB de seguridad y la política del dispositivo. No desactive protecciones ni cambie políticas corporativas indiscriminadamente; la prueba manual puede seguir funcionando aunque la automatizada no tenga permiso.

### `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

Ya existe una app con el mismo `applicationId`, firmada con otra llave. Dos proyectos de demo pueden compartir `com.becomedigitalapp` y aun así tener firmas distintas.

Opciones: compilar con la misma firma de desarrollo autorizada o desinstalar la instalación anterior. **Desinstalar elimina datos y el perfil Testing local**. Solo si acepta perderlos:

```sh
adb -s SERIAL uninstall com.becomedigitalapp
npm run android -- --device SERIAL
```

No se realiza una desinstalación automática. Tampoco cambie el `applicationId` para evitar el conflicto sin confirmar que la licencia de la SDK permite el nuevo identificador. El demo no incluye una llave de distribución: usa la firma debug local del Android SDK incluso en Release.

## Metro: pantalla roja, bundle ausente o proyecto equivocado

1. Ejecute `npm start` desde la raíz de **este** repositorio. Compruebe si otro Metro ya ocupa el puerto 8081 (`lsof -nP -iTCP:8081 -sTCP:LISTEN` en macOS). No conecte una app al bundle de otro proyecto aunque los nombres sean parecidos.
2. Android por USB: `adb -s SERIAL reverse tcp:8081 tcp:8081`. Verifique con `adb -s SERIAL reverse --list` y recargue la app.
3. Si necesita dos proyectos a la vez, use un puerto distinto en ambos lados: `npm start -- --port 8082`, `adb -s SERIAL reverse tcp:8082 tcp:8082` y `npm run android -- --device SERIAL --port 8082`.
4. Si Metro usa este proyecto pero conserva transformaciones antiguas, deténgalo y ejecute `npm start -- --reset-cache`. Esto no recompila el bridge nativo.
5. En un iPhone, compruebe la dirección del servidor y la conectividad local entre Mac y teléfono. Para aislar problemas de Metro, compile Release desde Xcode.

`metro.config.js`, `.watchmanconfig`, Jest y TypeScript excluyen los artefactos del proyecto y sus dependencias generadas. No elimine directorios completos de usuario para resolver un error de caché.

## iOS: instalación de dependencias

Use Ruby >= 3.2.2 y ejecute `bundle exec pod install`, no un `pod` global de otra versión. Compruebe `ruby --version` y `bundle exec pod --version` antes de cambiar la configuración del equipo.

Si Swift Package Manager informa `not a tree object` o un objeto ausente del índice Git, es un problema del repositorio descargado, no de las credenciales ni del bridge. Identifique el paquete en el log y repare o vuelva a descargar únicamente su caché dañada. No cambie las versiones para ocultar esa corrupción ni elimine todas las cachés compartidas sin revisar el alcance. `-skipPackageUpdates` puede evitar una actualización innecesaria cuando los objetos requeridos ya existen; no repara objetos faltantes.

## La SDK no se presenta

- Si el indicador del demo dice que falta el bridge, revise el registro nativo y recompile; credenciales distintas no reparan un módulo ausente.
- Si el código es `MISSING_LICENSE_FILES`, revise los recursos del APK/bundle. Una licencia presente puede seguir siendo inválida para el contrato o identificador de la app.
- Si es `CAMERA_PERMISSION_DENIED`, habilite cámara en Ajustes y reintente. No hace falta permiso de almacenamiento externo para esta llamada del bridge.
- Con `SDK_BUSY`, termine el flujo activo. No agregue un timeout que desbloquee el botón mientras la SDK siga visible: permitiría abrir dos sesiones.
- Con `NO_ACTIVITY` o `NO_VIEW_CONTROLLER`, vuelva a una pantalla activa de la app antes de iniciar.
- Si la SDK devuelve `PENDING`, muéstrelo como pendiente. No muestre un éxito definitivo.

## Incidencias que pertenecen a la SDK nativa

En pruebas exploratorias del proyecto de integración se observó un ANR Android de primera ejecución, asociado a inicialización SQLite del catálogo de países en el hilo principal de la SDK. No se ha certificado su corrección para todos los dispositivos. Si lo reproduce, registre versión/hash del AAR, modelo, Android, pasos y un informe ANR sanitizado para el proveedor. No mueva `startAuthentication` a un hilo de fondo: la presentación de UI debe permanecer en el hilo principal.

En iOS se han observado clases Amplify/AWS duplicadas entre el XCFramework y los paquetes enlazados. La configuración evita añadir productos directos innecesarios, pero la corrección de un binario que incorpora copias sigue siendo responsabilidad de su empaquetado. No interprete la ausencia de un error de compilación como solución definitiva.

No adjunte credenciales, documentos, imágenes faciales ni respuestas completas a una incidencia pública. Los logs de validación se guardan localmente en `artifacts/`, ignorado por Git, y deben revisarse antes de compartirlos.
