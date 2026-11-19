// Tela de Landing/Home - aparece na raiz "/", com botão de entrar

// Importa hooks e componentes do React
import React from 'react';
// Importa componentes nativos do React Native
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// Importa o hook de rota do Expo Router para navegação programática
import { useRouter } from 'expo-router';
// Importa hook de tema para cores dinâmicas
import { useTheme } from '../theme/ThemeContext';

// Componente da tela de landing/home
export default function HomeLandingScreen() {
  // Hook para navegação programática
  const router = useRouter();
  // Hook de tema para cores dinâmicas
  const { colors } = useTheme();

  // Cores baseadas no tema
  const themeColors = {
    background: colors.background,
    primary: colors.primary,
    title: colors.text,
    subtitle: colors.textSecondary,
    footer: colors.textSecondary,
    buttonBackground: colors.primary,
    buttonText: '#fff',
  };

  // Função para navegar para as abas do app (primeira aba = /linhas)
  const entrarNoApp = () => {
    // Navega para a aba Linhas
    router.replace('/linhas');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Logo ou ícone grande */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>👁️</Text>
        <Text style={[styles.title, { color: themeColors.title }]}>Living Eye</Text>
        <Text style={[styles.subtitle, { color: themeColors.subtitle }]}>Ônibus SP - Olho Vivo</Text>
      </View>

      {/* Botão de entrar */}
      <TouchableOpacity style={[styles.entrarButton, { backgroundColor: themeColors.buttonBackground }]} onPress={entrarNoApp}>
        <Text style={[styles.entrarButtonText, { color: themeColors.buttonText }]}>ENTRAR</Text>
      </TouchableOpacity>

      {/* Rodapé informativo */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: themeColors.footer }]}>
          Atualizado em tempo real • Dados do SPTrans
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  entrarButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 40,
  },
  entrarButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});