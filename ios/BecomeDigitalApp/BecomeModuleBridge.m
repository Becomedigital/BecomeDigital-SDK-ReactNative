#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BecomeModule, NSObject)

RCT_EXTERN_METHOD(iniciarBecomeSDK:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
