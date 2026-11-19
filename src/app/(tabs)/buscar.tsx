// Importa hooks e componentes do React
import React, { useMemo, useState } from 'react';
// Importa componentes nativos do React Native
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, SafeAreaView } from 'react-native';
// Importa hook para solicitar permissões de localização
import * as Location from 'expo-location';
// Importa a inset segura para contornar notch e barras do sistema
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Importa o hook de tempo real (Real vs Mock)
import { useRealtime } from '../../hooks/useRealtime';
// Importa o repositório de dados GTFS para buscar paradas próximas
import * as gtfs from '../../data/gtfsRepository';
// Importa hook de histórico de buscas
import { useSearchHistory } from '../../hooks/useSearchHistory';
// Importa hook de tema para cores dinâmicas
import { useTheme } from '../../theme/ThemeContext';
// Importa tokens de tema
import { ThemeColors } from '../../theme/colors';
// Mapa com o caminho a pé até a parada (abre como Modal, sem trocar de rota)
import { StopRouteMap, ParadaMapa } from '../../components/StopRouteMap';

// Define a interface para uma parada com distância calculada
interface ParadaLocalizada {
  // Código único da parada
  id: string;
  // Nome do local/descrição da parada
  name: string;
  // Latitude
  lat: number;
  // Longitude
  lon: number;
  // Distância em metros da localização atual
  distancia: number;
}

// Estilos que não dependem de cores (layout, padding, fontSize etc.)
const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
  },
  clearButton: {
    padding: 8,
    paddingRight: 12,
  },
  clearButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchButton: {
    height: 40,
    width: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  locationButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderRadius: 4,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  demoBadge: {
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  historyContainer: {
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  historyItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  paradaItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  paradaItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paradaItemName: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  paradaItemDistance: {
    fontSize: 13,
  },
});

// Cria os estilos que dependem do tema dentro do componente para que
// sejam recriados quando as cores mudam (troca de tema ao vivo).
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    ...baseStyles,
    // Estilos com cor: sobreescritos aqui para pegar as cores do tema
    safeArea: {
      ...baseStyles.safeArea,
      backgroundColor: colors.background,
    },
    container: {
      ...baseStyles.container,
      backgroundColor: colors.background,
    },
    searchContainer: {
      ...baseStyles.searchContainer,
      borderBottomColor: colors.border,
    },
    searchInputWrapper: {
      ...baseStyles.searchInputWrapper,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    searchInput: {
      ...baseStyles.searchInput,
      color: colors.text,
    },
    clearButtonText: {
      ...baseStyles.clearButtonText,
      color: colors.text,
    },
    searchButton: {
      ...baseStyles.searchButton,
      backgroundColor: colors.primary,
    },
    searchButtonText: {
      ...baseStyles.searchButtonText,
      color: colors.onPrimary,
    },
    locationButton: {
      ...baseStyles.locationButton,
      backgroundColor: colors.primary,
    },
    locationButtonText: {
      ...baseStyles.locationButtonText,
      color: colors.onPrimary,
    },
    errorText: {
      ...baseStyles.errorText,
      backgroundColor: colors.dangerBackground,
      color: colors.danger,
    },
    demoBadge: {
      ...baseStyles.demoBadge,
      backgroundColor: colors.warningBackground,
      borderColor: colors.warningBorder,
    },
    demoText: {
      ...baseStyles.demoText,
      color: colors.warningText,
    },
    historyTitle: {
      ...baseStyles.historyTitle,
      color: colors.textSecondary,
    },
    clearHistoryText: {
      ...baseStyles.clearHistoryText,
      color: colors.danger,
    },
    historyItem: {
      ...baseStyles.historyItem,
      backgroundColor: colors.primarySoft,
      borderColor: colors.primarySoftBorder,
    },
    historyItemText: {
      ...baseStyles.historyItemText,
      color: colors.primary,
    },
    infoTitle: {
      ...baseStyles.infoTitle,
      color: colors.text,
    },
    infoText: {
      ...baseStyles.infoText,
      color: colors.textSecondary,
    },
    emptyIcon: {
      ...baseStyles.emptyIcon,
      color: colors.text,
    },
    emptyText: {
      ...baseStyles.emptyText,
      color: colors.text,
    },
    emptySubText: {
      ...baseStyles.emptySubText,
      color: colors.textSecondary,
    },
    paradaItem: {
      ...baseStyles.paradaItem,
      backgroundColor: colors.surface,
      borderBottomColor: colors.divider,
    },
    paradaItemName: {
      ...baseStyles.paradaItemName,
      color: colors.primary,
    },
    paradaItemDistance: {
      ...baseStyles.paradaItemDistance,
      color: colors.primary,
    },
  });
}

// Componente da tela de Buscar - busca de pontos de parada
export default function BuscarScreen() {
  // Hook de tema para cores dinâmicas
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Estado para armazenar o texto de busca digitado pelo usuário
  const [searchText, setSearchText] = useState('');
  // Estado para armazenar a lista de paradas encontradas
  const [paradas, setParadas] = useState<ParadaLocalizada[]>([]);
  // Estado para controlar o carregamento (mostra spinner enquanto busca)
  const [loading, setLoading] = useState(false);
  // Estado para armazenar mensagens de erro
  const [error, setError] = useState<string | null>(null);
  // Estado para mostrar se está na busca por localização
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  // Obtém as insets de segurança (notch, barra de status, etc)
  const insets = useSafeAreaInsets();
  // Obtém a fonte de dados ativa e status de demo
  const { source, isDemoMode } = useRealtime();
  // Hook para histórico de buscas
  const { history, loading: historyLoading, addHistory, clearHistory } = useSearchHistory();
  // Parada escolhida para mostrar no mapa (null = mapa fechado)
  const [paradaSelecionada, setParadaSelecionada] = useState<ParadaMapa | null>(null);

  // Abre o mapa da parada. Se a parada não trouxe coordenadas (ex.: busca por texto no
  // modo demo), completa com o GTFS local.
  const abrirMapa = (item: ParadaLocalizada) => {
    let { lat, lon } = item;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      const doGtfs = gtfs.getStop(item.id);
      if (doGtfs) {
        lat = doGtfs.lat;
        lon = doGtfs.lon;
      }
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError('Não há coordenadas para esta parada.');
      setTimeout(() => setError(null), 2500);
      return;
    }
    setParadaSelecionada({ id: item.id, name: item.name, lat, lon });
  };

  // Função que busca paradas pela API Olho Vivo usando o texto de busca
  const handleSearchByText = async (termo?: string) => {
    // Define qual termo usar (do input ou do histórico)
    const busca = termo !== undefined ? termo : searchText;

    // Se o campo de busca estiver vazio, mostra alerta
    if (!busca.trim()) {
      setError('Digite pelo menos um caractere');
      setTimeout(() => setError(null), 2000);
      return;
    }

    // Se veio do histórico, atualiza o input visualmente
    if (termo) setSearchText(termo);

    // Ativa o spinner de carregamento
    setLoading(true);
    // Limpa o estado de erro anterior
    setError(null);

    try {
      // Usa a fonte ativa via hook
      const response = await source.buscarParadas(busca);
      // Mapeia a resposta para o formato localizado
      const paradasMapeadas = response.map((p: any) => ({
        id: p.cp.toString(),
        name: p.np,
        lat: p.py,
        lon: p.px,
        distancia: 0,
      }));
      // Armazena o resultado no estado
      setParadas(paradasMapeadas);
      // Adiciona ao histórico de buscas
      await addHistory(busca.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar paradas');
      setParadas([]);
    } finally {
      // Desativa o spinner de carregamento
      setLoading(false);
    }
  };

  // Função para buscar paradas próximas à localização atual
  const buscarParadasProximas = async () => {
    // Ativa o estado de busca
    setBuscandoLocal(true);
    // Limpa o estado de erro
    setError(null);
    // Limpa a lista de paradas
    setParadas([]);

    try {
      // Solicita permissão para localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      // Se a permissão foi negada, mostra alerta
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Para buscar paradas próximas, é necessário permitir o acesso à localização.'
        );
        setBuscandoLocal(false);
        return;
      }

      // Obtém a localização atual do usuário
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Ativa o spinner de carregamento
      setLoading(true);

      // Busca paradas próximas usando o repositório GTFS (raio 500m, limite 20)
      const stops = gtfs.getNearbyStops(latitude, longitude, 500, 20);

      // Mapeia as paradas para o formato usado pela tela
      const paradasList = stops.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        distancia: s.distancia,
      }));

      // Armazena no estado
      setParadas(paradasList);

    } catch (err) {
      // Se houver erro, armazena a mensagem
      setError(err instanceof Error ? err.message : 'Erro ao buscar localização');
      setParadas([]);
    } finally {
      // Desativa estados
      setLoading(false);
      setBuscandoLocal(false);
    }
  };

  // Função para renderizar cada item da lista de paradas
  const renderParadaItem = ({ item }: { item: ParadaLocalizada }) => (
    // TouchableOpacity fornece feedback visual quando pressionado
    <TouchableOpacity
      // Estilo do container do item
      style={styles.paradaItem}
      // Toque abre o mapa com o caminho até a parada
      onPress={() => abrirMapa(item)}
      accessibilityRole="button"
      accessibilityLabel={`Ver caminho até ${item.name}`}
    >
      {/* Container com os dados da parada */}
      <View style={styles.paradaItemContent}>
        {/* Exibe o nome da parada */}
        <Text style={styles.paradaItemName} numberOfLines={2}>
          {item.name}
        </Text>
        {/* Exibe a distância da parada */}
        <Text style={styles.paradaItemDistance}>
          {item.distancia < 1000
            ? `${Math.round(item.distancia)}m`
            : `${(item.distancia / 1000).toFixed(1)}km`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea]}>
      <View style={[styles.container]}>
        {/* Container da barra de busca por texto */}
        <View style={[styles.searchContainer]}>
          <View style={[styles.searchInputWrapper]}>
            <TextInput
              placeholder="Buscar parada (ex: Pça da Sé)"
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              style={[styles.searchInput]}
              keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
              onSubmitEditing={() => handleSearchByText()}
            />
            {/* Botão de limpar (X) - aparece quando há texto */}
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchText('');
                  setParadas([]);
                  setError(null);
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleSearchByText()}
            style={styles.searchButton}
            disabled={loading || buscandoLocal}
          >
            {loading ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.searchButtonText}>Buscar</Text>}
          </TouchableOpacity>
        </View>

        {/* Botão para buscar paradas próximas */}
        <TouchableOpacity
          onPress={buscarParadasProximas}
          style={styles.locationButton}
          disabled={loading || buscandoLocal}
        >
          <Text style={styles.locationButtonText}>
            {buscandoLocal ? 'Buscando...' : 'Paradas próximas a mim'}
          </Text>
        </TouchableOpacity>

        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        {isDemoMode && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>MODO DEMONSTRAÇÃO (GTFS)</Text>
          </View>
        )}

        {/* Seção de Histórico de Buscas Recentes */}
        {history.length > 0 && paradas.length === 0 && !loading && !buscandoLocal && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Buscas Recentes</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Limpar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.historyList}>
              {history.map((termo, index) => (
                <TouchableOpacity key={index} style={styles.historyItem} onPress={() => handleSearchByText(termo)}>
                  <Text style={styles.historyItemText}>{termo}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Informação sobre o uso desta tela */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Buscar Paradas de Ônibus</Text>
          <Text style={styles.infoText}>
            Digite o nome de uma rua, avenida ou logradouro para encontrar paradas de ônibus próximas.
          </Text>
          <Text style={styles.infoText}>
            Ou use a localização para ver paradas perto de você (atividade do dispositivo).
          </Text>
        </View>

        {/* Renderiza a lista de paradas */}
        <FlatList
          data={paradas}
          renderItem={renderParadaItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListEmptyComponent={
            !loading && paradas.length === 0 && history.length === 0 && !buscandoLocal ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>{'🔍'}</Text>
                <Text style={styles.emptyText}>Nenhuma parada encontrada</Text>
                <Text style={styles.emptySubText}>
                  Tente outro endereço ou toque em "Paradas próximas a mim"
                </Text>
              </View>
            ) : undefined
          }
          style={styles.list}
          horizontal={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Mapa em tela cheia; fechar volta para a lista como estava */}
      <StopRouteMap
        visible={paradaSelecionada !== null}
        parada={paradaSelecionada}
        onClose={() => setParadaSelecionada(null)}
      />
    </SafeAreaView>
  );
}
