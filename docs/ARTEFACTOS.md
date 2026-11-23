# Versiones de referencia para integrar el demo

Use estas versiones junto con las guías nativas de [Android](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android/blob/main/INSTALACION.md) e [iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS/blob/main/INSTALACION.md).

| Componente | Configuración del ejemplo |
| --- | --- |
| React Native / React | 0.84.1 / 19.2.3 |
| Node.js | 22.11.0 o posterior |
| Java / Android mínimo | 17 / API 24 |
| SDK Android de compilación y destino / Build Tools | 36 / 36.0.0 |
| Android Gradle Plugin / Gradle | 8.12.0 / 8.14.2 |
| Kotlin / plugin Compose | 2.2.10 / 2.2.10 |
| Android NDK | 27.1.12297006 |
| SDK Become para Android | `ai.becomedigital:identity-verification:3.5.1` |
| Ruby / CocoaPods / xcodeproj | 3.2.2 o posterior / 1.16.2 / 1.27.0 |
| iOS mínimo | 16.0 |
| Herramientas iOS | Xcode compatible con Swift 6.4 |
| SDK Become para iOS | Producto SPM `BDIdentityVerification`, paquete 5.3.2 |

Las dependencias nativas se obtienen desde Maven Central y SPM. Conserve las versiones exactas, `Package.resolved` y `Podfile.lock`. No enlace simultáneamente las SDK locales anteriores y los paquetes publicados.

## Arquitecturas

La distribución Android admite ARMv7 y ARM64. Este demo selecciona `armeabi-v7a` y `arm64-v8a`; no ofrece captura documental para `x86_64`.

El paquete iOS incluye `arm64` para dispositivo y `arm64`/`x86_64` para simulador. La cámara, el documento y la validación facial se prueban en dispositivos físicos.

## Licencias de la aplicación

Solicite licencias emitidas para los identificadores de su propia app y coloque los archivos en:

- Android: `android/app/src/main/assets/com.become.blinkid.key`.
- Demo iOS: `ios/Application/Resources/com.become.blinkid.key.txt`; en otra app, agréguelo al target y a **Copy Bundle Resources**.

Los archivos están ignorados por Git. Las licencias anteriores de otro motor de captura no se reutilizan. Una licencia no sustituye las autorizaciones del contrato ni es una llave de firma de distribución.

## Autenticación

La opción recomendada recibe `jwt` y `verificationResultsJwt` desde el backend. La firma anterior con credenciales se conserva para compatibilidad. Consulte la [guía JWT](AUTENTICACION_JWT.md).

Al compartir su integración, excluya JWT, credenciales, licencias, datos personales y llaves de distribución. El demo utiliza firma de depuración Android; configure la firma de producción en su aplicación.
