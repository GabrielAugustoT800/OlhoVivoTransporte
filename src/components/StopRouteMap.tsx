// Mapa em tela cheia com o caminho a pé da localização do usuário até a parada escolhida.
// Abre como Modal (não é uma rota): fecha pelo "X" ou pelo botão voltar do Android.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { mapStyleDark } from '../theme/mapStyleDark';
import { buscarRotaAPe, RotaAPe, Coordenada, formatarDistancia, formatarDuracao } from '../services/walkingRoute';

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

type Estado = 'carregando' | 'erro' | 'ok';

export function StopRouteMap({ visible, parada, onClose }: Props) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mapRef = useRef<MapView>(null);

  const [estado, setEstado] = useState<Estado>('carregando');
  const [erro, setErro] = useState<string | null>(null);
  const [origem, setOrigem] = useState<Coordenada | null>(null);
  const [rota, setRota] = useState<RotaAPe | null>(null);

  const destino: Coordenada | null = parada ? { latitude: parada.lat, longitude: parada.lon } : null;

  // Enquadra origem, destino e rota na tela
  const enquadrar = useCallback(
    (coords: Coordenada[]) => {
      if (coords.length === 0) return;
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: insets.top + 80, right: 50, bottom: 220, left: 50 },
        animated: true,
      });
    },
    [insets.top]
  );

  const carregar = useCallback(
    async (signal: AbortSignal) => {
      if (!destino) return;
      setEstado('carregando');
      setErro(null);
      setRota(null);
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') status = (await Location.requestForegroundPermissionsAsync()).status;
        if (status !== 'granted') {
          throw new Error('Permita o acesso à localização para ver o caminho até a parada.');
        }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (signal.aborted) return;
        const minhaPos = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setOrigem(minhaPos);

        const r = await buscarRotaAPe(minhaPos, destino, signal);
        if (signal.aborted) return;
        setRota(r);
        setEstado('ok');
      } catch (e) {
        if (signal.aborted) return;
        setErro(e instanceof Error ? e.message : 'Não foi possível calcular o caminho.');
        setEstado('erro');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parada?.id]
  );

  // Ao abrir (ou trocar de parada), busca localização e rota; ao fechar, cancela
  const controllerRef = useRef<AbortController | null>(null);
  const iniciar = useCallback(() => {
    controllerRef.current?.abort();
    const c = new AbortController();
    controllerRef.current = c;
    carregar(c.signal);
  }, [carregar]);

  useEffect(() => {
    if (visible && parada) iniciar();
    return () => controllerRef.current?.abort();
  }, [visible, parada?.id]);

  // Quando a rota chega, enquadra tudo
  useEffect(() => {
    if (rota && origem && destino) enquadrar([origem, destino, ...rota.coordenadas]);
  }, [rota]);

  const abrirNoAppDeMapas = () => {
    if (!destino) return;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${destino.latitude},${destino.longitude}&travelmode=walking`
    );
  };

  if (!parada || !destino) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...destino, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          showsUserLocation
          showsMyLocationButton={false}
          customMapStyle={Platform.OS === 'android' && theme === 'dark' ? mapStyleDark : []}
          userInterfaceStyle={theme === 'dark' ? 'dark' : 'light'}
        >
          <Marker coordinate={destino} title={parada.name} description="Parada de ônibus" pinColor={colors.stopMarker} />
          {rota && (
            <Polyline
              coordinates={rota.coordenadas}
              strokeColor={colors.routeLine}
              strokeWidth={5}
              lineDashPattern={rota.aproximada ? [10, 8] : undefined}
            />
          )}
        </MapView>

        {/* Botão fechar */}
        <TouchableOpacity
          onPress={onClose}
          style={[styles.botaoRedondo, { top: insets.top + 12, left: 16 }]}
          accessibilityRole="button"
          accessibilityLabel="Fechar mapa"
          hitSlop={8}
        >
          <Text style={styles.botaoRedondoTexto}>✕</Text>
        </TouchableOpacity>

        {/* Botão recentrar */}
        {estado === 'ok' && (
          <TouchableOpacity
            onPress={() => origem && rota && enquadrar([origem, destino, ...rota.coordenadas])}
            style={[styles.botaoRedondo, { top: insets.top + 12, right: 16 }]}
            accessibilityRole="button"
            accessibilityLabel="Recentrar mapa"
            hitSlop={8}
          >
            <Text style={styles.botaoRedondoTexto}>◎</Text>
          </TouchableOpacity>
        )}

        {/* Card inferior */}
        <View style={[styles.card, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.nomeParada} numberOfLines={2}>
            {parada.name}
          </Text>

          {estado === 'carregando' && (
            <View style={styles.linha}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.textoSecundario}>  Calculando o caminho...</Text>
            </View>
          )}

          {estado === 'erro' && (
            <>
              <Text style={styles.textoErro}>{erro}</Text>
              <TouchableOpacity onPress={iniciar} style={styles.botaoPrimario}>
                <Text style={styles.botaoPrimarioTexto}>Tentar novamente</Text>
              </TouchableOpacity>
            </>
          )}

          {estado === 'ok' && rota && (
            <>
              <Text style={styles.resumo}>
                🚶 {formatarDuracao(rota.duracaoSegundos)} · {formatarDistancia(rota.distanciaMetros)}
              </Text>
              {rota.aproximada && (
                <Text style={styles.aviso}>Rota aproximada (linha reta): serviço de rotas indisponível.</Text>
              )}
              <TouchableOpacity onPress={abrirNoAppDeMapas} style={styles.botaoSecundario}>
                <Text style={styles.botaoSecundarioTexto}>Abrir no app de mapas</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    botaoRedondo: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    botaoRedondoTexto: { fontSize: 20, color: colors.text, fontWeight: 'bold' },
    card: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderColor: colors.border,
      elevation: 8,
    },
    nomeParada: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    textoSecundario: { color: colors.textSecondary, fontSize: 14 },
    textoErro: { color: colors.danger, fontSize: 14, marginBottom: 12 },
    resumo: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 6 },
    aviso: { fontSize: 12, fontStyle: 'italic', color: colors.textMuted, marginBottom: 8 },
    botaoPrimario: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    botaoPrimarioTexto: { color: colors.onPrimary, fontWeight: '600' },
    botaoSecundario: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    botaoSecundarioTexto: { color: colors.primary, fontWeight: '600' },
  });
}
