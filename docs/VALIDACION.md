# Validar la integración del bridge

## Comprobaciones sin dispositivo

Desde la raíz:

```sh
npm ci
npm run check
```

El comando comprueba tipos, ESLint y pruebas Jest. Las pruebas cubren el paso de ambos JWT sin credenciales, campos vacíos, tipos incorrectos, mezcla de métodos, prefijo Bearer, permisos de cámara, errores, respuestas desconocidas, estados pendientes y llamadas simultáneas. También comprueban que el formulario abra en JWT, que no guarde tokens y que el ejemplo de un botón obtenga una sesión en cada intento.

Con Java 17 y el Android SDK configurados:

```sh
cd android
./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleAndroidTest
```

Las pruebas JUnit no requieren dispositivo. `assembleAndroidTest` compila las pruebas instrumentadas, pero no las ejecuta ni valida el flujo físico.

Para iOS, instale los Pods y resuelva los paquetes desde Xcode. Una comprobación de compilación sin firma puede realizarse desde la raíz:

```sh
xcodebuild -workspace ios/BecomeDigitalApp.xcworkspace \
  -scheme BecomeDigitalApp -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO build
```

La compilación comprueba código, dependencias y enlace. No demuestra la validez de la licencia, los JWT o el servicio remoto.

## Prueba manual con JWT

Use un Android y un iPhone físicos con las licencias emitidas para la app:

1. Abra el demo y confirme **JWT (recomendado)** como modo inicial, con campos vacíos y respeto del área segura.
2. Compruebe el indicador de bridge conectado. Si falta el módulo, revise el registro nativo y recompile.
3. Obtenga del backend los tokens `verification:create` y `verification:get` para el mismo contrato y ambiente.
4. Pegue ambos sin `Bearer`, ingrese el contrato y compruebe que el botón se habilite. Con un token faltante debe permanecer deshabilitado.
5. Deniegue cámara: confirme el error y el reintento después de habilitarla en Ajustes.
6. Inicie la SDK y complete captura documental y validación facial. Compruebe que `SUCCES`, `PENDING` y error se distingan.
7. Pruebe un token rechazado, un error de red y una consulta sin el permiso adecuado. Debe mostrarse el código y mensaje devueltos; no debe abrirse otra sesión automáticamente.
8. Obtenga tokens vigentes y vuelva a intentar desde el formulario. Compruebe que la doble pulsación no abra dos flujos.
9. Cierre y abra la app: los JWT no deben persistir. Cambie de método y vuelva a JWT: ambos campos deben quedar vacíos.
10. Revise cancelación y regreso desde segundo plano. iOS no expone un callback de cancelación independiente en `BDIVDelegate`.
11. Compruebe Release sin Metro y revise que los registros no contengan JWT, credenciales ni datos personales.

## Probar el ejemplo de un botón

Configure `sessionEndpoint` en [JWTExample.tsx](../examples/JWTExample.tsx) con la URL HTTPS de su servicio de sesión. Compruebe que cada pulsación envíe un `POST`, que el botón se bloquee durante la solicitud y la verificación, y que la SDK se abra solo después de recibir los dos tokens y el contexto completos.

Pruebe una respuesta HTTP de error, una respuesta incompleta y un fallo de conexión. En los tres casos el ejemplo debe presentar el error, mantener cerrada la SDK y permitir un nuevo intento. Mantenga las credenciales de estas pruebas en el entorno del servicio según la [guía JWT](AUTENTICACION_JWT.md#regla-para-las-credenciales-de-prueba).

## Compatibilidad con la firma anterior

Seleccione **Credenciales (anterior)**, complete el formulario e inicie. El perfil Testing solo pertenece a ese modo y no debe recibir JWT. Esta firma se conserva para integraciones existentes y está deprecada en la SDK nativa.

Las pruebas instrumentadas de apertura mediante un perfil Testing corresponden a ese modo anterior. Una prueba omitida, una respuesta simulada o una compilación correcta no certifican una verificación biométrica física.
