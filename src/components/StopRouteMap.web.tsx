// Versão web do mapa: react-native-maps não funciona no navegador.
// O Metro usa este arquivo automaticamente na web (extensão .web.tsx),
// então a versão web não quebra. Mostra o resumo e um link para o Google Maps.

import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

export interface ParadaMapa {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  visible: boolean;
  parada: ParadaMapa | null;
  onClose: () => void;
}

export function StopRouteMap({ visible, parada, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!parada) return null;

  const abrir = () =>
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${parada.lat},${parada.lon}&travelmode=walking`
    );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.titulo}>{parada.name}</Text>
          <Text style={styles.texto}>O mapa com o caminho está disponível no app (Android/iOS).</Text>
          <TouchableOpacity onPress={abrir} style={styles.botao}>
            <Text style={styles.botaoTexto}>Ver caminho no Google Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.fechar}>
            <Text style={styles.fecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 },
    titulo: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    texto: { color: colors.textSecondary, marginBottom: 16 },
    botao: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    botaoTexto: { color: colors.onPrimary, fontWeight: '600' },
    fechar: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
    fecharTexto: { color: colors.text, fontWeight: '600' },
  });
}
