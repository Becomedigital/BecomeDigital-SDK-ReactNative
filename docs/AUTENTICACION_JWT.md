# Integración con JWT en React Native

El demo permite iniciar la verificación con los tokens que entrega el backend de su aplicación. Las credenciales de Become Digital permanecen en el servidor; la app recibe los JWT y los pasa al bridge.

## Preparar los tokens en su backend

El backend consume `POST /auth` de Become Digital con `client_id`, `client_secret` y el `grant_type` correspondiente. Para el onboarding de este demo, que consulta el resultado final, solicite dos tokens:

| Operación | `grant_type` | Parámetro enviado al bridge |
| --- | --- | --- |
| Crear la verificación | `verification:create` | `jwt` |
| Consultar el resultado final | `verification:get` | `verificationResultsJwt` |

Consulte la [autenticación de la API](https://becomedigital.gitbook.io/kyc_api_es/authentication) y el [endpoint de obtención de tokens](https://becomedigital.gitbook.io/kyc_api_es/endpoints/auth) para los detalles del servicio. Entregue los dos JWT sin el prefijo `Bearer` y para el mismo ambiente y contrato de la integración.

La aplicación no debe consumir `/auth` con las credenciales de Become Digital. Implemente en su backend una operación autenticada para preparar la sesión de verificación y entregar los tokens a su app.

## Ejecutar la muestra del demo

1. Configure las dependencias nativas y la licencia como indica el [README](../README.md).
2. Obtenga desde su backend un token de creación y otro de consulta.
3. Abra **JWT (recomendado)** y pegue cada token en su campo, sin `Bearer`.
4. Ingrese el contrato y pulse **Iniciar Verificación**.
5. Complete el flujo en un dispositivo físico y revise el resultado o el campo de error.

Los campos JWT están protegidos y permanecen solo en memoria. No se guardan mediante **Guardar Testing** ni se precargan desde el repositorio. Cambiar de modo limpia ambos campos. El formulario genera un `userId` de prueba por intento; en su app use el identificador de su usuario o solicitud.

## Ejemplo de un solo botón

[JWTExample.tsx](../examples/JWTExample.tsx) recibe una función `getSession` que su aplicación implementa. El siguiente ejemplo define un contrato de respuesta para **su propio backend**; la dirección es ilustrativa y no es un endpoint de Become Digital:

```tsx
import JWTExample, {BecomeJWTSession} from './examples/JWTExample';

async function obtenerSesionDesdeSuBackend(): Promise<BecomeJWTSession> {
  // Use el cliente HTTP y la autenticación de sesión propios de su aplicación.
  const response = await fetch(
    'https://backend-de-su-app.example/sesion-verificacion',
    {method: 'POST', headers: {'Content-Type': 'application/json'}},
  );
  if (!response.ok) {
    throw new Error('No fue posible preparar la verificación.');
  }
  return response.json();
}

// Dentro de una pantalla que respete el área segura:
<JWTExample getSession={obtenerSesionDesdeSuBackend} />;
```

La respuesta de su backend debe contener `jwt`, `verificationResultsJwt`, `contractId` y `userId`, todos como texto. Es el contrato de esta muestra, no el formato de respuesta del endpoint `/auth`.

El componente obtiene una sesión en cada pulsación, llama a `iniciarBecomeSDK` y muestra `SUCCES`, `PENDING` o el error. Los JWT no se muestran en el resultado ni se guardan. El bloqueo de doble pulsación abarca tanto la obtención de la sesión como la ejecución nativa.

## Configurar el bridge Android

El método recibe ambos tokens desde JavaScript y los asigna antes de iniciar:

```kotlin
val config = BDIVConfig(
    jwt, contractId,
    arrayOf(DocumetType.DNI, DocumetType.PASSPORT),
    true, userId
)
config.verificationResultsJwt = verificationResultsJwt
config.flow = BDIVConfig.Flow.Onboarding
config.setPerformVerificationCheck(true)
config.setPreventScreenCapture(true)
// Registre el callback antes de iniciar.
BecomeResponseManager.getInstance().startAuthentication(activity, config)
```

Consulte la [autenticación JWT de Android](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android/blob/main/AUTENTICACION.md). Si usa `setJwt(...)`, asigne después `verificationResultsJwt`, porque reemplazar el token principal elimina el de consulta anterior.

## Configurar el bridge iOS

```swift
var config = BDIVConfig(
    jwt: jwt,
    contractId: contractId,
    documenTypes: [.DNI, .PASSPORT],
    userId: userId,
    performVerificationCheck: true,
    flow: .Onboarding,
    preventScreenCapture: true
)
config.verificationResultsJwt = verificationResultsJwt
let verification = BecomeDigitalSDK(bdivConfig: config, delegate: self)
verification.startVerification()
```

Conserve la instancia de `BecomeDigitalSDK` mientras el flujo esté activo. Consulte la [autenticación JWT de iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS/blob/main/AUTENTICACION.md).

## Validación, errores y reintentos

- El bridge exige ambos JWT, contrato y usuario no vacíos, y rechaza el prefijo `Bearer` o la mezcla con credenciales mediante `INVALID_PARAMS`.
- La firma JWT no obtiene ni renueva tokens y no cambia automáticamente a credenciales si falla un token.
- Si un token vence o se rechaza, obtenga tokens vigentes desde su backend antes de iniciar otro intento. No reinicie automáticamente la captura.
- Una creación con HTTP 201 seguida de HTTP 403 al consultar puede indicar que falta el permiso `verification:get`. Revise `verificationResultsJwt`, ambiente, contrato y vigencia; HTTP 403 no demuestra por sí solo que el token haya vencido.
- La validación del bridge comprueba la forma de la llamada. La validez criptográfica y los permisos de los tokens corresponden al servicio.
- Conserve el manejo de `SUCCES`, `PENDING`, errores y cancelación. No considere `PENDING` una verificación final.
- No registre tokens, credenciales ni respuestas con datos personales. Comparta con soporte únicamente el código, el mensaje y el paso afectado, debidamente revisados.

El bridge ofrece una muestra de onboarding con consulta del resultado. La autenticación de un usuario existente es un flujo nativo distinto y requiere su propia configuración y permisos.
