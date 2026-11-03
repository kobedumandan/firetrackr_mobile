import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import IncidentDetailsModal from "../components/IncidentDetailsModal";

import { createUseStyles, useAppPreferences } from '../context/AppPreferencesContext';
import { useAuth } from "../context/AuthContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 18) return "Good Afternoon,";
  return "Good Evening,";
}

function displayName(user) {
  if (!user) return "Officer";
  const name = user.last_name ?? user.first_name ?? "";
  return user.rank && name ? `${user.rank} ${name}` : name || "Officer";
}

function getInitials(user) {
  if (!user) return "?";
  const first = (user.first_name ?? "").trim();
  const last = (user.last_name ?? "").trim();
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return initials || "?";
}

function clockTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function elapsed(iso, now) {
  if (!iso) return null;
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return null;
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

// Shared accents for pills and status values.
const tonesFor = (Colors) => ({
  fire: { fg: Colors.accentFire, bg: Colors.accentFireDim },
  amber: { fg: Colors.accentAmber, bg: Colors.accentAmberDim },
  blue: { fg: Colors.accentBlue, bg: Colors.accentBlueDim },
  green: { fg: Colors.accentGreen, bg: Colors.accentGreenDim },
  muted: { fg: Colors.textSecondary, bg: Colors.bgHover },
});

const DISPATCH_LABEL = {
  dispatched: { label: "Dispatched", tone: "amber" },
  en_route: { label: "En Route", tone: "amber" },
  on_scene: { label: "On Scene", tone: "blue" },
};

function Pill({ label, tone = "muted", outlined = false, onAccent = false }) {
  const { colors: Colors, isDark } = useAppPreferences();
  const styles = useStyles();
  const tones = tonesFor(Colors);
  const t = tones[tone] ?? tones.muted;
  const lightOutline = outlined && !onAccent && !isDark;
  return (
    <View style={[styles.pill, outlined ? styles.pillOutline : { backgroundColor: t.bg }, lightOutline && styles.pillLightOutline]}>
      <Text style={[styles.pillText, { color: outlined ? lightOutline ? Colors.textSecondary : "#fff" : t.fg }]}>{label}</Text>
    </View>
  );
}

function CardArtwork({ source, side = "right", opacity = 0.5, tintColor }) {
  const [cardHeight, setCardHeight] = useState(0);
  const artworkSize = cardHeight * 1.26;

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      onLayout={({ nativeEvent }) => setCardHeight(nativeEvent.layout.height)}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {cardHeight > 0 && (
        <Image
          source={source}
          // Numeric dimensions keep the artwork visible in content-sized cards.
          style={{
            position: "absolute",
            width: artworkSize,
            height: artworkSize,
            top: -cardHeight * 0.16,
            [side]: -artworkSize * (side === "left" ? 0.2 : 0.5),
            opacity,
            tintColor,
          }}
          resizeMode="contain"
          accessible={false}
        />
      )}
    </View>
  );
}

function StatusTile({ artwork, label, value, tone, bolt = false }) {
  const { colors: Colors, isDark } = useAppPreferences();
  const styles = useStyles();
  const tones = tonesFor(Colors);
  const t = tones[tone] ?? tones.muted;
  const glowId = `statusGlow-${label.replace(/\s+/g, "")}`;
  return (
    <View style={styles.statusFrame}>
      <View
        style={styles.statusGlow}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={glowId} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#b8b8b8" stopOpacity={0.22} />
              <Stop offset="0.58" stopColor="#b8b8b8" stopOpacity={0.09} />
              <Stop offset="1" stopColor="#b8b8b8" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${glowId})`} />
        </Svg>
      </View>

      <View style={styles.statusCard}>
        <CardArtwork
          source={artwork}
          side="left"
          opacity={0.42}
          tintColor={isDark ? undefined : Colors.textSecondary}
        />
        <View style={styles.statusContent}>
          <Text style={styles.statusLabel}>{label}</Text>
          <View style={styles.statusValueRow}>
            {bolt ? (
              <Svg width={14} height={14} viewBox="0 -960 960 960" fill={t.fg}>
                <Path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z" />
              </Svg>
            ) : null}
            <Text style={[styles.statusValue, { color: t.fg }]}>{value}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function InfoRow({ label, value, valueColor, last, children }) {
  const styles = useStyles();
  return (
    <View style={[styles.infoRow, last && { marginBottom: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      {children ?? (
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

function QuickTile({ icon, iconSet = "ion", label, sub, onPress, badge }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const Icon = iconSet === "mci" ? MaterialCommunityIcons : Ionicons;
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.quickTop}>
        <View style={styles.quickIcon}>
          <Icon name={icon} size={17} color={Colors.textPrimary} />
        </View>
        {badge ? (
          <View style={styles.quickBadge}>
            <Text style={styles.quickBadgeText}>{badge}</Text>
          </View>
        ) : (
          <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
        )}
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickSub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

/* The one thing a responder opens the app to find out: am I going somewhere,
   and where. Everything about the live dispatch lives in this card. */
function DispatchHero({ dispatch, incident, now, onDetails, onRoute }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const contained = incident?.fire_status === "contained";
  const place = incident?.fire_location_name || incident?.fire_address || "Incident location";
  const since = elapsed(dispatch.dispatch_at, now);
  const truck = dispatch.truck;
  const role = dispatch.is_team_leader ? "Team Leader" : dispatch.is_driver ? "Driver" : "Responder";
  const onFire = !contained;
  const fireText = onFire && styles.heroFireText;
  const glowColor = contained ? Colors.accentGreen : Colors.accentFire;

  return (
    <View style={styles.heroFrame}>
      <View
        style={styles.heroGlow}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="incidentGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={glowColor} stopOpacity={0.32} />
              <Stop offset="0.58" stopColor={glowColor} stopOpacity={0.13} />
              <Stop offset="1" stopColor={glowColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#incidentGlow)" />
        </Svg>
      </View>

      <View style={[styles.hero, styles.heroDispatch, contained ? styles.heroContained : styles.heroActive]}>
        <View
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <CardArtwork
            source={require("../assets/incident-beacon-white.png")}
            opacity={contained ? 0.12 : 0.5}
          />
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <LinearGradient id="incidentScrim" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0" stopColor={contained ? Colors.bgPanel : "#7a2009"} stopOpacity={0.4} />
                <Stop offset="0.58" stopColor={contained ? Colors.bgPanel : "#7a2009"} stopOpacity={0.22} />
                <Stop offset="1" stopColor={contained ? Colors.bgPanel : "#7a2009"} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#incidentScrim)" />
          </Svg>
        </View>

        <View style={styles.heroContent}>
          <View style={styles.heroHeading}>
            <View style={styles.heroHeadingContent}>
              <View style={styles.heroTag}>
                {contained ? (
                  <Text style={[styles.heroTagText, { color: Colors.accentGreen }]}>Fire Contained</Text>
                ) : (
                  <Text style={[styles.heroId, fireText]}>
                    {incident?.fire_id != null ? `Incident #${incident.fire_id}` : `DISP-${dispatch.dispatch_id}`}
                  </Text>
                )}
                {since && <Text style={[styles.heroSince, fireText]}>{since}</Text>}
              </View>
              {contained && (
                <Text style={styles.heroId}>
                  {incident?.fire_id != null ? `Incident #${incident.fire_id}` : `DISP-${dispatch.dispatch_id}`}
                </Text>
              )}
              <Text style={[styles.heroPlace, fireText]}>{place}</Text>
              {incident?.fire_address && incident.fire_address !== place ? (
                <Text style={[styles.heroAddr, fireText]}>{incident.fire_address}</Text>
              ) : null}
            </View>
          </View>

          {incident?.fire_severity || incident?.fire_level ? (
            <View style={styles.heroPills}>
              {incident?.fire_severity && <Pill label={incident.fire_severity} outlined onAccent={onFire} />}
              {incident?.fire_level && <Pill label={incident.fire_level} outlined onAccent={onFire} />}
            </View>
          ) : null}

          <View style={[styles.heroMeta, onFire && styles.heroMetaActive]}>
            <View style={styles.heroMetaItem}>
              <Text style={[styles.heroMetaLabel, fireText]}>Dispatched</Text>
              <Text style={[styles.heroMetaValue, fireText]}>{clockTime(dispatch.dispatch_at)}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Text style={[styles.heroMetaLabel, fireText]}>Truck</Text>
              <Text style={[styles.heroMetaValue, fireText]} numberOfLines={2}>{truck?.truck_platenum ?? "—"}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Text style={[styles.heroMetaLabel, fireText]}>Role</Text>
              <Text style={[styles.heroMetaValue, fireText]} numberOfLines={2}>{role}</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={onDetails} activeOpacity={0.85}>
              <Text style={[styles.btnPrimaryText, onFire && styles.heroActiveButtonText]}>Incident Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={onRoute} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Route">
              <Ionicons name="navigate" size={14} color={onFire ? Colors.accentFire : '#101011'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function StandbyHero({ station, shift }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <View style={styles.standbyRow}>
        <View style={[styles.standbyIcon, { backgroundColor: Colors.accentBlueDim }]}>
          <Ionicons name="shield-checkmark" size={22} color={Colors.accentBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.standbyTitle}>On Standby</Text>
          <Text style={styles.standbySub}>
            No active dispatch. You'll be alerted the moment one comes in.
          </Text>
        </View>
      </View>
      <View style={styles.heroPills}>
        {station && <Pill label={station} tone="muted" />}
        {shift && <Pill label={shift} tone="blue" />}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors: Colors, isDark } = useAppPreferences();
  const styles = useStyles();
  const { user, status, token, refreshStatus, unreadAlerts, trackingState } = useAuth();
  const dispatch = status?.dispatch ?? null;
  const incident = dispatch?.incident ?? null;
  const isTeamLeader = dispatch?.is_team_leader ?? false;
  const team = status?.team ?? null;
  const stationName = status?.station?.station_name ?? null;
  const shiftName = status?.shift?.shift_name ?? null;
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Ticks the "12m ago" on the dispatch card; idle on standby.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!dispatch) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [dispatch]);

  const tracking = status?.tracking?.mode === 'off'
    ? { value: "Off duty", tone: "muted" }
    : !trackingState?.sharing
    ? { value: trackingState?.reason === 'permission_denied' ? 'GPS denied' : 'Connecting', tone: 'amber' }
    : { value: trackingState?.mode === 'standby' ? 'Live · 30s' : "Live", tone: "green" };

  const duty = dispatch
    ? DISPATCH_LABEL[dispatch.personnel_status ?? dispatch.dispatch_status] ?? { label: "Dispatched", tone: "amber" }
    : { label: "Standby", tone: "blue" };

  const loading = status === null;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>{displayName(user)}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate("Alerts")}
            activeOpacity={0.7}
            accessibilityLabel="Alerts"
          >
            <Ionicons name="notifications" size={17} color={Colors.textPrimary} />
            {unreadAlerts > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadAlerts > 9 ? "9+" : unreadAlerts}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate("Settings")}
            activeOpacity={0.8}
            accessibilityLabel="Profile and settings"
          >
            <Text style={styles.avatarText}>{getInitials(user)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.scrollWrap}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          {dispatch ? (
            <DispatchHero
              dispatch={dispatch}
              incident={incident}
              now={now}
              onDetails={() => setDetailsVisible(true)}
              onRoute={() => navigation.navigate("Route")}
            />
          ) : !loading ? (
            <StandbyHero station={stationName} shift={shiftName} />
          ) : (
            <View style={[styles.hero, styles.heroLoading]}>
              <Text style={styles.loadingText}>Loading your status…</Text>
            </View>
          )}

          {/* Status tiles */}
          <View style={styles.statusRow}>
            <StatusTile artwork={require("../assets/tracking-navigation-white.png")} label="Tracking" value={tracking.value} tone={tracking.tone} bolt={trackingState?.sharing && status?.tracking?.mode !== 'off'} />
            <StatusTile artwork={require("../assets/duty-team-white.png")} label="Duty Status" value={duty.label} tone={duty.tone} />
          </View>

          {/* Team */}
          <Text style={styles.sectionHeader}>My Team</Text>
          <View style={styles.card}>
            {team ? (
              <>
                <View style={styles.teamTop}>
                  <View style={styles.teamIcon}>
                    <Ionicons name="flag" size={17} color={Colors.textPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamName} numberOfLines={1}>{team.team_name}</Text>
                    <Text style={styles.teamCode}>{team.team_code ?? "—"}</Text>
                  </View>
                  <Pill
                    label={team.member_role ?? "Member"}
                    tone={team.member_role === "Team Leader" ? "fire" : "green"}
                  />
                </View>
                <View style={styles.cardDivider} />
                <InfoRow label="Station" value={stationName ?? "—"} />
                <InfoRow label="Shift" value="—" last>
                  {shiftName && shiftName !== "—" ? (
                    <View style={styles.shiftChip} accessibilityLabel={shiftName}>
                      <Text style={styles.shiftChipText} numberOfLines={1}>
                        {shiftName.replace(/^Shift\s+/i, "")}
                      </Text>
                    </View>
                  ) : null}
                </InfoRow>
              </>
            ) : (
              <Text style={styles.emptyText}>
                {loading ? "Loading…" : "You aren't assigned to a team yet."}
              </Text>
            )}
          </View>

          {/* Quick access */}
          <Text style={styles.sectionHeader}>Quick Access</Text>
          <View style={styles.quickGrid}>
            <QuickTile
              icon="map"
              label="My Route"
              sub={dispatch ? "Navigate to scene" : "No active route"}
              onPress={() => navigation.navigate("Route")}
            />
            <QuickTile
              icon="notifications"
              label="Alerts"
              sub={unreadAlerts > 0 ? `${unreadAlerts} unread` : "All caught up"}
              badge={unreadAlerts > 0 ? String(unreadAlerts) : null}
              onPress={() => navigation.navigate("Alerts")}
            />
            <QuickTile
              icon="fire-truck"
              iconSet="mci"
              label="Station Trucks"
              sub={stationName ?? "Fleet status"}
              onPress={() => navigation.navigate("Trucks")}
            />
            <QuickTile
              icon="settings"
              label="Settings"
              sub="Alerts & account"
              onPress={() => navigation.navigate("Settings")}
            />
          </View>
        </ScrollView>
      </View>

      <IncidentDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        incident={incident}
        dispatch={dispatch}
        isTeamLeader={isTeamLeader}
        token={token}
        onContained={refreshStatus}
        onArrived={refreshStatus}
        onCreateReport={() =>
          navigation.navigate("Report", {
            incident,
            dispatchId: dispatch?.dispatch_id ?? null,
          })
        }
      />
    </SafeAreaView>
  );
}

const useStyles = createUseStyles((Colors) => ({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
    backgroundColor: Colors.bgPanel,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    fontFamily: "AxiformaRegular",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  name: {
    fontFamily: "AxiformaMedium",
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.bgHover,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.accentFire,
    borderWidth: 2,
    borderColor: Colors.bgPanel,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    fontFamily: "AxiformaMedium",
    fontSize: 8.5,
    color: "#fff",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.accentFire,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "AxiformaMedium",
    fontSize: 14,
    color: "#fff",
    letterSpacing: 0.3,
  },

  // Sheet
  scrollWrap: {
    flex: 1,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginHorizontal: 3,
    backgroundColor: Colors.pageDefaultBase,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontFamily: "AxiformaMedium",
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },

  // Hero
  heroFrame: {
    marginHorizontal: 12,
    marginVertical: 4,
  },
  heroGlow: {
    position: "absolute",
    top: -44,
    bottom: -44,
    left: -48,
    right: -48,
  },
  hero: {
    marginHorizontal: 12,
    backgroundColor: Colors.bgPanel,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    borderRadius: 14,
    padding: 16,
  },
  heroDispatch: {
    marginHorizontal: 0,
    borderRadius: 18,
    overflow: "hidden",
  },
  heroContent: {
    zIndex: 1,
  },
  heroActive: {
    backgroundColor: Colors.accentFire,
    borderColor: Colors.accentFire,
  },
  heroFireText: {
    color: "#fff",
  },
  heroActiveButtonText: {
    color: Colors.accentFire,
  },
  heroHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 78,
  },
  heroHeadingContent: {
    flex: 1,
    minWidth: 0,
  },
  heroContained: {
    borderColor: Colors.badgeGreen.border,
  },
  heroLoading: {
    alignItems: "center",
    paddingVertical: 28,
  },
  loadingText: {
    fontFamily: "AxiformaRegular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  heroTag: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },
  heroTagText: {
    fontFamily: "AxiformaMedium",
    fontSize: 10.5,
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  heroSince: {
    marginLeft: "auto",
    fontFamily: "AxiformaRegular",
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  heroId: {
    fontFamily: "AxiformaMedium",
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  heroPlace: {
    maxWidth: "88%",
    fontFamily: "AxiformaMedium",
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 27,
  },
  heroAddr: {
    maxWidth: "86%",
    fontFamily: "AxiformaRegular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: Colors.borderDim,
    backgroundColor: Colors.bgHover,
  },
  heroMetaActive: {
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(66,16,4,0.16)",
  },
  heroMetaItem: {
    flex: 1,
    minWidth: 0,
  },
  heroMetaLabel: {
    fontFamily: "AxiformaRegular",
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  heroMetaValue: {
    fontFamily: "AxiformaMedium",
    fontSize: 12,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnPrimaryText: {
    fontFamily: "AxiformaMedium",
    fontSize: 12.8,
    color: '#101011',
    letterSpacing: -0.2,
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  standbyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  standbyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  standbyTitle: {
    fontFamily: "AxiformaMedium",
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 2,
  },
  standbySub: {
    fontFamily: "AxiformaRegular",
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },

  // Pills
  pill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillOutline: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: "AxiformaMedium",
    fontSize: 8.8,
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  pillLightOutline: {
    borderColor: Colors.border,
    backgroundColor: Colors.bgHover,
  },

  // Status tiles
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
  },
  statusFrame: {
    flex: 1,
  },
  statusGlow: {
    position: "absolute",
    top: -24,
    bottom: -24,
    left: -24,
    right: -24,
  },
  statusCard: {
    flex: 1,
    minHeight: 72,
    backgroundColor: Colors.bgPanel,
    borderWidth: 0.5,
    borderColor: Colors.borderDim,
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusContent: {
    flex: 1,
    zIndex: 1,
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  statusLabel: {
    fontFamily: "AxiformaMedium",
    fontSize: 10.8,
    letterSpacing: -0.2,
    color: Colors.textSecondary,
    textAlign: "right",
  },
  statusValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  statusValue: {
    flexShrink: 1,
    fontFamily: "AxiformaMedium",
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: "right",
  },

  // Team card
  card: {
    marginHorizontal: 12,
    backgroundColor: Colors.bgPanel,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  teamTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bgHover,
    alignItems: "center",
    justifyContent: "center",
  },
  teamName: {
    fontFamily: "AxiformaMedium",
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  teamCode: {
    fontFamily: "AxiformaRegular",
    fontSize: 10.5,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderDim,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 7,
  },
  infoLabel: {
    fontFamily: "AxiformaRegular",
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    width: 60,
  },
  infoValue: {
    flex: 1,
    fontFamily: "AxiformaMedium",
    fontSize: 11,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  shiftChip: {
    minWidth: 24,
    maxWidth: "70%",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.bgHover,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftChipText: {
    fontFamily: "ShareTechMono_400Regular",
    fontSize: 10.5,
    lineHeight: 16,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontFamily: "AxiformaRegular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 6,
  },

  // Quick access
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 12,
  },
  quickCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: Colors.bgPanel,
    borderWidth: 1,
    borderColor: Colors.borderDim,
    borderRadius: 10,
    padding: 13,
  },
  quickTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Colors.bgHover,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Colors.accentFireDim,
    alignItems: "center",
  },
  quickBadgeText: {
    fontFamily: "AxiformaMedium",
    fontSize: 9.5,
    color: Colors.accentFire,
  },
  quickLabel: {
    fontFamily: "AxiformaMedium",
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  quickSub: {
    fontFamily: "AxiformaRegular",
    fontSize: 10.5,
    color: `${Colors.textSecondary}99`,
    letterSpacing: -0.2,
    marginTop: 2,
  },
}));
