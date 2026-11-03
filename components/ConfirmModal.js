import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { createUseStyles, useAppPreferences } from '../context/AppPreferencesContext';

/**
 * Shared floating confirmation, styled after the web sign-out dialog.
 * Drive it with `visible` + `onCancel`/`onConfirm`.
 *
 * `tone` picks the confirm button colour:
 *   "danger"  → fire red  (default; destructive/irreversible)
 *   "warning" → amber
 *   "primary" → green
 *
 * Pass `busy` to show a spinner and lock the buttons while the action runs.
 * Icon badges always use the fire accent; `tone` controls the confirm button.
 */
export default function ConfirmModal({
  visible,
  eyebrow = "CONFIRM",
  title,
  message,
  icon = "alert-circle",
  iconSet = "ion",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const tones = tonesFor(Colors);
  const pal = tones[tone] ?? tones.danger;
  const Icon = iconSet === "mci" ? MaterialCommunityIcons : Ionicons;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={busy ? undefined : onCancel}
        />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconHalo}>
              <View style={styles.iconWrap}>
                <Icon name={icon} size={20} color={Colors.accentFire} accessible={false} />
              </View>
            </View>
            <View style={styles.headerText}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              {title ? <Text style={styles.title}>{title}</Text> : null}
            </View>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, busy && styles.btnDisabled]}
              onPress={onCancel}
              activeOpacity={0.85}
              disabled={busy}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: pal.color }, busy && styles.btnDisabled]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tonesFor = (Colors) => ({
  danger:  { color: Colors.accentFire },
  warning: { color: Colors.accentAmber },
  primary: { color: Colors.accentGreen },
});

const useStyles = createUseStyles((Colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.pageDefaultBase,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconHalo: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "rgba(255,77,26,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.accentFireDim,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: "AxiformaMedium",
    fontSize: 9.8,
    lineHeight: 14,
    color: Colors.accentFire,
    letterSpacing: -0.1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontFamily: "AxiformaMedium",
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: "left",
  },
  message: {
    fontFamily: "AxiformaRegular",
    fontSize: 11.8,
    lineHeight: 18,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    textAlign: "left",
    marginTop: 14,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
    width: "100%",
    marginTop: 18,
  },
  btn: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 78,
    minHeight: 36,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelBtn: {
    backgroundColor: Colors.bgHover,
    borderWidth: 1,
    borderColor: Colors.borderDim,
  },
  cancelText: {
    fontFamily: "AxiformaMedium",
    fontSize: 9.8,
    lineHeight: 14,
    color: Colors.textPrimary,
    letterSpacing: -0.1,
    textTransform: "uppercase",
  },
  confirmText: {
    fontFamily: "AxiformaMedium",
    fontSize: 9.8,
    lineHeight: 14,
    color: "#fff",
    letterSpacing: -0.1,
    textTransform: "uppercase",
  },
}));
