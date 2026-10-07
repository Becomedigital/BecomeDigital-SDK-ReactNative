import React, {useState, useEffect, useRef} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  KeyboardTypeOptions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import BecomeModule, {
  bridgeDisponible,
  errorDeSDK,
  BecomeSDKParams,
  BecomeSDKResult,
} from '../types/BecomeModule';

// ─── Result state types ────────────────────────────────────────────────────
type VerificationStatus = 'idle' | 'loading' | 'success' | 'pending' | 'error' | 'cancelled';

interface ResultState {
  status: VerificationStatus;
  data?: BecomeSDKResult;
  errorCode?: string;
  errorMessage?: string;
}

// ─── Component ────────────────────────────────────────────────────────────
const BecomeSDKScreen = () => {
  const [clientId, setClientId]         = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [contractId, setContractId]     = useState('');
  const [result, setResult]             = useState<ResultState>({status: 'idle'});
  const scrollRef = useRef<ScrollView>(null);
  const busyRef = useRef(false);
  const bridgeReady = bridgeDisponible();
  const hasSdkError = result.status === 'error' || result.status === 'cancelled';
  const sdkErrorText = hasSdkError
    ? `${result.errorCode ?? 'UNKNOWN_ERROR'}: ${result.errorMessage ?? 'Sin detalle devuelto por la SDK.'}`
    : '';

  // Load testing profile on mount
  useEffect(() => {
    handleLoadConnection();
  }, []);

  const isFormValid =
    clientId.trim() !== '' &&
    clientSecret.trim() !== '' &&
    contractId.trim() !== '';

  const handleStartVerification = async () => {
    if (busyRef.current) return;
    if (!isFormValid) {
      Alert.alert('Campos incompletos', 'Por favor complete todos los campos antes de continuar.');
      return;
    }

    // Lock synchronously, including the time spent in the permission dialog.
    busyRef.current = true;
    Keyboard.dismiss();
    setResult({status: 'loading'});

    // Auto-generate random userId per request
    const generatedUserId = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

    const params: BecomeSDKParams = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      contractId: contractId.trim(),
      userId: generatedUserId,
      // The native demo apps allow screen capture to simplify manual QA.
      preventScreenCapture: false,
    };

    try {
      const response = await BecomeModule.iniciarBecomeSDK(params);
      setResult({status: response.status === 'PENDING' ? 'pending' : 'success', data: response});
    } catch (error) {
      const {code: errorCode, message: errorMessage} = errorDeSDK(error);
      setResult({
        status: errorCode === 'USER_CANCELLED' ? 'cancelled' : 'error',
        errorCode,
        errorMessage,
      });
    } finally {
      busyRef.current = false;
    }
  };

  const handleReset = () => {
    setResult({status: 'idle'});
  };

  const handleSaveConnection = async () => {
    try {
      await AsyncStorage.setItem('testing_clientId', clientId.trim());
      await AsyncStorage.setItem('testing_clientSecret', clientSecret.trim());
      await AsyncStorage.setItem('testing_contractId', contractId.trim());
      Alert.alert('Éxito', 'Conexión de Testing guardada correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la conexión.');
    }
  };

  const handleLoadConnection = async () => {
    try {
      const savedClientId = await AsyncStorage.getItem('testing_clientId');
      const savedClientSecret = await AsyncStorage.getItem('testing_clientSecret');
      const savedContractId = await AsyncStorage.getItem('testing_contractId');
      
      if (savedClientId) setClientId(savedClientId);
      if (savedClientSecret) setClientSecret(savedClientSecret);
      if (savedContractId) setContractId(savedContractId);
    } catch {
      Alert.alert('Configuración local', 'No fue posible cargar el perfil de pruebas.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (hasSdkError) scrollRef.current?.scrollToEnd({animated: true});
            }}>

            {/* ── Header ── */}
            <View style={styles.headerContainer}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoIcon}>
                  <Text style={styles.logoText}>BD</Text>
                </View>
              </View>
              <Text style={styles.title}>Verificación de{'\n'}Identidad Become</Text>
              <Text style={styles.subtitle}>
                Por favor, ingrese sus credenciales para iniciar el proceso de
                validación biométrica y documental.
              </Text>
              <Text testID="bridge-status" style={styles.subtitle}>
                {bridgeReady ? '✓ Bridge nativo conectado' : 'Falta registrar BecomeModule. Recompila la app.'}
              </Text>
            </View>

            {/* ── Form ── */}
            <View style={styles.formCard}>
              <FormField
                label="Client ID"
                placeholder="Ingrese su Client ID"
                value={clientId}
                onChangeText={setClientId}
                icon="🔑"
                editable={result.status !== 'loading'}
              />
              <FormField
                label="Client Secret"
                placeholder="Ingrese su Client Secret"
                value={clientSecret}
                onChangeText={setClientSecret}
                icon="🔒"
                secureTextEntry
                editable={result.status !== 'loading'}
              />
              <FormField
                label="Contract ID"
                placeholder="Ingrese su Contract ID"
                value={contractId}
                onChangeText={setContractId}
                icon="📋"
                keyboardType="numeric"
                editable={result.status !== 'loading'}
                isLast
              />
            </View>

            {/* ── Saved Connections Actions ── */}
            <View style={styles.savedConnectionsRow}>
              <TouchableOpacity style={styles.testingBtn} onPress={handleLoadConnection} disabled={result.status === 'loading'}>
                <Text style={styles.testingBtnText}>🔄 Cargar Testing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.testingBtn} onPress={handleSaveConnection} disabled={result.status === 'loading'}>
                <Text style={styles.testingBtnText}>💾 Guardar Testing</Text>
              </TouchableOpacity>
            </View>

            {/* ── CTA Button ── */}
            <TouchableOpacity
              testID="launch-sdk"
              accessibilityRole="button"
              accessibilityLabel="Iniciar verificación"
              accessibilityState={{disabled: !isFormValid || !bridgeReady || result.status === 'loading', busy: result.status === 'loading'}}
              style={[
                styles.ctaButton,
                (!isFormValid || !bridgeReady || result.status === 'loading') && styles.ctaButtonDisabled,
              ]}
              onPress={handleStartVerification}
              activeOpacity={0.85}
              disabled={!isFormValid || !bridgeReady || result.status === 'loading'}>
              {result.status === 'loading' ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.ctaButtonText}>  Verificando...</Text>
                </View>
              ) : (
                <Text style={styles.ctaButtonText}>🛡️  Iniciar Verificación</Text>
              )}
            </TouchableOpacity>

            {hasSdkError && (
              <View style={styles.sdkErrorContainer}>
                <Text style={styles.sdkErrorLabel}>Error devuelto por la SDK</Text>
                <Text testID="sdk-error" style={styles.sdkErrorValue} selectable accessibilityLiveRegion="polite">
                  {sdkErrorText}
                </Text>
              </View>
            )}

            {/* ── Result Panel ── */}
            {result.status !== 'idle' && result.status !== 'loading' && (
              <ResultPanel result={result} onReset={handleReset} />
            )}

            <View style={styles.footerSpacer} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: string;
  secureTextEntry?: boolean;
  editable?: boolean;
  keyboardType?: KeyboardTypeOptions;
  isLast?: boolean;
}

const FormField = ({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  secureTextEntry = false,
  editable = true,
  keyboardType = 'default',
  isLast = false,
}: FormFieldProps) => (
  <View style={[styles.fieldWrapper, isLast && styles.fieldWrapperLast]}>
    <Text style={styles.fieldLabel}>{icon}  {label}</Text>
    <TextInput
      accessibilityLabel={label}
      testID={label === 'Client ID' ? 'client-id' : label === 'Client Secret' ? 'client-secret' : 'contract-id'}
      style={[styles.textInput, !editable && styles.textInputDisabled]}
      placeholder={placeholder}
      placeholderTextColor={COLORS.placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
      editable={editable}
    />
  </View>
);

interface ResultPanelProps {
  result: ResultState;
  onReset: () => void;
}

const ResultPanel = ({result, onReset}: ResultPanelProps) => {
  const isSuccess   = result.status === 'success';
  const isPending   = result.status === 'pending';
  const isError     = result.status === 'error';
  const config = {
    success: {
      icon: '✅',
      title: 'Éxito',
      message:
        result.data?.message ?? 'La identidad ha sido validada correctamente por el SDK nativo.',
      cardStyle: styles.resultCardSuccess,
      titleStyle: styles.resultTitleSuccess,
      badge: styles.badgeSuccess,
      badgeText: 'VERIFICADO',
    },
    pending: {
      icon: '⏳',
      title: 'Verificación pendiente',
      message: result.data?.message ?? 'El resultado todavía está en proceso.',
      cardStyle: styles.resultCardCancelled,
      titleStyle: styles.resultTitleCancelled,
      badge: styles.badgeCancelled,
      badgeText: 'PENDIENTE',
    },
    error: {
      icon: '❌',
      title: 'Error en Verificación',
      message:
        result.errorMessage ?? 'Hubo un problema procesando los documentos. Intente nuevamente.',
      cardStyle: styles.resultCardError,
      titleStyle: styles.resultTitleError,
      badge: styles.badgeError,
      badgeText: 'ERROR',
    },
    cancelled: {
      icon: '⚠️',
      title: 'Cancelado',
      message: 'El usuario cerró la interfaz del SDK antes de terminar.',
      cardStyle: styles.resultCardCancelled,
      titleStyle: styles.resultTitleCancelled,
      badge: styles.badgeCancelled,
      badgeText: 'CANCELADO',
    },
  };

  const current = isPending ? config.pending : isSuccess ? config.success : isError ? config.error : config.cancelled;

  return (
    <View style={[styles.resultCard, current.cardStyle]}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultIcon}>{current.icon}</Text>
        <View style={styles.resultHeaderText}>
          <Text style={[styles.resultTitle, current.titleStyle]}>
            {current.title}
          </Text>
          <View style={[styles.badge, current.badge]}>
            <Text testID="sdk-status" style={styles.badgeLabel}>{current.badgeText}</Text>
          </View>
        </View>
      </View>

      <View style={styles.resultDivider} />

      <Text style={styles.resultMessage}>{current.message}</Text>

      {(isSuccess || isPending) && result.data && (
        <View style={styles.resultDataGrid}>
          {result.data.requestId && (
            <DataRow label="Request ID" value={result.data.requestId} />
          )}
          <DataRow label="User ID"    value={result.data.userId} />
          <DataRow label="Estado"     value={result.data.status} />
        </View>
      )}

      <TouchableOpacity style={styles.resetButton} onPress={onReset} activeOpacity={0.8}>
        <Text style={styles.resetButtonText}>↩  Nueva Verificación</Text>
      </TouchableOpacity>
    </View>
  );
};

const DataRow = ({label, value}: {label: string; value: string}) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={styles.dataValue} numberOfLines={1} ellipsizeMode="middle">
      {value}
    </Text>
  </View>
);

// ─── Design Tokens ────────────────────────────────────────────────────────
const COLORS = {
  bg:            '#0D1117',
  surface:       '#161B22',
  surfaceLight:  '#1C2330',
  border:        '#30363D',
  accent:        '#238636',
  accentHover:   '#2EA043',
  accentBlue:    '#1F6FEB',
  danger:        '#DA3633',
  warning:       '#9E6A03',
  text:          '#E6EDF3',
  textMuted:     '#8B949E',
  placeholder:   '#484F58',
  white:         '#FFFFFF',
  successBg:     '#0D1F18',
  errorBg:       '#1C0A0A',
  cancelledBg:   '#1A1500',
};

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: {flex: 1},
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accentBlue,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  // Form card
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    marginBottom: 20,
  },
  fieldWrapper: {
    marginBottom: 18,
  },
  fieldWrapperLast: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  textInputDisabled: {
    opacity: 0.55,
  },

  // CTA Button
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: COLORS.accent,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Native SDK error, shown separately so testers can copy its code and message.
  sdkErrorContainer: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  sdkErrorLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  sdkErrorValue: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },

  // Saved Connections Buttons
  savedConnectionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  testingBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  testingBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  // Result card
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 8,
  },
  resultCardSuccess: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.accent,
  },
  resultCardError: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.danger,
  },
  resultCardCancelled: {
    backgroundColor: COLORS.cancelledBg,
    borderColor: '#9E6A03',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  resultTitleSuccess:   {color: '#3FB950'},
  resultTitleError:     {color: '#F85149'},
  resultTitleCancelled: {color: '#D29922'},
  resultDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  resultMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Badges
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeSuccess:   {backgroundColor: '#0D4A23'},
  badgeError:     {backgroundColor: '#4A0D0D'},
  badgeCancelled: {backgroundColor: '#4A3600'},
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.8,
  },

  // Data rows
  resultDataGrid: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dataLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    maxWidth: '60%',
  },

  // Reset button
  resetButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
  },
  resetButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  footerSpacer: {height: 20},
});

export default BecomeSDKScreen;
