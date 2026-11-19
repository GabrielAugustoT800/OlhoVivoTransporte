import React, { useState, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  TouchableWithoutFeedback,
  SafeAreaView 
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(width * 0.8, 320);

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsPanel({ visible, onClose }: SettingsPanelProps) {
  const { theme, colors, setTheme } = useTheme();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: PANEL_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Background overlay to close when clicked */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.backdrop, { backgroundColor: colors.overlay }]} />
        </TouchableWithoutFeedback>

        <Animated.View 
          style={[
            styles.panel, 
            { 
              backgroundColor: colors.surface, 
              transform: [{ translateX: slideAnim }] 
            }
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TEMA</Text>
              
              <View style={styles.optionsContainer}>
                {/* Opção Claro */}
                <TouchableOpacity 
                  style={[
                    styles.optionRow, 
                    { backgroundColor: theme === 'light' ? colors.card : 'transparent', borderColor: theme === 'light' ? colors.primary : colors.border }
                  ]} 
                  onPress={() => setTheme('light')}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>Claro</Text>
                  {theme === 'light' && <Text style={{ color: colors.primary, fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>

                {/* Opção Escuro */}
                <TouchableOpacity 
                  style={[
                    styles.optionRow, 
                    { backgroundColor: theme === 'dark' ? colors.card : 'transparent', borderColor: theme === 'dark' ? colors.primary : colors.border }
                  ]} 
                  onPress={() => setTheme('dark')}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>Escuro</Text>
                  {theme === 'dark' && <Text style={{ color: colors.primary, fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.morePrefsButton, { borderColor: colors.border }]} 
                onPress={() => {
                  onClose();
                  router.push('/preferences');
                }}
              >
                <Text style={[styles.morePrefsText, { color: colors.primary }]}>Mais preferências</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  panel: {
    width: PANEL_WIDTH,
    height: '100%',
    position: 'absolute',
    right: 0,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 1,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 30,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  morePrefsButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  morePrefsText: {
    fontSize: 15,
    fontWeight: '600',
  },
});