import React, {useRef, useState} from 'react';
import {Button, Text, View} from 'react-native';
import BecomeModule, {BecomeSDKJWTParams, bridgeDisponible, errorDeSDK} from '../src/types/BecomeModule';

export type BecomeJWTSession = Pick<BecomeSDKJWTParams, 'jwt' | 'verificationResultsJwt' | 'contractId' | 'userId'>;

/** La app proporciona la llamada a su backend; las credenciales permanecen allí. */
export default function JWTExample({getSession}: {
  getSession: () => Promise<BecomeJWTSession>;
}) {
  const active = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function launch() {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setMessage('');
    try {
      // Solicite tokens vigentes en cada intento y consérvelos solo en memoria.
      const session = await getSession();
      const result = await BecomeModule.iniciarBecomeSDK({
        jwt: session.jwt,
        verificationResultsJwt: session.verificationResultsJwt,
        contractId: session.contractId,
        userId: session.userId,
        preventScreenCapture: true,
      });
      setMessage((result.status === 'PENDING' ? 'Pendiente: ' : 'Completado: ') + result.message);
    } catch (cause) {
      const error = errorDeSDK(cause);
      setMessage(error.code + ': ' + error.message);
    } finally {
      active.current = false;
      setBusy(false);
    }
  }

  return (
    <View>
      <Text>La aplicación obtiene los dos JWT desde su backend antes de iniciar.</Text>
      {!bridgeDisponible() && <Text>Registre el bridge y recompile la app.</Text>}
      <Button
        testID="launch-jwt-example"
        title={busy ? 'Preparando verificación…' : 'Iniciar verificación con JWT'}
        disabled={busy || !bridgeDisponible()}
        onPress={launch}
      />
      <Text testID="jwt-example-result" selectable accessibilityLiveRegion="polite">{message}</Text>
    </View>
  );
}
