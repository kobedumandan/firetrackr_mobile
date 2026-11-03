import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createUseStyles, useAppPreferences } from '../context/AppPreferencesContext';
import { SETTINGS_DOCUMENTS } from '../constants/settingsDocuments';

export default function SettingsModal({ visible, onClose, selectedTheme, onSelectTheme, document }) {
  const { colors: Colors } = useAppPreferences();
  const styles = useStyles();
  const content = document ? SETTINGS_DOCUMENTS[document] : null;
  const title = content?.title ?? 'Theme';
  const options = [
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'system', label: 'Use device setting', icon: 'phone-portrait-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {content ? (
          <ScrollView contentContainerStyle={styles.document}>
            <Text style={styles.introduction}>{content.introduction}</Text>
            {content.sections.map(section => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.text}>{section.text}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.options} accessibilityRole="radiogroup">
            {options.map(option => (
              <TouchableOpacity key={option.value} style={styles.option}
                onPress={() => onSelectTheme(option.value)} accessibilityRole="radio"
                accessibilityState={{ checked: selectedTheme === option.value }}>
                <Ionicons name={option.icon} size={20} color={Colors.textPrimary} />
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Ionicons name={selectedTheme === option.value ? 'radio-button-on' : 'radio-button-off'}
                  size={22} color={selectedTheme === option.value ? Colors.accentFire : Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = createUseStyles(Colors => ({
  root: { flex: 1, backgroundColor: Colors.bgBase },
  header: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.borderDim },
  title: { fontFamily: 'AxiformaMedium', fontSize: 19, color: Colors.textPrimary },
  close: { padding: 10, borderRadius: 12, backgroundColor: Colors.bgHover },
  document: { padding: 22, paddingBottom: 40 },
  introduction: { fontFamily: 'AxiformaRegular', fontSize: 13, lineHeight: 21, color: Colors.textSecondary, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'AxiformaMedium', fontSize: 14, color: Colors.textPrimary, marginBottom: 8 },
  text: { fontFamily: 'AxiformaRegular', fontSize: 13, lineHeight: 22, color: Colors.textSecondary },
  options: { padding: 18, gap: 10 },
  option: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.bgPanel, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  optionLabel: { flex: 1, fontFamily: 'AxiformaMedium', fontSize: 14, color: Colors.textPrimary },
}));
