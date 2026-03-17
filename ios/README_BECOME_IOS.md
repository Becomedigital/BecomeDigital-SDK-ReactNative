# Integracion iOS de Become Digital

La app ya incluye el puente React Native para iOS con el mismo modulo JS que Android: `BecomeModule.iniciarBecomeSDK(params)`.

## Archivos agregados

- `ios/BecomeDigitalApp/BecomeModule.swift`
- `ios/BecomeDigitalApp/BecomeModuleBridge.m`

## Pendiente para completar en Xcode

1. Verificar que `BecomeDigitalV.xcframework` quede agregado al target `BecomeDigitalApp` con `Embed & Sign`.
2. Agregar a ese mismo target:
   - `com.become.document.key.txt`
3. En `File > Add Packages`, registrar:
   - `https://github.com/aws-amplify/amplify-swift` desde `2.45.4`
   - `https://github.com/aws-amplify/amplify-ui-swift-liveness` desde `1.3.4`
   - `https://github.com/BlinkID/capture-core-sp` rama `main`
   - `https://github.com/BlinkID/capture-ux-sp` rama `main`
4. Asociar los productos de esos paquetes al target `BecomeDigitalApp`.

## Notas

- `Info.plist` ya incluye `NSCameraUsageDescription`.
- `Info.plist` ya incluye `NSMicrophoneUsageDescription`.
- El SDK recibido solo incluye slice `ios-arm64`, por lo que debes probar en dispositivo fisico, no en simulador.
- El modulo valida que existan las licencias y que el framework `BecomeDigitalV` este enlazado.
- Si falta algo, React Native recibira un error explicito en la promesa.
