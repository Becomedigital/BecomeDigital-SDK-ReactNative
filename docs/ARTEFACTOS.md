# Integration versions and artifacts

This record identifies the demo configuration; it does not imply universal compatibility or authorization to redistribute an SDK. Obtain authorized artifacts and licenses for the contract, app identifiers, and environment. For native dependency and license requirements, use the [Android AutoCaptureOCR SDK](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-Android) and [iOS AutoCaptureOCR SDK](https://github.com/Becomedigital/BecomeDigitalSDKAutoCaptureOCR-iOS) integration guides.

| Componente | Configuración |
| --- | --- |
| React Native / React | 0.84.1 / 19.2.3 |
| Node.js | >= 22.11.0 |
| Java / Android mínimo | 17 / API 24 |
| Android compile/target SDK, Build Tools | 36 / 36.0.0 |
| Android Gradle Plugin / Gradle | 8.12.0 / 8.14.2 |
| Kotlin / plugin Compose | 2.2.10 / 2.2.10 |
| Android NDK | 27.1.12297006 |
| Ruby de referencia / CocoaPods / xcodeproj | 3.2.2 / 1.16.2 / 1.27.0 |
| AutoCaptureOCR iOS minimum deployment target | 16.0 |
| Xcode usado para la validación local | 27.0 (27A266a) |
| Become iOS framework | 1.2.3 |
| Amplify Swift | 2.53.3 |
| Amplify UI Face Liveness | 1.4.4 |
| BlinkID Core / UX | 8002.0.2 |
| iOS native UI | SwiftUI |

Use the Android native guide for its complete Gradle dependencies; do not copy only the AAR. On iOS, keep `Package.resolved` and `Podfile.lock` with the project, in addition to the required products, resources, and target settings. The AutoCaptureOCR iOS dependency set requires iOS 16.0+, not the older deployment target recorded by prior bridge examples.

## Binarios de referencia

Los binarios de esta actualización se sincronizaron con el proyecto local de integración `Become`: únicamente el AAR y el XCFramework, sin copiar credenciales ni licencias. Se usa el hash porque un proveedor puede generar binarios distintos con el mismo número de versión.

| Archivo | SHA-256 |
| --- | --- |
| `android/app/libs/becomedigitalsdk.aar` | `2811a8811e047b9c5a02d8aa8b85ee07ac668641d27baf38c3b8e89153378cb3` |
| `ios/BecomeDigitalApp/Frameworks/BDIdentityVerification.xcframework/ios-arm64/BDIdentityVerification.framework/BDIdentityVerification` (SDK 1.2.3) | `04c6fde8b37190144758f284f51ecf5c792f127cc4ed1190b067526974842eaf` |

Puede comprobarlos con `shasum -a 256 RUTA_DEL_ARCHIVO`. El segundo hash identifica el binario de dispositivo, no el directorio completo del XCFramework.

## Antes de redistribuir

- Confirm authorization to distribute the SDK and licensed resources (`com.become.blinkid.key` for Android and `com.become.blinkid.key.txt` for iOS). Existing files in this repository do not demonstrate permission to reuse them in another app.
- No agregue claves de firma de distribución, credenciales de cliente, perfiles Testing, datos personales ni artefactos de pruebas.
- `.gitignore` evita añadir nuevos archivos locales por accidente, pero no retira archivos ya versionados ni elimina secretos del historial.
- El demo usa firma Android debug generada localmente; no sirve como política de firma de una aplicación de producción.
