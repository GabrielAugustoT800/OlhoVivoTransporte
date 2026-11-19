import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtime } from '../../hooks/useRealtime';
import { useTheme } from '../../theme/ThemeContext';
import { useFavorites } from '../../context/FavoritesContext';
import { FavoriteButton } from '../../components/FavoriteButton';
import { resolverLinha, LinhaResolvida } from '../../utils/resolverLinha';
import { getLinhaKey } from '../../utils/linhaKey';
import { estimarPrevisoes } from '../../services/previsaoEstimada';

interface Previsao {
  p: number;
  np?: string; // nome da parada (quando a fonte informa)
  t: string;
  s: number;
  minutos?: number; // presente nas previsões estimadas
  estimada?: boolean; // true = calculada pela posição dos ônibus (plano C)
}

interface Veiculo {
  id: number;
  lat: number;
  lon: number;
  hr: string;
}

interface LinhaDetalhes {
  key: string;
  cl: number;
  lt: string;
  tl: string;
  sl: number;
  previsoes: Previsao[];
  veiculos: Veiculo[];
}

export default function LineDetailScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  // `ready` indica que a fonte (API real ou demo) já foi escolhida
  const { source, isDemoMode, ready } = useRealtime();
  const { colors } = useTheme();
  const { toggleFavorito } = useFavorites();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [linha, setLinha] = useState<LinhaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Só carrega depois que a fonte de dados estiver pronta, e recarrega se o modo mudar.
  // Antes rodava só com [codigo]: podia resolver a linha no modo errado (demo x real)
  // e passar um código que a fonte ativa não conhece.
  useEffect(() => {
    if (codigo && ready) carregarDetalhes();
  }, [codigo, ready, isDemoMode, source]);

  const carregarDetalhes = async () => {
    setLoading(true);
    setError(null);

    try {
      let decodedCodigo = String(codigo);
      try {
        decodedCodigo = decodeURIComponent(decodedCodigo);
      } catch {
        // Parâmetro já decodificado pelo expo-router
      }
      const resolved = await resolverLinha(decodedCodigo, source, isDemoMode);

      if (__DEV__) {
        console.log('[detalhe] key:', decodedCodigo, '| modo:', isDemoMode ? 'demo' : 'real', '| resolvida:', resolved);
      }

      if (!resolved) {
        setError('Linha não encontrada ou indisponível');
        setLinha(null);
        return;
      }

      // Busca previsões e veículos em paralelo; a falha de um não esconde o outro
      const [resPrev, resVeic] = await Promise.allSettled([
        source.buscarPrevisoes(resolved.cl),
        source.buscarVeiculos(resolved.cl),
      ]);
      let previsoes = resPrev.status === 'fulfilled' ? resPrev.value : [];
      const veiculos = resVeic.status === 'fulfilled' ? resVeic.value : [];

      // Plano C: a SPTrans às vezes manda veículos mas nenhuma previsão ("ps": []).
      // Nesse caso, estima a chegada pela posição real dos ônibus + trajeto do GTFS.
      if (previsoes.length === 0 && veiculos.length > 0 && resolved.lt) {
        previsoes = estimarPrevisoes(resolved.lt, resolved.sl, veiculos);
        if (__DEV__) console.log('[detalhe] previsões estimadas (plano C):', previsoes.length);
      }

      if (__DEV__) {
        console.log('[detalhe] cl:', resolved.cl, '| previsões:', previsoes.length, '| veículos:', veiculos.length);
        if (resPrev.status === 'rejected') console.warn('[detalhe] erro previsões:', resPrev.reason);
        if (resVeic.status === 'rejected') console.warn('[detalhe] erro veículos:', resVeic.reason);
      }

      // Se as duas chamadas falharam, mostra o erro real em vez de "sem previsões"
      if (resPrev.status === 'rejected' && resVeic.status === 'rejected') {
        const motivo = resPrev.reason instanceof Error ? resPrev.reason.message : 'Falha ao consultar a SPTrans';
        setError(motivo);
      }

      setLinha({
        key: resolved.key,
        cl: resolved.cl,
        lt: resolved.lt,
        tl: resolved.tl,
        sl: resolved.sl,
        previsoes,
        veiculos,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarDetalhes();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
      </View>
    );
  }

  if (error && !linha) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={carregarDetalhes} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!linha) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Nenhum dado disponível</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.linhaCode}>{linha.lt}</Text>
            <Text style={styles.linhaSentido}>{linha.tl}</Text>
          </View>
          <FavoriteButton linha={{ ...linha, cd: linha.cl }} />
        </View>
      </View>

      {error && <Text style={styles.errorMessage}>{error}</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Previsões de Chegada</Text>
        {linha.previsoes?.some((pr) => pr.estimada) && (
          <Text style={styles.estimativaAviso}>Estimativa calculada pela posição atual dos ônibus</Text>
        )}
        {linha.previsoes && linha.previsoes.length > 0 ? (
          linha.previsoes.slice(0, 5).map((previsao, index) => (
            <View key={index} style={styles.previsaoItem}>
              <Text style={styles.previsaoParada}>{previsao.np ? previsao.np : `Parada #${previsao.p}`}</Text>
              <Text style={styles.previsaoHora}>
                {previsao.estimada
                  ? `≈ ${previsao.minutos === 0 ? 'chegando' : `${previsao.minutos} min`} (${previsao.t})`
                  : previsao.t}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>Sem previsões disponíveis no momento</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veículos em Operação</Text>
        {linha.veiculos && linha.veiculos.length > 0 ? (
          linha.veiculos.slice(0, 5).map((veiculo, index) => (
            <View key={index} style={styles.veiculoItem}>
              <Text style={styles.veiculoId}>Veículo #{veiculo.id}</Text>
              <Text style={styles.veiculoCoordenadas}>
                {veiculo.lat.toFixed(5)}, {veiculo.lon.toFixed(5)}
              </Text>
              <Text style={styles.veiculoHora}>{veiculo.hr}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>Sem veículos em operação</Text>
        )}
      </View>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButtonContainer}>
        <Text style={styles.backButtonContainerText}>Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: colors.danger,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    retryButtonText: {
      color: colors.onPrimary,
      fontWeight: '600',
    },
    backButton: {
      backgroundColor: colors.card,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backButtonText: {
      color: colors.text,
      fontWeight: '600',
    },
    errorMessage: {
      color: colors.danger,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      backgroundColor: colors.dangerBackground,
      borderRadius: 4,
      marginBottom: 12,
    },
    header: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    linhaCode: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    linhaSentido: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 12,
    },
    previsaoItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    previsaoParada: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    previsaoHora: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.primary,
    },
    veiculoItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    veiculoId: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    veiculoCoordenadas: {
      fontSize: 13,
      color: colors.primary,
      marginBottom: 4,
    },
    veiculoHora: {
      fontSize: 12,
      color: colors.textMuted,
    },
    estimativaAviso: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    noDataText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 16,
    },
    backButtonContainer: {
      height: 44,
      backgroundColor: colors.primary,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    backButtonContainerText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
