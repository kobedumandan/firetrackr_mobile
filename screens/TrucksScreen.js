import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { createUseStyles, useAppPreferences } from '../context/AppPreferencesContext';
import { fetchTrucks } from '../constants/api';
import { useAuth } from '../context/AuthContext';

// Same status → colour mapping as the web dashboard's Trucks page, so a truck
// reads the same on the console and on the phone.
const tonesFor = (Colors) => ({
  available:   { fg: Colors.accentGreen,   bg: Colors.accentGreenDim, label: 'Available' },
  dispatched:  { fg: Colors.accentAmber,   bg: Colors.accentAmberDim, label: 'Dispatched' },
  on_scene:    { fg: Colors.accentBlue,    bg: Colors.accentBlueDim,  label: 'On Scene' },
  maintenance: { fg: Colors.accentFire,    bg: Colors.accentFireDim,  label: 'Maintenance' },
  unavailable: { fg: Colors.textSecondary, bg: Colors.bgHover,        label: 'Unavailable' },
});
const toneOf = (s, Colors) => {
  const tones = tonesFor(Colors);
  return tones[s] ?? tones.unavailable;
};

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'available',   label: 'Available' },
  { key: 'dispatched',  label: 'Dispatched' },
  { key: 'maintenance', label: 'Maintenance' },
];

const truckCode = (id) => `TRK-${String(id).padStart(3, '0')}`;

function lastSeen(iso) {
  if (!iso) return 'No position yet';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins)) return 'No position yet';
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `Updated ${hrs}h ago` : `Updated ${Math.round(hrs / 24)}d ago`;
}


function countTrucks(trucks) {
  const counts = { all: trucks.length, available: 0, dispatched: 0, maintenance: 0 };
  trucks.forEach((truck) => {
    if (truck.truck_status === 'available') counts.available += 1;
    else if (truck.truck_status === 'dispatched' || truck.truck_status === 'on_scene') counts.dispatched += 1;
    else if (truck.truck_status === 'maintenance') counts.maintenance += 1;
  });
  return counts;
}

function StatusBadge({ status }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const tone = toneOf(status, Colors);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]} accessible accessibilityLabel={tone.label}>
      <View style={[styles.badgeDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.badgeText, { color: tone.fg }]} numberOfLines={1}>{tone.label}</Text>
    </View>
  );
}

function FleetOverview({ counts, stationId }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const stats = [
    { label: 'Available', value: counts.available, color: Colors.accentGreen },
    { label: 'On calls', value: counts.dispatched, color: Colors.accentAmber },
    { label: 'In repair', value: counts.maintenance, color: Colors.accentFire },
  ];
  return (
    <View style={styles.overview}>
      <View style={styles.overviewTop}>
        <View style={styles.overviewIcon}>
          <MaterialCommunityIcons name="fire-truck" size={25} color={Colors.accentFire} accessible={false} />
        </View>
        <View style={styles.overviewCopy}>
          <Text style={styles.overviewTitle}>Fleet overview</Text>
          <Text style={styles.overviewSub}>
            {counts.all} {counts.all === 1 ? 'truck' : 'trucks'} {stationId ? 'at your station' : 'across all stations'}
          </Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalValue}>{counts.all}</Text>
          <Text style={styles.totalLabel}>TOTAL</Text>
        </View>
      </View>
      <View style={styles.overviewStats}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={[styles.stat, index > 0 && styles.statDivider]}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <View style={styles.statCaption}>
              <View style={[styles.statDot, { backgroundColor: stat.color }]} />
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TruckCard({ truck, assigned = false, stationName, showStation = false, onRoute }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  return (
    <View style={[styles.truckCard, assigned && styles.assignedCard]}>
      {assigned && (
        <View style={styles.assignedHeading}>
          <Ionicons name="navigate-outline" size={11} color={Colors.accentFire} accessible={false} />
          <Text style={styles.assignedLabel}>YOUR DISPATCH TRUCK</Text>
        </View>
      )}
      <View style={styles.truckTop}>
        <View style={[styles.truckIcon, assigned && styles.assignedIcon]}>
          <MaterialCommunityIcons name="fire-truck" size={assigned ? 28 : 23}
            color={assigned ? Colors.accentFire : Colors.textSecondary} accessible={false} />
        </View>
        <View style={styles.truckIdentity}>
          <Text style={styles.truckCode}>{truckCode(truck.truck_id)}</Text>
          <Text style={[styles.plate, assigned && styles.assignedPlate]} numberOfLines={1}>
            {truck.truck_platenum || 'No plate recorded'}
          </Text>
        </View>
        <StatusBadge status={truck.truck_status} />
      </View>
      {(assigned || showStation) && (
        <View style={styles.stationRow}>
          <Ionicons name="business-outline" size={12} color={Colors.textSecondary} style={styles.metaIcon} accessible={false} />
          <Text style={styles.stationName}>{truck.station_name ?? stationName ?? 'No station assigned'}</Text>
        </View>
      )}
      <View style={styles.truckFooter}>
        <View style={styles.updatedRow}>
          <Ionicons name="time-outline" size={11} color={Colors.textSecondary} style={styles.metaIcon} accessible={false} />
          <Text style={styles.updatedText}>{lastSeen(truck.truck_last_updated)}</Text>
        </View>
        {assigned && onRoute && (
          <TouchableOpacity style={styles.routeBtn} onPress={onRoute} activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button" accessibilityLabel="View assigned truck route">
            <Ionicons name="navigate-outline" size={12} color={Colors.accentFire} accessible={false} />
            <Text style={styles.routeBtnText}>View route</Text>
            <Ionicons name="arrow-forward" size={11} color={Colors.accentFire} accessible={false} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function EmptyState({ title, message, filtered = false }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const Icon = filtered ? Ionicons : MaterialCommunityIcons;
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={filtered ? 'options-outline' : 'fire-truck'} size={26} color={Colors.textSecondary} accessible={false} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{message}</Text>
    </View>
  );
}

export default function TrucksScreen({ navigation }) {
  const { colors: Colors, isDark } = useAppPreferences();
  const styles = useStyles();
  const { token, status, station } = useAuth();
  const stationId = station?.station_id ?? status?.station?.station_id ?? null;
  const stationName = station?.station_name ?? status?.station?.station_name ?? null;
  const myTruckId = status?.dispatch?.truck?.truck_id ?? null;

  const [trucks, setTrucks] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const all = await fetchTrucks(token);
      // Station trucks only; a responder with no station sees the whole fleet.
      setTrucks(stationId ? all.filter((t) => t.station_id === stationId) : all);
      setError(null);
    } catch (err) {
      setError(err.message ?? 'Could not load trucks.');
    }
  }, [token, stationId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };


  const counts = useMemo(() => countTrucks(trucks ?? []), [trucks]);
  const myTruck = trucks?.find((truck) => truck.truck_id === myTruckId) ?? null;
  const otherTrucks = useMemo(
    () => (trucks ?? []).filter((truck) => truck.truck_id !== myTruckId),
    [trucks, myTruckId],
  );
  // Filter counts describe this list; the overview includes the assigned truck.
  const filterCounts = useMemo(() => countTrucks(otherTrucks), [otherTrucks]);
  const visible = otherTrucks.filter((truck) => {
    if (filter === 'all') return true;
    if (filter === 'dispatched') return truck.truck_status === 'dispatched' || truck.truck_status === 'on_scene';
    return truck.truck_status === filter;
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Station Trucks</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{stationName ?? 'All stations'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}
          disabled={refreshing || (trucks === null && !error)}
          accessibilityRole="button" accessibilityLabel="Refresh truck list"
          accessibilityState={{ disabled: refreshing || (trucks === null && !error), busy: refreshing }}>
          {refreshing
            ? <ActivityIndicator size="small" color={Colors.accentFire} />
            : <Ionicons name="refresh-outline" size={17} color={Colors.textSecondary} />}
        </TouchableOpacity>
      </View>

      <View style={styles.scrollWrap}>
        {trucks === null && !error ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accentFire} />
            <Text style={styles.loadingText}>Loading trucks…</Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                tintColor={Colors.accentFire} colors={[Colors.accentFire]}
                progressBackgroundColor={Colors.bgPanel} />
            }>
            {error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={19} color={Colors.accentFire} />
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>{trucks === null ? 'Could not load trucks' : 'Could not refresh fleet'}</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
                <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} disabled={refreshing}
                  accessibilityRole="button" accessibilityLabel="Retry loading trucks">
                  <Text style={styles.retryText}>{refreshing ? 'Retrying…' : 'Retry'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {trucks !== null && <FleetOverview counts={counts} stationId={stationId} />}

            {myTruck && (
              <View style={styles.assignedSection}>
                <TruckCard truck={myTruck} assigned stationName={stationName}
                  onRoute={() => navigation.navigate('Main', { screen: 'Route' })} />
              </View>
            )}

            {otherTrucks.length > 0 && (
              <View style={styles.fleetSection}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>
                    {myTruck ? 'Other station trucks' : stationId ? 'Station trucks' : 'Fleet trucks'}
                  </Text>
                  <Text style={styles.sectionCount}>{visible.length} shown</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {FILTERS.map((item) => {
                    const active = filter === item.key;
                    return (
                      <TouchableOpacity key={item.key} style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setFilter(item.key)} activeOpacity={0.75}
                        accessibilityRole="button" accessibilityState={{ selected: active }}
                        accessibilityLabel={item.label + ', ' + filterCounts[item.key] + ' trucks'}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                        <View style={[styles.chipCountWrap, active && styles.chipCountWrapActive]}>
                          <Text style={[styles.chipCount, active && styles.chipCountActive]}>{filterCounts[item.key]}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {visible.length > 0 ? (
                  <View style={styles.truckList}>
                    {visible.map((truck) => (
                      <TruckCard key={truck.truck_id} truck={truck} showStation={!stationId} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <EmptyState filtered title="No matching trucks"
                      message="Choose another status to see more trucks." />
                  </View>
                )}
              </View>
            )}

            {myTruck && otherTrucks.length === 0 && (
              <View style={styles.emptyCard}>
                <EmptyState title="No other trucks" message="Your station's assigned truck is shown above." />
              </View>
            )}

            {trucks?.length === 0 && (
              <View style={styles.emptyCard}>
                <EmptyState title="No trucks assigned"
                  message={stationId ? 'No trucks are assigned to this station yet.' : 'No trucks have been added to the fleet yet.'} />
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = createUseStyles((Colors) => ({
  root: { flex: 1, backgroundColor: Colors.bgBase },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 13,
    backgroundColor: Colors.bgPanel,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.bgHover,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: 'AxiformaMedium', fontSize: 20, color: Colors.textPrimary, letterSpacing: -0.8 },
  headerSub: {
    fontFamily: 'AxiformaRegular', fontSize: 10.5, color: Colors.textSecondary,
    letterSpacing: -0.2, marginTop: 2,
  },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.borderDim,
  },
  scrollWrap: {
    flex: 1, borderTopLeftRadius: 15, borderTopRightRadius: 15,
    marginHorizontal: 3, backgroundColor: Colors.pageDefaultBase, overflow: 'hidden',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: 'AxiformaRegular', fontSize: 11, color: Colors.textSecondary },

  overview: {
    marginHorizontal: 12, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.borderDim, backgroundColor: Colors.bgPanel,
  },
  overviewTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  overviewIcon: {
    width: 46, height: 46, borderRadius: 13, backgroundColor: Colors.accentFireDim,
    alignItems: 'center', justifyContent: 'center',
  },
  overviewCopy: { flex: 1, minWidth: 0 },
  overviewTitle: { fontFamily: 'AxiformaMedium', fontSize: 15, color: Colors.textPrimary, letterSpacing: -0.4 },
  overviewSub: {
    fontFamily: 'AxiformaRegular', fontSize: 9.5, lineHeight: 14,
    color: Colors.textSecondary, letterSpacing: -0.2, marginTop: 3,
  },
  totalBadge: { alignItems: 'flex-end', paddingLeft: 4 },
  totalValue: { fontFamily: 'AxiformaMedium', fontSize: 26, lineHeight: 31, color: Colors.textPrimary, letterSpacing: -1 },
  totalLabel: { fontFamily: 'AxiformaMedium', fontSize: 7, color: Colors.textSecondary, letterSpacing: 0.7 },
  overviewStats: {
    flexDirection: 'row', marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: Colors.borderDim,
  },
  stat: { flex: 1, minWidth: 0 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: Colors.borderDim, paddingLeft: 14 },
  statValue: { fontFamily: 'AxiformaMedium', fontSize: 25, lineHeight: 30, letterSpacing: -0.8 },
  statCaption: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  statDot: { width: 4, height: 4, borderRadius: 2 },
  statLabel: { flexShrink: 1, fontFamily: 'AxiformaRegular', fontSize: 9.5, lineHeight: 14, color: Colors.textSecondary, letterSpacing: -0.2 },

  assignedSection: { marginTop: 16, marginHorizontal: 12 },
  truckCard: {
    padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.borderDim, backgroundColor: Colors.bgPanel,
  },
  assignedCard: { borderColor: Colors.badgeFire.border, padding: 16 },
  assignedHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  assignedLabel: { fontFamily: 'AxiformaMedium', fontSize: 8.5, letterSpacing: 0.4, color: Colors.accentFire },
  truckTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  truckIcon: {
    width: 40, height: 40, borderRadius: 11, backgroundColor: Colors.bgHover,
    alignItems: 'center', justifyContent: 'center',
  },
  assignedIcon: { width: 48, height: 48, borderRadius: 13, backgroundColor: Colors.accentFireDim },
  truckIdentity: { flex: 1, minWidth: 0 },
  truckCode: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 9, color: Colors.textSecondary,
    letterSpacing: 0.2, marginBottom: 3,
  },
  plate: { fontFamily: 'AxiformaMedium', fontSize: 15, color: Colors.textPrimary, letterSpacing: -0.4 },
  assignedPlate: { fontSize: 20, letterSpacing: -0.7 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '42%',
    borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3,
  },
  badgeDot: { width: 4, height: 4, borderRadius: 2 },
  badgeText: {
    flexShrink: 1, fontFamily: 'AxiformaMedium', fontSize: 8,
    lineHeight: 12, letterSpacing: -0.2, textTransform: 'uppercase',
  },
  stationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  stationName: {
    flex: 1, fontFamily: 'AxiformaRegular', fontSize: 10.5, lineHeight: 15,
    color: Colors.textSecondary, letterSpacing: -0.2,
  },
  metaIcon: { opacity: 0.6, marginTop: 1 },
  truckFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    gap: 8, borderTopWidth: 1, borderTopColor: Colors.borderDim, paddingTop: 10, marginTop: 12,
  },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  updatedText: {
    flexShrink: 1, fontFamily: 'AxiformaRegular', fontSize: 9, lineHeight: 14,
    color: Colors.textSecondary + 'B3', letterSpacing: -0.1,
  },
  routeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: Colors.accentFireDim,
  },
  routeBtnText: { fontFamily: 'AxiformaMedium', fontSize: 9.5, color: Colors.accentFire, letterSpacing: -0.2 },

  fleetSection: { marginTop: 20 },
  sectionHeading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingHorizontal: 16, marginBottom: 10,
  },
  sectionTitle: { flex: 1, fontFamily: 'AxiformaMedium', fontSize: 11, color: Colors.textSecondary, letterSpacing: -0.2 },
  sectionCount: { fontFamily: 'AxiformaRegular', fontSize: 9, color: Colors.textSecondary + '99' },
  chips: { gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 34,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9,
    borderWidth: 1, borderColor: Colors.borderDim, backgroundColor: Colors.bgPanel,
  },
  chipActive: { backgroundColor: Colors.accentFireDim, borderColor: Colors.badgeFire.border },
  chipText: { fontFamily: 'AxiformaMedium', fontSize: 10, color: Colors.textSecondary, letterSpacing: -0.2 },
  chipTextActive: { color: Colors.accentFire },
  chipCountWrap: {
    minWidth: 18, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5,
    alignItems: 'center', backgroundColor: Colors.bgHover,
  },
  chipCountWrapActive: { backgroundColor: Colors.accentFireDim },
  chipCount: { fontFamily: 'AxiformaMedium', fontSize: 8, lineHeight: 12, color: Colors.textSecondary },
  chipCountActive: { color: Colors.accentFire },
  truckList: { marginHorizontal: 12, gap: 10 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 12,
    padding: 12, borderRadius: 12, backgroundColor: Colors.accentFireDim,
    borderWidth: 1, borderColor: Colors.badgeFire.border,
  },
  errorCopy: { flex: 1, minWidth: 0 },
  errorTitle: { fontFamily: 'AxiformaMedium', fontSize: 11, color: Colors.accentFire, marginBottom: 3 },
  errorText: { fontFamily: 'AxiformaRegular', fontSize: 10, lineHeight: 15, color: Colors.textSecondary, letterSpacing: -0.2 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accentFireDim },
  retryText: { fontFamily: 'AxiformaMedium', fontSize: 10, color: Colors.accentFire },
  emptyCard: {
    marginHorizontal: 12, marginTop: 14, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.borderDim, backgroundColor: Colors.bgPanel,
  },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 30 },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 15, backgroundColor: Colors.bgHover,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontFamily: 'AxiformaMedium', fontSize: 13, color: Colors.textPrimary, letterSpacing: -0.3 },
  emptySub: {
    fontFamily: 'AxiformaRegular', fontSize: 10.5, lineHeight: 16, color: Colors.textSecondary + 'B3',
    textAlign: 'center', letterSpacing: -0.2, marginTop: 5,
  },
}));
