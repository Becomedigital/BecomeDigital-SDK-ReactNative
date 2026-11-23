# Integración con JWT en React Native

El demo permite iniciar la verificación con los tokens que entrega el backend de su aplicación. Las credenciales de Become Digital permanecen en el servidor; la app recibe los JWT y los pasa al bridge.

## Preparar los tokens en su backend

El backend consume `POST /auth` de Become Digital con `client_id`, `client_secret` y el `grant_type` correspondiente. Para el onboarding de este demo, que consulta el resultado final, solicite dos tokens:

| Operación | `grant_type` | Parámetro enviado al bridge |
| --- | --- | --- |
| Crear la verificación | `verification:create` | `jwt` |
| Consultar el resultado final | `verification:get` | `verificationResultsJwt` |

Este es el formato público de la solicitud que hace el servidor. Los valores que comienzan con «your» son marcadores de posición.

```http
POST /api/v1/auth
Host: api.svi.becomedigital.net
Content-Type: application/json

{
  "client_id": "your client ID here...",
  "client_secret": "your key here...",
  "grant_type": "verification:create"
}
```

Repita la solicitud con `verification:get`. Tome `access_token` de cada respuesta y entregue los dos JWT sin el prefijo `Bearer`, para el mismo ambiente y contrato. El servicio de sesión autentica al usuario de la app, resuelve el contrato y el usuario de la verificación, obtiene ambos tokens y los devuelve juntos. Consulte la [autenticación pública de la API](https://becomedigital.gitbook.io/kyc_api_es/authentication) y el [endpoint de obtención de tokens](https://becomedigital.gitbook.io/kyc_api_es/endpoints/auth).

## Regla para las credenciales de prueba

Mantenga la capa de credenciales de todas las pruebas de este ejemplo fuera del repositorio React Native. Configure `client_id`, `client_secret` y otros secretos en un gestor de secretos o en el entorno del servicio externo, también durante las pruebas locales. En Git publique únicamente la lógica, el contrato público y ejemplos con marcadores de posición.

Nunca incluya credenciales ni JWT reales en código, configuraciones del móvil, archivos de ejemplo, datos de pruebas, capturas, logs, commits o pull requests. Un archivo ignorado por Git también expone el secreto si la app lo importa y lo incluye en su bundle. Use esta misma regla para las funcionalidades que se agreguen al demo en el futuro.

## Ejecutar la muestra del demo

1. Configure las dependencias nativas y la licencia según la [guía de Maven Central y SPM](INSTALACION_NATIVA.md).
2. Obtenga desde su backend un token de creación y otro de consulta.
3. Abra **JWT (recomendado)** y pegue cada token en su campo, sin `Bearer`.
4. Ingrese el contrato y pulse **Iniciar Verificación**.
5. Complete el flujo en un dispositivo físico y revise el resultado o el campo de error.

Los campos JWT están protegidos y permanecen solo en memoria. No se guardan mediante **Guardar Testing** ni se precargan desde el repositorio. Cambiar de modo limpia ambos campos. El formulario genera un `userId` de prueba por intento; en su app use el identificador de su usuario o solicitud.

## Ejemplo de un solo botón

[JWTExample.tsx](../examples/JWTExample.tsx) ejecuta `POST` a la `sessionEndpoint` HTTPS de su backend cuando se pulsa **Iniciar verificación con JWT**. La solicitud no lleva cuerpo. El servicio determina el contexto a partir de la sesión de la app y responde con `Content-Type: application/json` y `Cache-Control: no-store`. Los cuatro campos de este contrato son texto:

| Campo | Valor esperado |
| --- | --- |
| `jwt` | `access_token` obtenido con `verification:create` |
| `verificationResultsJwt` | `access_token` obtenido con `verification:get` |
| `contractId` | Contrato autorizado para ambos tokens |
| `userId` | Identificador del usuario o de la solicitud de verificación |

Monte el componente en una pantalla que respete el área segura. Para probarlo en este demo, puede renderizarlo en una copia local de `App.tsx` dentro de `SafeAreaProvider` y un `SafeAreaView`. Proporcione la URL de su servicio y, si la app usa un token de sesión, adjúntelo con su cliente HTTP:

```tsx
import JWTExample from './examples/JWTExample';

function Verificacion({
  urlDeSesion,
  tokenDeUsuario,
}: {
  urlDeSesion: string;
  tokenDeUsuario: string;
}) {
  return (
    <JWTExample
      sessionEndpoint={urlDeSesion}
      request={(url, options) => {
        const headers = new Headers(options.headers);
        headers.set('Authorization', 'Bearer ' + tokenDeUsuario);
        return fetch(url, {...options, headers});
      }}
    />
  );
}
```

La URL proviene de la configuración de su app. `tokenDeUsuario` proviene de su autenticación en tiempo de ejecución. El encabezado `Authorization` identifica al usuario ante el backend. Los dos JWT que llegan a la SDK se entregan sin el prefijo `Bearer`. Si su app ya tiene una función autenticada para obtener esa sesión, puede pasarla mediante `getSession`.

El botón espera una respuesta válida antes de llamar a `iniciarBecomeSDK` y evita pulsaciones repetidas durante la solicitud y la verificación. Ante un error de red, una demora superior a 15 segundos, un estado HTTP de error o una respuesta inválida, muestra un mensaje del servicio y permite volver a intentar. Los JWT permanecen en memoria durante el intento.

## Prueba local de un solo clic con la API pública

Para una ejecución privada del demo, `JWTExample` admite `getTestCredentials` como proveedor temporal. Al pulsar el botón, la vista lee `clientId`, `clientSecret` y `contractId` suministrados por el entorno de la prueba. Envía dos solicitudes a `https://api.svi.becomedigital.net/api/v1/auth`, una por cada permiso, y espera ambos `access_token` antes de llamar a `iniciarBecomeSDK`. Cada intento genera un `userId` de prueba.

Cargue las credenciales de esta variante solo en el proceso local de prueba. Manténgalas fuera del repositorio, de los archivos que empaqueta Metro y de la configuración persistente de la app. El código del ejemplo conserva únicamente la URL pública y el formato de la solicitud. Para la integración que se distribuye a clientes, el intercambio de credenciales se realiza en el backend de la aplicación. Consulte la [guía pública de autenticación](https://becomedigital.gitbook.io/kyc_api_es/authentication).

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
