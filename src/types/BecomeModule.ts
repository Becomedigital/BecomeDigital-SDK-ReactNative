import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

export interface BecomeSDKParams {
  clientId: string;
  clientSecret: string;
  contractId: string;
  userId: string;
  /** Defaults to true. Disable only for an authorized test. */
  preventScreenCapture?: boolean;
}

export interface BecomeSDKResult {
  status: 'SUCCES' | 'PENDING';
  message: string;
  userId: string;
  /** Optional compatibility fields. Neither platform guarantees these values. */
  requestId?: string;
  responseURL?: string;
}

export interface BecomeModuleInterface {
  iniciarBecomeSDK(params: BecomeSDKParams): Promise<BecomeSDKResult>;
}

export class BecomeBridgeError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'BecomeBridgeError';
  }
}

export function bridgeDisponible(): boolean {
  return typeof NativeModules.BecomeModule?.iniciarBecomeSDK === 'function';
}

export function errorDeSDK(cause: unknown): {code: string; message: string} {
  const error = cause as {code?: unknown; message?: unknown} | null;
  return {
    code: typeof error?.code === 'string' ? error.code : 'SDK_ERROR',
    message: typeof error?.message === 'string'
      ? error.message
      : 'La SDK no devolvió un detalle del error.',
  };
}

let active = false;

// Preserve the original import/API while adding runtime checks and camera permission.
const BecomeModule: BecomeModuleInterface = {
  async iniciarBecomeSDK(params) {
    const native = NativeModules.BecomeModule as BecomeModuleInterface | undefined;
    if (!native || !bridgeDisponible()) {
      throw new BecomeBridgeError('SDK_NOT_LINKED', 'Registra BecomeModule en el proyecto nativo y vuelve a compilar.');
    }
    const fields = ['clientId', 'clientSecret', 'contractId', 'userId'] as const;
    if (!params || !fields.every(key =>
      typeof params[key] === 'string' && params[key].trim().length > 0,
    ) || (params.preventScreenCapture != null && typeof params.preventScreenCapture !== 'boolean')) {
      throw new BecomeBridgeError('INVALID_PARAMS', 'Los cuatro campos son obligatorios y deben ser texto; preventScreenCapture debe ser booleano.');
    }
    if (active) {
      throw new BecomeBridgeError('SDK_BUSY', 'Ya existe una verificación en curso.');
    }
    active = true;
    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new BecomeBridgeError('CAMERA_PERMISSION_DENIED', 'Concede el permiso de cámara en Ajustes para continuar.');
        }
      }
      const result = await native.iniciarBecomeSDK({
        clientId: params.clientId.trim(),
        clientSecret: params.clientSecret.trim(),
        contractId: params.contractId.trim(),
        userId: params.userId.trim(),
        preventScreenCapture: params.preventScreenCapture ?? true,
      });
      if (!result || !['SUCCES', 'PENDING'].includes(result.status)
        || typeof result.message !== 'string' || typeof result.userId !== 'string') {
        throw new BecomeBridgeError('INVALID_RESPONSE', 'La SDK devolvió una respuesta no reconocida.');
      }
      return result;
    } finally {
      active = false;
    }
  },
};

export default BecomeModule;
