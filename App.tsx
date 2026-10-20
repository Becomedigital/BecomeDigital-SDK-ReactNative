/**
 * Become Digital SDK - React Native Integration
 * Entry point – renders BecomeSDKScreen
 */

import React from 'react';
import {SafeAreaProvider, initialWindowMetrics} from 'react-native-safe-area-context';
import BecomeSDKScreen from './src/screens/BecomeSDKScreen';

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <BecomeSDKScreen />
    </SafeAreaProvider>
  );
}
