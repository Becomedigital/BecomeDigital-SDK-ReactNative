# Versiones y artefactos de la integración

Este registro identifica la configuración del demo; no implica compatibilidad universal ni autorización para redistribuir una SDK. Solicite artefactos y licencias autorizados para su contrato, los identificadores de su app y el ambiente correspondiente. Para consultar los requisitos de dependencias y licencias nativas, use las guías de integración de la [SDK AutoCaptureOCR para Android](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android) y de la [SDK AutoCaptureOCR para iOS](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS).

| Componente | Configuración |
| --- | --- |
| React Native / React | 0.84.1 / 19.2.3 |
| Node.js | >= 22.11.0 |
| Java / Android mínimo | 17 / API 24 |
| SDK Android de compilación y destino / Build Tools | 36 / 36.0.0 |
| Android Gradle Plugin / Gradle | 8.12.0 / 8.14.2 |
| Kotlin / plugin Compose | 2.2.10 / 2.2.10 |
| Android NDK | 27.1.12297006 |
| Ruby de referencia / CocoaPods / xcodeproj | 3.2.2 / 1.16.2 / 1.27.0 |
| Versión mínima de iOS para AutoCaptureOCR | 16.0 |
| Xcode usado para la validación local | 27.0 (27A266a) |
| Framework de Become para iOS | 1.2.3 |
| Amplify Swift | 2.53.3 |
| Amplify UI Face Liveness | 1.4.4 |
| BlinkID Core / UX | 8002.0.2 |
| Interfaz nativa iOS | SwiftUI |

Consulte la guía nativa de Android para conocer todas las dependencias Gradle; no copie únicamente el AAR. En iOS conserve `Package.resolved` y `Podfile.lock` junto con el proyecto, además de los productos, recursos y ajustes requeridos por el target. Las dependencias de AutoCaptureOCR para iOS requieren iOS 16.0 o posterior; no use la versión mínima anterior que figuraba en los ejemplos previos del bridge.

## Binarios de referencia

Los binarios de esta actualización se sincronizaron con el proyecto local de integración `Become`: únicamente el AAR y el XCFramework, sin copiar credenciales ni licencias. Se usa el hash porque un proveedor puede generar binarios distintos con el mismo número de versión.

| Archivo | SHA-256 |
| --- | --- |
| `android/app/libs/becomedigitalsdk.aar` | `2811a8811e047b9c5a02d8aa8b85ee07ac668641d27baf38c3b8e89153378cb3` |
| `ios/BecomeDigitalApp/Frameworks/BDIdentityVerification.xcframework/ios-arm64/BDIdentityVerification.framework/BDIdentityVerification` (SDK 1.2.3) | `04c6fde8b37190144758f284f51ecf5c792f127cc4ed1190b067526974842eaf` |

Puede comprobarlos con `shasum -a 256 RUTA_DEL_ARCHIVO`. El segundo hash identifica el binario de dispositivo, no el directorio completo del XCFramework.

## Antes de redistribuir

- Confirme la autorización para distribuir la SDK y los recursos licenciados (`com.become.blinkid.key` para Android y `com.become.blinkid.key.txt` para iOS). Que los archivos ya existan en este repositorio no demuestra permiso para reutilizarlos en otra app.
- No agregue claves de firma de distribución, credenciales de cliente, perfiles Testing, datos personales ni artefactos de pruebas.
- `.gitignore` evita añadir nuevos archivos locales por accidente, pero no retira archivos ya versionados ni elimina secretos del historial.
- El demo usa firma Android debug generada localmente; no sirve como política de firma de una aplicación de producción.
