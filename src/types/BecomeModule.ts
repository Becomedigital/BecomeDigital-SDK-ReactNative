import { NativeModules } from 'react-native';

export interface BecomeSDKParams {
  clientId: string;
  clientSecret: string;
  contractId: string;
  userId: string;
}

export interface BecomeSDKResult {
  status: string;
  message: string;
  userId: string;
  requestId?: string;
  responseURL?: string;
}

export interface BecomeModuleInterface {
  iniciarBecomeSDK(
    params: BecomeSDKParams
  ): Promise<BecomeSDKResult>;
}

const { BecomeModule } = NativeModules;

export default BecomeModule as BecomeModuleInterface;
