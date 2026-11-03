import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { createUseStyles, useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { sendTestPush } from '../utils/notifications';
import Constants from 'expo-constants';
import SettingsModal from '../components/SettingsModal';
import appConfig from '../app.json';

function SectionHeader({ label }) {
  const styles = useStyles();
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function SettingRow({ icon, label, value, onPress, rightElement, disabled = false }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={[styles.row, disabled && styles.rowDisabled]} onPress={onPress}
      disabled={disabled} activeOpacity={0.7} accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { disabled } : undefined}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={16} color={Colors.accentFire} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {rightElement ?? (onPress ? (
          <Ionicons name="chevron-forward" size={15} color={Colors.textSecondary} />
        ) : null)}
      </View>
    </Container>
  );
}

function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

function profileDisplayName(user) {
  if (!user) return 'Officer';
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return full || 'Officer';
}

function avatarInitial(user) {
  const first = (user?.first_name ?? '').trim();
  const last = (user?.last_name ?? '').trim();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
}

export default function SettingsScreen() {
  const { colors: Colors, isDark, theme, updatePreferences } = useAppPreferences();
  const styles = useStyles();
  const { logout, user, token, pushPrefs, setPushPrefs, pushState, retryPushRegistration } = useAuth();
  const [testing, setTesting] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [settingsModal, setSettingsModal] = useState(null);
  const themeLabel = { dark: 'Dark', light: 'Light', system: 'Use device setting' }[theme];
  const version = Constants.expoConfig?.version ?? appConfig.expo.version;

  const selectTheme = async (nextTheme) => {
    setSettingsModal(null);
    try { await updatePreferences({ theme: nextTheme }); }
    catch { Alert.alert('Theme', 'The theme changed, but could not be saved. Please try again.'); }
  };

  const openPhoneSettings = async () => {
    try { await Linking.openSettings(); }
    catch { Alert.alert('Phone Settings', 'Open your phone settings and select this app to manage notification permissions.'); }
  };

  const runTestAlert = async () => {
    if (testing || pushState.state !== 'on') return;
    setTesting(true);
    try {
      await sendTestPush(token);
      Alert.alert('Test Alert', 'Test alert requested. It may take a few seconds to arrive on your registered phones.');
    } catch (err) {
      Alert.alert('Test Alert', err.message);
    } finally {
      setTesting(false);
    }
  };

  const pushNote =
    pushState.state === 'error'      ? pushState.message :
    pushState.state === 'registering' ? 'Registering this phone…' :
    pushState.state === 'on'          ? 'This phone is registered for dispatch alerts, including when the app is in the background.' :
    'Dispatch alerts are off. You will only see a dispatch while the app is open.';

  const name    = profileDisplayName(user);
  const initial = avatarInitial(user);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.scrollWrap}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <SectionHeader label="Profile" />
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              {user?.email ? <Text style={styles.profileMeta}>{user.email}</Text> : null}
              {user?.designation ? <Text style={styles.profileId}>{user.designation}</Text> : null}
            </View>
          </View>
        </View>

        {/* Notifications */}
        <SectionHeader label="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            onPress={() => setPushPrefs({ enabled: !pushPrefs.enabled })}
            rightElement={
              <Switch
                value={pushPrefs.enabled}
                onValueChange={(v) => setPushPrefs({ enabled: v })}
                trackColor={{ false: Colors.border, true: Colors.accentFire }}
                thumbColor="#fff"
              />
            }
          />
          <Text
            style={[styles.note, pushState.state === 'error' && { color: Colors.accentAmber }]}
          >
            {pushNote}
          </Text>
          {pushState.state === 'error' && (
            <SettingRow icon="refresh-outline" label="Retry Notifications" onPress={retryPushRegistration} />
          )}
          <Divider />
          <SettingRow
            icon="volume-high-outline"
            label="Alert Sound"
            value={pushPrefs.sound ? 'Sound' : 'Vibrate'}
            onPress={pushPrefs.enabled ? () => setPushPrefs({ sound: !pushPrefs.sound }) : undefined}
            rightElement={
              <Switch
                value={pushPrefs.sound}
                onValueChange={(v) => setPushPrefs({ sound: v })}
                disabled={!pushPrefs.enabled}
                trackColor={{ false: Colors.border, true: Colors.accentFire }}
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          <SettingRow
            icon="paper-plane-outline"
            label="Send Test Alert"
            value={testing ? 'Sending…' : null}
            onPress={runTestAlert}
            disabled={pushState.state !== 'on' || testing}
          />
          <Divider />
          <SettingRow icon="options-outline" label="Phone Notification Settings" onPress={openPhoneSettings} />
        </View>

        {/* App */}
        <SectionHeader label="Application" />
        <View style={styles.card}>
          <SettingRow icon="moon-outline" label="Theme" value={themeLabel} onPress={() => setSettingsModal('theme')} />
          <Divider />
          <SettingRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => setSettingsModal('privacy')} />
          <Divider />
          <SettingRow icon="document-text-outline" label="Terms of Use" onPress={() => setSettingsModal('terms')} />
        </View>

        {/* About */}
        <SectionHeader label="About" />
        <View style={styles.card}>
          <SettingRow icon="phone-portrait-outline" label="App Version" value={`v${version}`} />
          <Divider />
          <SettingRow icon="business-outline" label="Organization" value="BFP Panabo City" />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutConfirm(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <ConfirmModal
          visible={logoutConfirm}
          eyebrow="SESSION"
          icon="log-out-outline"
          title="Sign Out?"
          message="You'll be signed out and live location tracking will stop. You'll need to log in again to receive dispatches."
          confirmLabel="Sign Out"
          tone="danger"
          onConfirm={() => {
            setLogoutConfirm(false);
            logout();
          }}
          onCancel={() => setLogoutConfirm(false)}
        />

        <SettingsModal visible={settingsModal !== null} onClose={() => setSettingsModal(null)}
          selectedTheme={theme} onSelectTheme={selectTheme}
          document={settingsModal === 'theme' ? null : settingsModal} />

        <View style={styles.bottomPad} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createUseStyles((Colors) => ({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 13,
    backgroundColor: Colors.bgPanel,
  },
  headerTitle: {
    fontFamily: 'AxiformaMedium',
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  scrollWrap: {
    flex: 1,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginHorizontal: 3,
    backgroundColor: Colors.pageDefaultBase,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    fontFamily: 'AxiformaMedium',
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  card: {
    marginHorizontal: 12,
    backgroundColor: Colors.bgPanel,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'AxiformaMedium',
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rowValue: {
    fontFamily: 'AxiformaRegular',
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },
  note: {
    fontFamily: 'AxiformaRegular',
    fontSize: 9.5,
    lineHeight: 14,
    color: `${Colors.textSecondary}99`,
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginTop: -4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderDim,
    marginLeft: 56,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.accentFire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'AxiformaMedium',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.3,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'AxiformaMedium',
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 2,
  },
  profileMeta: {
    fontFamily: 'AxiformaRegular',
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  profileId: {
    fontFamily: 'AxiformaRegular',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  logoutBtn: {
    marginHorizontal: 12,
    marginTop: 22,
    backgroundColor: Colors.accentFire,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.accentFire,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoutText: {
    fontFamily: 'AxiformaMedium',
    fontSize: 12.8,
    color: '#fff',
    letterSpacing: -0.3,
    // textTransform: "uppercase",
  },
  bottomPad: {
    height: 12,
  },
}));
