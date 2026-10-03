# Integracion iOS de Become Digital

La app ya incluye el puente React Native para iOS con el mismo modulo JS que Android: `BecomeModule.iniciarBecomeSDK(params)`.

## Archivos agregados

- `ios/BecomeDigitalApp/BecomeModule.swift`
- `ios/BecomeDigitalApp/BecomeModuleBridge.m`

## Configuracion nativa verificada

1. Verificar que `BDIdentityVerification.xcframework` quede agregado al target `BecomeDigitalApp` con `Embed & Sign`.
2. Agregar a ese mismo target:
   - `com.become.document.key.txt`
3. En `File > Add Packages`, registrar:
   - `https://github.com/aws-amplify/amplify-swift` desde `2.45.4`
   - `https://github.com/aws-amplify/amplify-ui-swift-liveness` desde `1.4.4`
   - `https://github.com/BlinkID/capture-core-sp` desde `1.4.3`
   - `https://github.com/BlinkID/capture-ux-sp` desde `1.4.3`
4. Asociar los productos de esos paquetes al target `BecomeDigitalApp`.

## Notas

- `Info.plist` ya incluye `NSCameraUsageDescription`.
- `Info.plist` ya incluye `NSMicrophoneUsageDescription`.
- El XCFramework actualizado incluye slices para dispositivo (`ios-arm64`) y simulador (`ios-arm64_x86_64-simulator`). La validacion final de camara y biometria debe hacerse en un dispositivo fisico.
- El parametro opcional `preventScreenCapture` del bridge usa `true` por defecto. La pantalla demo envia `false` para permitir capturas durante las pruebas manuales.
- El modulo valida que existan las licencias y que el framework `BDIdentityVerification` este enlazado.
- Si falta algo, React Native recibira un error explicito en la promesa.
