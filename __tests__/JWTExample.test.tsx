import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {NativeModules} from 'react-native';
import JWTExample from '../examples/JWTExample';
import BecomeModule from '../src/types/BecomeModule';

jest.mock('../src/types/BecomeModule', () => ({
  ...jest.requireActual('../src/types/BecomeModule'),
  __esModule: true,
  default: {iniciarBecomeSDK: jest.fn()},
}));
const launch = BecomeModule.iniciarBecomeSDK as jest.Mock;
const session = {jwt: 'creation-test-only', verificationResultsJwt: 'results-test-only', contractId: '2', userId: 'test-user'};
const getSession = jest.fn();
let renderer: ReactTestRenderer.ReactTestRenderer;
const button = () => renderer.root.findByProps({testID: 'launch-jwt-example'});

beforeEach(async () => {
  NativeModules.BecomeModule = {iniciarBecomeSDK: jest.fn()};
  getSession.mockReset().mockResolvedValue(session);
  launch.mockReset().mockResolvedValue({status: 'PENDING', message: 'En proceso', userId: 'test-user'});
  await act(async () => { renderer = ReactTestRenderer.create(<JWTExample getSession={getSession} />); });
});
afterEach(async () => { await act(async () => renderer.unmount()); });

test('pide tokens al backend en cada intento y los entrega al bridge', async () => {
  await act(async () => { await button().props.onPress(); });
  expect(launch).toHaveBeenCalledWith({...session, preventScreenCapture: true});
  expect(renderer.root.findByProps({testID: 'jwt-example-result'}).props.children).toBe('Pendiente: En proceso');
  getSession.mockResolvedValue({...session, jwt: 'renewed-creation-test-only'});
  await act(async () => { await button().props.onPress(); });
  expect(getSession).toHaveBeenCalledTimes(2);
  expect(launch).toHaveBeenLastCalledWith({...session, jwt: 'renewed-creation-test-only', preventScreenCapture: true});
});

test('evita dos solicitudes mientras obtiene tokens y permite reintentar un error del backend', async () => {
  let rejectSession!: (cause: unknown) => void;
  getSession.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSession = reject; }));
  let pending!: Promise<void>;
  await act(async () => {
    const press = button().props.onPress;
    pending = press();
    await press();
  });
  expect(getSession).toHaveBeenCalledTimes(1);
  expect(button().props.disabled).toBe(true);
  await act(async () => {
    rejectSession(new Error('No fue posible preparar la sesión'));
    await pending;
  });
  expect(launch).not.toHaveBeenCalled();
  expect(button().props.disabled).toBe(false);
  expect(renderer.root.findByProps({testID: 'jwt-example-result'}).props.children).toContain('No fue posible preparar la sesión');
});

const sessionEndpoint = 'https://backend.example/sesion-verificacion';

test('envía el POST al pulsar y espera los dos JWT antes de abrir la SDK', async () => {
  let resolveRequest!: (response: Response) => void;
  const request = jest.spyOn(globalThis, 'fetch')
    .mockImplementationOnce(() => new Promise(resolve => { resolveRequest = resolve; }));
  try {
    await act(async () => { renderer.update(<JWTExample sessionEndpoint={sessionEndpoint} />); });
    expect(request).not.toHaveBeenCalled();

    let pending!: Promise<void>;
    await act(async () => {
      const press = button().props.onPress;
      pending = press();
      await press();
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(sessionEndpoint, expect.objectContaining({
      method: 'POST',
      headers: {Accept: 'application/json', 'Cache-Control': 'no-store'},
    }));
    expect(request.mock.calls[0][1]).not.toHaveProperty('body');
    expect(button().props.disabled).toBe(true);
    expect(launch).not.toHaveBeenCalled();

    await act(async () => {
      resolveRequest(new Response(JSON.stringify(session)));
      await pending;
    });
    expect(launch).toHaveBeenCalledWith({...session, preventScreenCapture: true});
  } finally {
    request.mockRestore();
  }
});

test.each([
  [401, {detail: 'detalle interno de prueba'}, 'JWT_SERVICE_HTTP'],
  [200, {jwt: 'creation-test-only'}, 'JWT_SERVICE_RESPONSE'],
  [200, {...session, verificationResultsJwt: 'Bearer results-test-only'}, 'JWT_SERVICE_RESPONSE'],
])('rechaza HTTP %s o un contrato inválido y permite reintentar', async (status, payload, code) => {
  const request = jest.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(payload), {status}))
    .mockResolvedValueOnce(new Response(JSON.stringify(session)));
  await act(async () => { renderer.update(<JWTExample sessionEndpoint={sessionEndpoint} request={request} />); });
  await act(async () => { await button().props.onPress(); });

  const result = renderer.root.findByProps({testID: 'jwt-example-result'}).props.children;
  expect(result).toContain(code);
  expect(result).not.toContain('detalle interno de prueba');
  expect(launch).not.toHaveBeenCalled();
  expect(button().props.disabled).toBe(false);

  await act(async () => { await button().props.onPress(); });
  expect(request).toHaveBeenCalledTimes(2);
  expect(launch).toHaveBeenCalledWith({...session, preventScreenCapture: true});
});

test('cancela una solicitud lenta y permite reintentar', async () => {
  jest.useFakeTimers();
  try {
    const request = jest.fn((_url: string, {signal}: RequestInit) => new Promise<Response>((_, reject) => {
      signal?.addEventListener('abort', () => reject(new Error('Solicitud cancelada')));
    }));
    await act(async () => { renderer.update(<JWTExample sessionEndpoint={sessionEndpoint} request={request} />); });
    let pending!: Promise<void>;
    await act(async () => { pending = button().props.onPress(); });
    await act(async () => {
      jest.advanceTimersByTime(15_000);
      await pending;
    });
    expect(launch).not.toHaveBeenCalled();
    expect(button().props.disabled).toBe(false);
    expect(renderer.root.findByProps({testID: 'jwt-example-result'}).props.children).toContain('JWT_SERVICE_TIMEOUT');
  } finally {
    jest.useRealTimers();
  }
});

const authEndpoint = 'https://api.svi.becomedigital.net/api/v1/auth';
const testCredentials = {clientId: 'client-test-only', clientSecret: 'secret-test-only', contractId: 'test-contract'};

test('un clic solicita ambos permisos a la API pública y abre la SDK solo al recibir los dos JWT', async () => {
  const getTestCredentials = jest.fn(() => testCredentials);
  let finishResults!: (response: Response) => void;
  const request = jest.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({access_token: session.jwt})))
    .mockImplementationOnce(() => new Promise(resolve => { finishResults = resolve; }));
  await act(async () => { renderer.update(<JWTExample getTestCredentials={getTestCredentials} request={request} />); });
  expect(request).not.toHaveBeenCalled();
  expect(getTestCredentials).not.toHaveBeenCalled();

  let pending!: Promise<void>;
  await act(async () => { pending = button().props.onPress(); });
  expect(request).toHaveBeenCalledTimes(2);
  const grants = ['verification:create', 'verification:get'];
  grants.forEach((grant, index) => {
    const [url, options] = request.mock.calls[index];
    expect(url).toBe(authEndpoint);
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      client_id: testCredentials.clientId,
      client_secret: testCredentials.clientSecret,
      grant_type: grant,
    });
  });
  expect(button().props.disabled).toBe(true);
  expect(launch).not.toHaveBeenCalled();

  await act(async () => {
    finishResults(new Response(JSON.stringify({access_token: session.verificationResultsJwt})));
    await pending;
  });
  expect(launch).toHaveBeenCalledWith({
    jwt: session.jwt,
    verificationResultsJwt: session.verificationResultsJwt,
    contractId: testCredentials.contractId,
    userId: expect.stringMatching(/^demo-/),
    preventScreenCapture: true,
  });
});

test('si falla la solicitud de resultados muestra el estado HTTP sin exponer su cuerpo', async () => {
  const request = jest.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({access_token: session.jwt})))
    .mockResolvedValueOnce(new Response(JSON.stringify({detail: 'mensaje privado de prueba'}), {status: 403}));
  const getTestCredentials = () => testCredentials;
  await act(async () => { renderer.update(<JWTExample getTestCredentials={getTestCredentials} request={request} />); });
  await act(async () => { await button().props.onPress(); });

  const result = renderer.root.findByProps({testID: 'jwt-example-result'}).props.children;
  expect(result).toContain('HTTP 403');
  expect(result).not.toContain('mensaje privado de prueba');
  expect(launch).not.toHaveBeenCalled();
  expect(button().props.disabled).toBe(false);
});

test('sin el secreto temporal no consulta la API ni abre la SDK', async () => {
  const request = jest.fn();
  const getTestCredentials = () => ({...testCredentials, clientSecret: ''});
  await act(async () => { renderer.update(<JWTExample getTestCredentials={getTestCredentials} request={request} />); });
  await act(async () => { await button().props.onPress(); });

  expect(request).not.toHaveBeenCalled();
  expect(launch).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({testID: 'jwt-example-result'}).props.children).toContain('JWT_TEST_CREDENTIALS');
});
