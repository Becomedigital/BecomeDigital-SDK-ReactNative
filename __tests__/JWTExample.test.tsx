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
