// Tela de Preferências do Usuário

// Importa hooks e componentes do React
import React, { useState } from 'react';
// Importa componentes nativos do React Native
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
// Importa hook de preferências
import { usePreferences } from '../hooks/usePreferences';

// Componente da tela de preferências
export default function PreferencesScreen() {
  // Hook para gerenciar preferências
  const { prefs, updatePrefs } = usePreferences();
  // Estado local para indicar se está salvando
  const [saving, setSaving] = useState(false);

  // Função segura para atualizar preferências
  const handleUpdate = async (key: keyof typeof prefs, value: any) => {
    setSaving(true);
    await updatePrefs({ [key]: value });
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Seção de Tema */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tema</Text>
        <Text style={styles.sectionDescription}>Escolha como o app aparecerá na tela</Text>
        
        {/* Tema Claro */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => handleUpdate('theme', 'light')}
        >
          <Text style={styles.optionText}>Claro</Text>
          {prefs.theme === 'light' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Tema Escuro */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => handleUpdate('theme', 'dark')}
        >
          <Text style={styles.optionText}>Escuro</Text>
          {prefs.theme === 'dark' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      </View>

      {/* Seção de Atualização */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atualização automática</Text>
        <Text style={styles.sectionDescription}>Intervalo entre buscas de previsões e veículos</Text>
        
        {/* Opções de intervalo */}
        {(['15', '30', '60'] as const).map((mins) => (
          <TouchableOpacity
            key={mins}
            style={styles.optionRow}
            onPress={() => handleUpdate('pollingInterval', parseInt(mins))}
          >
            <Text style={styles.optionText}>A cada {mins} segundos</Text>
            {prefs.pollingInterval === parseInt(mins) && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Seção de Demonstração */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modo Demonstração</Text>
        <Text style={styles.sectionDescription}>
          Usar dados simulados do GTFS em vez da API real
        </Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Forçar modo demo</Text>
          <Switch
            value={prefs.forceDemoMode}
            onValueChange={(value) => handleUpdate('forceDemoMode', value)}
            trackColor={{ false: '#767577', true: '#81b08c' }}
            thumbColor={prefs.forceDemoMode ? '#f5f4f4' : '#f4f3f4'}
          />
        </View>
        
        {prefs.forceDemoMode && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
            ⚠️ Atualmente forçado ao modo demonstração. A navegação entre linhas 
            usará dados simulados em vez dos veículos em tempo real.
          </Text>
          </View>
        )}
      </View>

      {/* Rodapé informativo */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Alterações salvas automaticamente
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 15,
    color: '#0066cc',
  },
  checkmark: {
    fontSize: 18,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 15,
    color: '#0066cc',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffeeba',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});