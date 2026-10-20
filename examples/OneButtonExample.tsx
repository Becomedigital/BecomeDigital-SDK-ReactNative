import React, {useRef, useState} from 'react';
import {Button, Text, View} from 'react-native';
import BecomeModule, {BecomeSDKParams, bridgeDisponible, errorDeSDK} from '../src/types/BecomeModule';

/** Supply test credentials from your own configuration. Never commit real values. */
export default function OneButtonExample({credentials}: {
  credentials: Pick<BecomeSDKParams, 'clientId' | 'clientSecret' | 'contractId'>;
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
