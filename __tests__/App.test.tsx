import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules} from 'react-native';
import App from '../App';
import BecomeModule from '../src/types/BecomeModule';

jest.mock('../src/types/BecomeModule', () => ({
  ...jest.requireActual('../src/types/BecomeModule'),
  __esModule: true,
  default: {iniciarBecomeSDK: jest.fn()},
}));
const launch = BecomeModule.iniciarBecomeSDK as jest.Mock;
let renderer: ReactTestRenderer.ReactTestRenderer;

beforeEach(async () => {
  launch.mockReset();
  NativeModules.BecomeModule = {iniciarBecomeSDK: jest.fn()};
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  await act(async () => { renderer = ReactTestRenderer.create(<App />); });
});
afterEach(async () => { await act(async () => renderer.unmount()); });
async function fill() {
  await act(async () => {
    for (const id of ['jwt', 'verification-results-jwt', 'contract-id']) {
      renderer.root.findByProps({testID: id}).props.onChangeText('test-only');
    }
  });
}
const button = () => renderer.root.findByProps({testID: 'launch-sdk'});

test('sin credenciales muestra el bridge y deshabilita el botón', () => {
  expect(button().props.disabled).toBe(true);
  expect(renderer.root.findByProps({testID: 'bridge-status'}).props.children).toContain('conectado');
});

test('inicia en JWT, oculta credenciales y no permite guardar tokens en Testing', async () => {
  expect(renderer.root.findByProps({testID: 'auth-jwt'}).props.accessibilityState.selected).toBe(true);
  expect(renderer.root.findAllByProps({testID: 'client-secret'})).toHaveLength(0);
  expect(renderer.root.findAllByProps({testID: 'save-testing'})).toHaveLength(0);
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  await fill();
  launch.mockResolvedValue({status: 'PENDING', message: 'En proceso', userId: 'test-user'});
  await act(async () => { await button().props.onPress(); });
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({jwt: 'test-only', verificationResultsJwt: 'test-only'}));
  expect(launch.mock.calls[0][0]).not.toHaveProperty('clientSecret');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('no habilita el inicio si falta el token de consulta', async () => {
  await act(async () => {
    renderer.root.findByProps({testID: 'jwt'}).props.onChangeText('creation-test-only');
    renderer.root.findByProps({testID: 'contract-id'}).props.onChangeText('2');
  });
  expect(button().props.disabled).toBe(true);
});

test('conserva el acceso anterior por credenciales y limpia los tokens al cambiar de modo', async () => {
  await fill();
  await act(async () => { renderer.root.findByProps({testID: 'auth-credentials'}).props.onPress(); });
  await act(async () => {
    renderer.root.findByProps({testID: 'client-id'}).props.onChangeText('legacy-client');
    renderer.root.findByProps({testID: 'client-secret'}).props.onChangeText('legacy-test-only');
  });
  launch.mockResolvedValue({status: 'PENDING', message: 'En proceso', userId: 'test-user'});
  await act(async () => { await button().props.onPress(); });
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({clientId: 'legacy-client', clientSecret: 'legacy-test-only'}));
  expect(launch.mock.calls[0][0]).not.toHaveProperty('jwt');
  await act(async () => { renderer.root.findByProps({testID: 'auth-jwt'}).props.onPress(); });
  expect(renderer.root.findByProps({testID: 'jwt'}).props.value).toBe('');
  expect(renderer.root.findByProps({testID: 'verification-results-jwt'}).props.value).toBe('');
  expect(button().props.disabled).toBe(true);
});

test('una carga tardía del perfil anterior no modifica el contrato del modo JWT', async () => {
  let finishLoad!: (value: string) => void;
  (AsyncStorage.getItem as jest.Mock)
    .mockImplementationOnce(() => new Promise(resolve => { finishLoad = resolve; }))
    .mockResolvedValue('legacy-value');
  await act(async () => { renderer.root.findByProps({testID: 'auth-credentials'}).props.onPress(); });
  await act(async () => { renderer.root.findByProps({testID: 'auth-jwt'}).props.onPress(); });
  await act(async () => {
    renderer.root.findByProps({testID: 'contract-id'}).props.onChangeText('jwt-contract');
    finishLoad('legacy-client');
  });
  expect(renderer.root.findByProps({testID: 'contract-id'}).props.value).toBe('jwt-contract');
});
test('explica si falta el módulo nativo', async () => {
  delete NativeModules.BecomeModule;
  await fill();
  expect(button().props.disabled).toBe(true);
  expect(renderer.root.findByProps({testID: 'bridge-status'}).props.children).toContain('Falta registrar');
});
test('PENDING nunca aparece como VERIFICADO', async () => {
  await fill();
  launch.mockResolvedValue({status: 'PENDING', message: 'En proceso', userId: 'test-user'});
  await act(async () => { await button().props.onPress(); });
  expect(renderer.root.findByProps({testID: 'sdk-status'}).props.children).toBe('PENDIENTE');
  expect(button().props.disabled).toBe(false);
});
test.each(['SDK_ERROR', 'USER_CANCELLED', 'CAMERA_PERMISSION_DENIED'])('muestra detalle de %s y permite reintentar', async code => {
  await fill();
  launch.mockRejectedValue({code, message: 'Detalle de prueba'});
  await act(async () => { await button().props.onPress(); });
  expect(renderer.root.findByProps({testID: 'sdk-error'}).props.children).toBe(code + ': Detalle de prueba');
  expect(button().props.disabled).toBe(false);
});
test('bloquea dobles pulsaciones mientras espera permisos o SDK', async () => {
  await fill();
  let finish!: (value: unknown) => void;
  launch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  await act(async () => {
    const press = button().props.onPress;
    pending = press();
    await press();
  });
  expect(launch).toHaveBeenCalledTimes(1);
  expect(button().props.disabled).toBe(true);
  await act(async () => {
    finish({status: 'SUCCES', message: 'Completado', userId: 'test-user'});
    await pending;
  });
  expect(renderer.root.findByProps({testID: 'sdk-status'}).props.children).toBe('VERIFICADO');
  expect(button().props.disabled).toBe(false);
});
