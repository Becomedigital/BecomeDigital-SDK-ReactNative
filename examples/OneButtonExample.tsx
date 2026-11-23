import React, {useRef, useState} from 'react';
import {Button, Text, View} from 'react-native';
import BecomeModule, {BecomeSDKCredentialsParams, bridgeDisponible, errorDeSDK} from '../src/types/BecomeModule';

/** Ejemplo anterior con credenciales. Para nuevas apps, consulte JWTExample. */
export default function OneButtonExample({credentials}: {
  credentials: Pick<BecomeSDKCredentialsParams, 'clientId' | 'clientSecret' | 'contractId'>;
}) {
  const active = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function launch() {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    try {
      const result = await BecomeModule.iniciarBecomeSDK({
        ...credentials,
        userId: 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
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
      {!bridgeDisponible() && <Text>Registra el bridge y recompila la app.</Text>}
      <Button title={busy ? 'Verificando…' : 'Iniciar verificación'} disabled={busy || !bridgeDisponible()} onPress={launch} />
      <Text selectable accessibilityLiveRegion="polite">{message}</Text>
    </View>
  );
}
