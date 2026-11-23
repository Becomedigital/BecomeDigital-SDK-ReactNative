import React, {useRef, useState} from 'react';
import {Button, Text, View} from 'react-native';
import BecomeModule, {
  BecomeBridgeError,
  BecomeSDKCredentialsParams,
  BecomeSDKJWTParams,
  bridgeDisponible,
  errorDeSDK,
} from '../src/types/BecomeModule';

export type BecomeJWTSession = Pick<BecomeSDKJWTParams, 'jwt' | 'verificationResultsJwt' | 'contractId' | 'userId'>;

export type BecomeJWTTestCredentials = Pick<BecomeSDKCredentialsParams, 'clientId' | 'clientSecret' | 'contractId'>;

type SessionRequest = (url: string, options: RequestInit) => Promise<Response>;

type JWTExampleProps =
  | {getTestCredentials: () => BecomeJWTTestCredentials | Promise<BecomeJWTTestCredentials>; request?: SessionRequest; getSession?: never; sessionEndpoint?: never}
  | {sessionEndpoint: string; request?: SessionRequest; getSession?: never; getTestCredentials?: never}
  | {getSession: () => Promise<BecomeJWTSession>; sessionEndpoint?: never; request?: never; getTestCredentials?: never};

const BECOME_AUTH_URL = 'https://api.svi.becomedigital.net/api/v1/auth';

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isJWT(value: unknown): value is string {
  return nonEmptyText(value) && !/^Bearer(?:\s|$)/i.test(value.trim());
}

function isJWTSession(value: unknown): value is BecomeJWTSession {
  if (!value || typeof value !== 'object') return false;

  const {jwt, verificationResultsJwt, contractId, userId} = value as Partial<BecomeJWTSession>;
  return isJWT(jwt) && isJWT(verificationResultsJwt) && nonEmptyText(contractId) && nonEmptyText(userId);
}

async function requestSession(endpoint: string, request: SessionRequest = fetch): Promise<BecomeJWTSession> {
  const url = endpoint.trim();
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.host || parsed.username || parsed.password) {
      throw new Error();
    }
  } catch {
    throw new BecomeBridgeError('JWT_SERVICE_URL', 'Configure la URL HTTPS del servicio de sesión.');
  }

  const session = await postJSON(url, request);
  if (!isJWTSession(session)) {
    throw new BecomeBridgeError('JWT_SERVICE_RESPONSE', 'El servicio de sesión devolvió datos de verificación inválidos.');
  }
  return session;
}

async function postJSON(
  url: string,
  request: SessionRequest,
  body?: Record<string, string>,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const timeoutError = new BecomeBridgeError('JWT_SERVICE_TIMEOUT', 'El servicio tardó demasiado en responder.');
  const headers: Record<string, string> = {Accept: 'application/json', 'Cache-Control': 'no-store'};
  const options: RequestInit = {method: 'POST', headers, signal: controller.signal};
  if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
    options.redirect = 'error';
  }

  let response: Response;
  let data: unknown;
  try {
    response = await request(url, options);
    if (response.ok) data = await response.json().catch(() => undefined);
  } catch {
    if (controller.signal.aborted) throw timeoutError;
    throw new BecomeBridgeError('JWT_SERVICE_NETWORK', 'No se pudo conectar al servicio de verificación.');
  } finally {
    clearTimeout(timeout);
  }

  if (controller.signal.aborted) throw timeoutError;
  if (!response.ok) {
    throw new BecomeBridgeError('JWT_SERVICE_HTTP', 'El servicio respondió con HTTP ' + response.status + '.');
  }
  return data;
}

async function requestTestSession(
  {clientId, clientSecret, contractId}: BecomeJWTTestCredentials,
  request: SessionRequest = fetch,
): Promise<BecomeJWTSession> {
  if (![clientId, clientSecret, contractId].every(nonEmptyText)) {
    throw new BecomeBridgeError('JWT_TEST_CREDENTIALS', 'Faltan las credenciales temporales del demo.');
  }

  async function requestToken(grant: 'verification:create' | 'verification:get'): Promise<string> {
    const data = await postJSON(BECOME_AUTH_URL, request, {
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      grant_type: grant,
    });
    const token = (data as {access_token?: unknown} | null | undefined)?.access_token;
    if (!isJWT(token)) {
      throw new BecomeBridgeError('JWT_SERVICE_RESPONSE', 'El servicio no devolvió un JWT válido para ' + grant + '.');
    }
    return token.trim();
  }

  const jwt = await requestToken('verification:create');
  const verificationResultsJwt = await requestToken('verification:get');
  return {
    jwt,
    verificationResultsJwt,
    contractId: contractId.trim(),
    userId: 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
  };
}

async function getVerificationSession(props: JWTExampleProps): Promise<BecomeJWTSession> {
  if (props.getTestCredentials) {
    return requestTestSession(await props.getTestCredentials(), props.request);
  }
  if (props.getSession) return props.getSession();
  return requestSession(props.sessionEndpoint, props.request);
}

/** Solicita una sesión nueva antes de cada llamada al bridge. */
export default function JWTExample(props: JWTExampleProps) {
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
      const session = await getVerificationSession(props);
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
      <Text>{props.getTestCredentials
        ? 'El demo obtiene dos JWT de Become Digital antes de iniciar.'
        : 'La aplicación obtiene los dos JWT desde su backend antes de iniciar.'}</Text>
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
