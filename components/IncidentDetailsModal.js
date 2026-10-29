import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { markArrived, markContained, confirmDispatchAction, confirmDispatchClearance } from "../constants/api";
import ConfirmModal from "./ConfirmModal";
import { nextDispatchAction } from "../utils/dispatchActions";

function statusPalette(status) {
  switch ((status || "").toLowerCase()) {
    case "contained":
      return Colors.badgeGreen;
    case "closed":
      return Colors.badgeMuted;
    case "dispatched":
      return Colors.badgeAmber;
    default:
      return Colors.badgeFire; // pending / active
  }
}

function Row({ label, value, valueColor }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={2}
      >
        {value ?? "—"}
      </Text>
    </View>
  );
}

export default function IncidentDetailsModal({
  visible,
  onClose,
  incident,
  dispatch,
  isTeamLeader,
  token,
  onContained,
  onArrived,
  onCreateReport,
}) {
  const [containing, setContaining] = useState(false);
  const [containConfirm, setContainConfirm] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [arriveConfirm, setArriveConfirm] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionConfirm, setActionConfirm] = useState(null);
  const clearanceSubmission = useRef(null);
  const canConfirmAction = isTeamLeader || dispatch?.is_driver;
  const actionTime = value => value ? new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit',
  }) : 'Not recorded';

  const saveAction = async () => {
    if (actionBusy || !actionConfirm || !token || !dispatch?.dispatch_id) return;
    if (actionConfirm !== 'clearance' && (
      !canConfirmAction || isContained || actionConfirm !== nextAction
    )) {
      setActionConfirm(null);
      return;
    }
    setActionBusy(true);
    try {
      if (actionConfirm === 'clearance') {
        if (clearanceSubmission.current?.dispatchId !== dispatch.dispatch_id) {
          clearanceSubmission.current = { dispatchId: dispatch.dispatch_id, body: {
            occurred_at: new Date().toISOString(),
            idempotency_key: `clearance-${dispatch.dispatch_id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          } };
        }
        await confirmDispatchClearance(token, dispatch.dispatch_id, clearanceSubmission.current.body);
      } else await confirmDispatchAction(token, dispatch.dispatch_id, actionConfirm);
      setActionConfirm(null);
      await onArrived?.();
    } catch (err) {
      setActionConfirm(null);
      Alert.alert('Dispatch action', err.message || 'Could not save action. Retry when connected.');
      await onArrived?.();
    } finally { setActionBusy(false); }
  };

  // Personal arrival stays independent of the truck/dispatch arrival.
  const dispatchStatus = dispatch?.dispatch_status ?? null;
  const ownStatus = dispatch?.personnel_status ?? dispatchStatus;
  const enRoute = ownStatus === "dispatched" || ownStatus === "en_route";

  const fireStatus = incident?.fire_status ?? null;
  const isContained = fireStatus === "contained" || fireStatus === "closed";
  const nextAction = nextDispatchAction(dispatch);
  const actionLabel = nextAction === 'acknowledge' ? 'Acknowledge Dispatch'
    : nextAction === 'depart' ? 'Depart for Incident' : 'Arrived on Scene';
  const canTakeNextAction = nextAction === 'arrive' || canConfirmAction;
  // The report can only be filed while the fire is contained (not yet closed),
  // and only by the team leader — filing it closes the incident.
  const canReport = fireStatus === "contained" && isTeamLeader;
  const pal = statusPalette(fireStatus);

  const dispatchId = dispatch?.dispatch_id ? `DISP-${dispatch.dispatch_id}` : "—";
  const coords =
    incident?.fire_latitude != null && incident?.fire_longitude != null
      ? `${Number(incident.fire_latitude).toFixed(5)}, ${Number(
          incident.fire_longitude
        ).toFixed(5)}`
      : "—";
  const reportedAt = (() => {
    const raw = incident?.fire_incident_datetime;
    if (!raw) return "—";
    try {
      return new Date(raw).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return raw;
    }
  })();

  const handleContain = () => {
    if (!token || !dispatch?.dispatch_id || containing) return;
    setContainConfirm(true);
  };

  const confirmArrive = async () => {
    if (!token || !dispatch?.dispatch_id || arriving || actionBusy) return;
    if (nextAction !== 'arrive' || isContained) {
      setArriveConfirm(false);
      return;
    }
    setArriving(true);
    try {
      await markArrived(token, dispatch.dispatch_id);
      setArriveConfirm(false);
      await onArrived?.();
    } catch (err) {
      setArriveConfirm(false);
      Alert.alert("Incident", err.message ?? "Could not mark arrival.");
      // Refresh after a rejected or superseded confirmation.
      await onArrived?.();
    } finally {
      setArriving(false);
    }
  };

  const confirmContain = async () => {
    if (!token || !dispatch?.dispatch_id) return;
    setContaining(true);
    try {
      await markContained(token, dispatch.dispatch_id);
      setContainConfirm(false);
      await onContained?.();
    } catch (err) {
      setContainConfirm(false);
      Alert.alert("Incident", err.message ?? "Could not mark incident contained.");
    } finally {
      setContaining(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Incident Details</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topRow}>
              <View>
                <Text style={styles.idLabel}>Dispatch</Text>
                <Text style={styles.idValue}>{dispatchId}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: pal.bg, borderColor: pal.border },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: pal.text }]}>
                  {fireStatus ?? "—"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Row
              label="Dispatch"
              value={
                enRoute
                  ? "En route"
                  : dispatchStatus === "on_scene"
                  ? "On scene"
                  : dispatchStatus
              }
            />
            <Row label="Fire ID" value={incident?.fire_id != null ? `#${incident.fire_id}` : "—"} />
            <Row label="Address" value={incident?.fire_address} />
            <Row label="Area" value={incident?.fire_location_name} />
            <Row
              label="Alarm"
              value={incident?.fire_level}
              valueColor={Colors.accentFire}
            />
            <Row label="Severity" value={incident?.fire_severity} />
            <Row label="Structure" value={incident?.fire_structure_type} />
            <Row label="Coordinates" value={coords} />
            <Row label="Reported" value={reportedAt} />
            <Row label="Acknowledged · PHT" value={actionTime(dispatch?.acknowledged_at)} />
            <Row label="Departed · PHT" value={actionTime(dispatch?.departed_at)} />
            <Row label="Team cleared · PHT" value={actionTime(dispatch?.cleared_at)} />
            {isTeamLeader && dispatchStatus === 'on_scene' && !dispatch?.cleared_at && <TouchableOpacity style={styles.reportBtn} disabled={actionBusy || containing} onPress={() => setActionConfirm('clearance')}>
              <Text style={styles.containBtnText}>Record Team Clearance</Text>
            </TouchableOpacity>}
          </ScrollView>

          {/* Bottom action */}
          <View style={styles.footer}>
            {enRoute && !isContained ? (
              <>
              <Text style={styles.leaderHint}>
                {nextAction === 'acknowledge' ? 'Step 1 of 3 · Acknowledge'
                  : nextAction === 'depart' ? 'Step 2 of 3 · Depart'
                  : 'Step 3 of 3 · Arrive'}
              </Text>
              {canTakeNextAction ? (
              <TouchableOpacity
                style={styles.containBtn}
                onPress={() => nextAction === 'arrive'
                  ? setArriveConfirm(true) : setActionConfirm(nextAction)}
                activeOpacity={0.85}
                disabled={arriving || actionBusy}
              >
                <Text style={styles.containBtnText}>
                  {arriving || actionBusy ? "Saving..." : actionLabel}
                </Text>
              </TouchableOpacity>
              ) : (
                <Text style={styles.leaderHint}>
                  {nextAction === 'acknowledge'
                    ? 'Waiting for the team leader or driver to acknowledge the dispatch.'
                    : 'Waiting for the team leader or driver to confirm departure.'}
                </Text>
              )}
              <Text style={styles.leaderHint}>Confirm when the action happens. Times are recorded when received by the server.</Text>
              </>
            ) : isContained ? (
              <>
                <View style={[styles.containBtn, styles.containedDone]}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.accentGreen}
                  />
                  <Text
                    style={[styles.containBtnText, { color: Colors.accentGreen }]}
                  >
                    {fireStatus === "closed" ? "Incident Closed" : "Incident Contained"}
                  </Text>
                </View>
                {canReport ? (
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => {
                      onClose?.();
                      onCreateReport?.();
                    }}
                    activeOpacity={0.85}
                  >
                    {/* <Ionicons name="document-text" size={16} color="#fff" /> */}
                    <Text style={styles.containBtnText}>Create Report</Text>
                  </TouchableOpacity>
                ) : fireStatus === "contained" ? (
                  <Text style={[styles.leaderHint, { marginTop: 8 }]}>
                    The team leader will file the incident report.
                  </Text>
                ) : null}
              </>
            ) : isTeamLeader ? (
              <TouchableOpacity
                style={styles.containBtn}
                onPress={handleContain}
                activeOpacity={0.85}
                disabled={containing}
              >
                {/* <Ionicons name="water" size={16} color="#fff" /> */}
                <Text style={styles.containBtnText}>
                  {containing ? "Marking..." : "Mark as Contained"}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.leaderHint}>
                Only the team leader can mark this incident as contained.
              </Text>
            )}
          </View>
        </View>
      </View>

      <ConfirmModal
        visible={actionConfirm != null}
        title={actionConfirm === 'clearance' ? 'Record Team Clearance?' : actionConfirm === 'depart' ? 'Depart for Incident?' : 'Acknowledge Dispatch?'}
        message={actionConfirm === 'clearance' ? 'Confirm all personnel and units in your dispatch are clear of this incident now. Command must verify every responding dispatch before confirming operation completion. This records clearance separately from filing your report.' : actionConfirm === 'depart' ? 'Confirm your team is departing for the incident now.' : 'Confirm your team has received the dispatch.'}
        confirmLabel={actionConfirm === 'clearance' ? 'Confirm Clearance' : actionConfirm === 'depart' ? 'Confirm Departure' : 'Acknowledge'}
        tone="primary"
        busy={actionBusy}
        onConfirm={saveAction}
        onCancel={() => setActionConfirm(null)}
      />
      <ConfirmModal
        visible={arriveConfirm}
        title="Arrived on Scene?"
        message="Confirm you have reached the incident. This records your arrival. Truck arrival is confirmed only for a truck you are manning."
        confirmLabel="Confirm Arrival"
        tone="primary"
        busy={arriving}
        onConfirm={confirmArrive}
        onCancel={() => setArriveConfirm(false)}
      />

      <ConfirmModal
        visible={containConfirm}
        title="Mark as Contained?"
        message="Confirm the fire is contained at this incident. Dispatchers will be notified."
        confirmLabel="Mark Contained"
        tone="primary"
        busy={containing}
        onConfirm={confirmContain}
        onCancel={() => setContainConfirm(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.bgBase,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: "82%",
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  title: {
    fontFamily: "AxiformaMedium",
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
  body: {
    paddingHorizontal: 18,
  },
  bodyContent: {
    paddingTop: 6,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  idLabel: {
    fontFamily: "AxiformaMedium",
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  idValue: {
    fontFamily: "AxiformaMedium",
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: "AxiformaMedium",
    fontSize: 9.5,
    letterSpacing: -0.3,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderDim,
    marginVertical: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 11,
  },
  rowLabel: {
    fontFamily: "AxiformaRegular",
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    width: 92,
  },
  rowValue: {
    fontFamily: "AxiformaMedium",
    fontSize: 12,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDim,
  },
  containBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: Colors.accentFire,
  },
  containedDone: {
    backgroundColor: Colors.accentGreenDim,
    // borderWidth: 1,
    borderColor: Colors.accentGreen,
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: Colors.accentFire,
    marginTop: 10,
  },
  containBtnText: {
    fontFamily: "AxiformaMedium",
    fontSize: 12.8,
    color: "#fff",
    letterSpacing: -0.4,
    // textTransform: "uppercase",
  },
  leaderHint: {
    fontFamily: "AxiformaRegular",
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 6,
    letterSpacing: -0.2,
  },
});
