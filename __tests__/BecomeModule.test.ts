import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import BecomeModule, {BecomeSDKParams, bridgeDisponible, errorDeSDK} from '../src/types/BecomeModule';

const params: BecomeSDKParams = {clientId: 'test-only', clientSecret: 'test-only', contractId: '2', userId: 'test-user'};
const call = jest.fn();
const originalOS = Platform.OS;
const result = {status: 'PENDING', message: 'En proceso', userId: 'test-user'};

beforeEach(() => {
  call.mockReset().mockResolvedValue(result);
  NativeModules.BecomeModule = {iniciarBecomeSDK: call};
  Object.defineProperty(Platform, 'OS', {value: 'ios', configurable: true});
});
afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(Platform, 'OS', {value: originalOS, configurable: true});
});

test('explica el módulo ausente sin lanzar un TypeError', async () => {
  delete NativeModules.BecomeModule;
  expect(bridgeDisponible()).toBe(false);
  await expect(BecomeModule.iniciarBecomeSDK(params)).rejects.toMatchObject({code: 'SDK_NOT_LINKED'});
});
test.each(['clientId', 'clientSecret', 'contractId', 'userId'])('rechaza %s vacío', async key => {
  await expect(BecomeModule.iniciarBecomeSDK({...params, [key]: ' '})).rejects.toMatchObject({code: 'INVALID_PARAMS'});
  expect(call).not.toHaveBeenCalled();
});
test('rechaza tipos incorrectos', async () => {
  await expect(BecomeModule.iniciarBecomeSDK({...params, userId: 2} as unknown as BecomeSDKParams)).rejects.toMatchObject({code: 'INVALID_PARAMS'});
  await expect(BecomeModule.iniciarBecomeSDK({...params, preventScreenCapture: 'false'} as unknown as BecomeSDKParams)).rejects.toMatchObject({code: 'INVALID_PARAMS'});
  expect(call).not.toHaveBeenCalled();
});
test('normaliza texto y activa protección por defecto', async () => {
  await expect(BecomeModule.iniciarBecomeSDK({...params, clientId: ' test-only '})).resolves.toEqual(result);
  expect(call).toHaveBeenCalledWith({...params, preventScreenCapture: true});
});
test('mantiene false explícito y campos opcionales', async () => {
  call.mockResolvedValue({...result, requestId: 'test-request', responseURL: 'https://example.invalid/result'});
  expect((await BecomeModule.iniciarBecomeSDK({...params, preventScreenCapture: false})).requestId).toBe('test-request');
  expect(call).toHaveBeenCalledWith({...params, preventScreenCapture: false});
});
test('solicita solo cámara y permite reintentar tras denegación', async () => {
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
  const permission = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  await expect(BecomeModule.iniciarBecomeSDK(params)).rejects.toMatchObject({code: 'CAMERA_PERMISSION_DENIED'});
  expect(permission).toHaveBeenCalledTimes(1);
  expect(permission).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.CAMERA);
  expect(call).not.toHaveBeenCalled();
  permission.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  await expect(BecomeModule.iniciarBecomeSDK(params)).resolves.toEqual(result);
});
test('conserva el rechazo nativo y libera el bloqueo', async () => {
  const error = {code: 'USER_CANCELLED', message: 'Cancelación nativa'};
  call.mockRejectedValueOnce(error);
  await expect(BecomeModule.iniciarBecomeSDK(params)).rejects.toBe(error);
  expect(errorDeSDK(error)).toEqual(error);
  await expect(BecomeModule.iniciarBecomeSDK(params)).resolves.toEqual(result);
});
test.each([null, {status: 'UNKNOWN'}, {...result, status: 'ERROR'}, {...result, message: null}])('rechaza respuestas inválidas: %#', async response => {
  call.mockResolvedValue(response);
  await expect(BecomeModule.iniciarBecomeSDK(params)).rejects.toMatchObject({code: 'INVALID_RESPONSE'});
});
test('rechaza otra llamada concurrente y permite una posterior', async () => {
  let finish!: (value: unknown) => void;
  call.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = BecomeModule.iniciarBecomeSDK(params);
  await expect(BecomeModule.iniciarBecomeSDK(params)).rejects.toMatchObject({code: 'SDK_BUSY'});
  finish(result);
  await first;
  await expect(BecomeModule.iniciarBecomeSDK(params)).resolves.toEqual(result);
  expect(call).toHaveBeenCalledTimes(2);
});
