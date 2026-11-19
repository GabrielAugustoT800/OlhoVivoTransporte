import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { SettingsPanel } from './SettingsPanel';
import { useTheme } from '../theme/ThemeContext';

interface SettingsButtonProps {
  // Opções extras caso queira customizar
}

export function SettingsButton() {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();

  return (
    <>
      <TouchableOpacity 
        onPress={() => setVisible(true)} 
        style={styles.button}
      >
        <Text style={[styles.icon, { color: colors.primary }]}>⚙️</Text>
      </TouchableOpacity>
      
      <SettingsPanel 
        visible={visible} 
        onClose={() => setVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
});