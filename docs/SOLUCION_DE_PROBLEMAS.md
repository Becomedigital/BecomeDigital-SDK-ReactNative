# Solución de problemas de integración

Identifique si el problema ocurre en la instalación, Metro, el registro del bridge, la licencia, los tokens o la verificación.

## Android: conexión e instalación

Ejecute `adb devices -l`. Si aparece `unauthorized`, desbloquee el teléfono y acepte la autorización USB. Con varios dispositivos use `adb -s SERIAL` y `npm run android -- --device SERIAL`.

En Xiaomi, `INSTALL_FAILED_USER_RESTRICTED` puede indicar una restricción de instalación por USB. Revise las opciones de desarrollador y confirme el diálogo del teléfono.

Si aparece `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, ya existe una app con el mismo identificador y otra firma. Puede compilar con la misma firma de desarrollo o desinstalar la anterior si acepta perder sus datos. No cambie el identificador para evitar el conflicto sin confirmar la licencia autorizada.

## Metro o módulo ausente

1. Ejecute `npm start` desde este proyecto. Compruebe el puerto 8081 con `lsof -nP -iTCP:8081 -sTCP:LISTEN`.
2. Android por USB: ejecute `adb -s SERIAL reverse tcp:8081 tcp:8081`.
3. Si Metro conserva transformaciones antiguas, deténgalo y ejecute `npm start -- --reset-cache`.
4. Si el bridge no aparece, revise el registro de `BecomePackage()` en Android y la pertenencia de ambos archivos del bridge al target iOS. Vuelva a compilar la app nativa.
5. En iOS abra el `.xcworkspace` y compruebe la conectividad entre el iPhone y Metro. Release incorpora su propio JavaScript.

## Dependencias nativas

Android debe resolver `ai.becomedigital:identity-verification:3.5.1` desde Maven Central. No agregue el AAR local ni las dependencias de captura anteriores al mismo tiempo.

iOS debe resolver el paquete Become **5.3.2** con Xcode compatible con Swift 6.4 y el producto `BDIdentityVerification` enlazado. Retire las referencias previas al XCFramework local y productos de captura que ya no utiliza. Siga las [versiones de referencia](ARTEFACTOS.md) y las guías nativas enlazadas allí.

Si CocoaPods falla, compruebe Ruby 3.2.2 o posterior y use `bundle exec pod install`. Si SPM informa un objeto Git ausente, identifique el paquete afectado y repare únicamente su descarga; no cambie versiones para ocultar el problema.

Si movió el proyecto y el empaquetado informa que no encuentra `hermesc`, revise `HERMES_CLI_PATH`. El demo lo resuelve en `ios/.xcode.env` desde la ubicación actual de los Pods; no copie una ruta absoluta de otro equipo. Revise también cualquier configuración local que reemplace ese valor.

## Licencia, cámara o pantalla activa

| Código | Qué revisar |
| --- | --- |
| `MISSING_LICENSE_FILES` | `com.become.blinkid.key` en los assets Android o `com.become.blinkid.key.txt` en el bundle iOS. |
| `CAMERA_PERMISSION_DENIED` | Permiso de cámara en Ajustes de la app. |
| `MISSING_CAMERA_PERMISSION` | `NSCameraUsageDescription` en `Info.plist`. |
| `SDK_BUSY` | Termine el flujo activo antes de iniciar otro. |
| `NO_ACTIVITY` / `NO_VIEW_CONTROLLER` | App visible con una pantalla válida para presentar la SDK. |

La presencia de la licencia no demuestra su validez para el identificador de la app. No copie las licencias de otra app o motor de captura.

## JWT y permisos de consulta

`INVALID_PARAMS` indica campos vacíos, tipos incorrectos, prefijo `Bearer` o mezcla de JWT con credenciales. Entregue ambos tokens sin el prefijo y mantenga `contractId` y `userId` como texto.

Si se crea la verificación con HTTP 201, pero consultar devuelve HTTP 403, compruebe que el segundo token tenga `verification:get` y se asigne a `verificationResultsJwt`. El token principal debe autorizar `verification:create`. Revise también ambiente, contrato y vigencia; HTTP 403 no prueba por sí solo la expiración.

La SDK no renueva los JWT ni cambia automáticamente a credenciales. Solicite tokens vigentes a su backend para el siguiente intento. No reinicie automáticamente la captura ni implemente consultas adicionales al recibir `PENDING`.

## Resultado y soporte

- `SUCCES` es el estado público de éxito; `PENDING` es pendiente y no debe mostrarse como verificación final.
- Android puede informar `USER_CANCELLED`; no suponga que iOS expone el mismo callback.
- Muestre `code` y `message` al recibir un rechazo. Un estado desconocido se rechaza como `INVALID_RESPONSE`.
- Comparta con soporte la versión del paquete, plataforma, paso afectado y un error revisado. Excluya tokens, credenciales, documentos, imágenes faciales, licencias y datos personales.

Consulte la [guía JWT](AUTENTICACION_JWT.md) para revisar el flujo completo.
