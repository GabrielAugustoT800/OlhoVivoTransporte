// Tela Linhas: busca de linhas de ônibus.
// Antes da primeira busca mostra uma tela inicial com favoritos, buscas recentes,
// linhas populares e dicas, para a tela não ficar vazia.

import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { irParaLinha } from '../../utils/navigation';
import { useRealtime } from '../../hooks/useRealtime';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { useFavorites } from '../../context/FavoritesContext';
import { FavoriteButton } from '../../components/FavoriteButton';
import { Linha } from '../../types/sptrans';

// Linhas conhecidas de SP para sugerir na tela inicial (todas existem no GTFS do projeto)
const LINHAS_POPULARES = [
  { termo: '8000', descricao: 'Lapa ↔ Centro' },
  { termo: '875A', descricao: 'Aeroporto ↔ Perdizes' },
  { termo: '702U', descricao: 'Cid. Universitária ↔ Pq. D. Pedro II' },
  { termo: '917H', descricao: 'Pirituba ↔ Vl. Mariana' },
  { termo: '5100', descricao: 'Pinheiros ↔ Pq. D. Pedro II' },
  { termo: '609J', descricao: 'Aeroporto ↔ São Judas' },
];

// Saudação de acordo com o horário
function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function HomeScreen() {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { favoritos } = useFavorites();
  const [searchText, setSearchText] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Último termo buscado (null = nenhuma busca feita ainda → mostra a tela inicial)
  const [termoBuscado, setTermoBuscado] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { source, isDemoMode, ready } = useRealtime();
  const { history, addHistory, clearHistory } = useSearchHistory();

  const handleSearch = async (termo?: string) => {
    const busca = termo !== undefined ? termo : searchText;

    if (!busca.trim()) {
      setError('Digite pelo menos um caractere');
      setTimeout(() => setError(null), 2000);
      return;
    }

    if (termo) setSearchText(termo);

    setLoading(true);
    setError(null);

    try {
      const response = await source.buscarLinhas(busca);
      setLinhas(response);
      setTermoBuscado(busca.trim());
      await addHistory(busca.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar linhas');
      setLinhas([]);
      setTermoBuscado(busca.trim());
    } finally {
      setLoading(false);
    }
  };

  const limparBusca = () => {
    setSearchText('');
    setLinhas([]);
    setError(null);
    setTermoBuscado(null);
  };

  // ---------- Tela inicial (nenhuma busca feita) ----------
  const telaInicial = (
    <ScrollView contentContainerStyle={styles.inicioConteudo} keyboardShouldPersistTaps="handled">
      {/* Cartão de boas-vindas */}
      <View style={styles.boasVindas}>
        <Text style={styles.boasVindasTitulo}>{saudacao()}! 🚌</Text>
        <Text style={styles.boasVindasTexto}>Encontre sua linha e veja os ônibus em tempo real.</Text>
        {ready && (
          <View style={[styles.statusChip, isDemoMode ? styles.statusDemo : styles.statusAoVivo]}>
            <View style={[styles.statusPonto, { backgroundColor: isDemoMode ? colors.warningText : '#2E7D32' }]} />
            <Text style={[styles.statusTexto, { color: isDemoMode ? colors.warningText : colors.text }]}>
              {isDemoMode ? 'Modo demonstração (dados simulados)' : 'Conectado à SPTrans ao vivo'}
            </Text>
          </View>
        )}
      </View>

      {/* Favoritos */}
      <Text style={styles.secaoTitulo}>Seus favoritos</Text>
      {favoritos.length > 0 ? (
        <>
          {favoritos.slice(0, 3).map((fav) => (
            <TouchableOpacity key={fav.key} style={styles.cardLinha} onPress={() => irParaLinha(router, fav)}>
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>{fav.lt}</Text>
              </View>
              <Text style={styles.cardLinhaSentido} numberOfLines={2}>
                {fav.tl}
              </Text>
              <FavoriteButton linha={fav} />
            </TouchableOpacity>
          ))}
          {favoritos.length > 3 && (
            <TouchableOpacity onPress={() => router.push('/favoritos')}>
              <Text style={styles.verTodos}>Ver todos os {favoritos.length} favoritos →</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.cardDica}>
          <Text style={styles.cardDicaTexto}>Toque no ♡ de uma linha para acessá-la rápido por aqui.</Text>
        </View>
      )}

      {/* Buscas recentes */}
      {history.length > 0 && (
        <>
          <View style={styles.secaoCabecalho}>
            <Text style={styles.secaoTitulo}>Buscas recentes</Text>
            <TouchableOpacity onPress={clearHistory} hitSlop={8}>
              <Text style={styles.limpar}>Limpar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chips}>
            {history.slice(0, 8).map((termo, i) => (
              <TouchableOpacity key={`${termo}-${i}`} style={styles.chip} onPress={() => handleSearch(termo)}>
                <Text style={styles.chipTexto}>🕘 {termo}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Linhas populares */}
      <Text style={styles.secaoTitulo}>Linhas populares</Text>
      <View style={styles.grade}>
        {LINHAS_POPULARES.map((l) => (
          <TouchableOpacity key={l.termo} style={styles.popular} onPress={() => handleSearch(l.termo)}>
            <Text style={styles.popularNumero}>{l.termo}</Text>
            <Text style={styles.popularDescricao} numberOfLines={2}>
              {l.descricao}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dica */}
      <View style={styles.cardDica}>
        <Text style={styles.cardDicaTitulo}>💡 Dica</Text>
        <Text style={styles.cardDicaTexto}>
          Busque pelo número (ex: 8000) ou por um bairro ou terminal (ex: Lapa, Pinheiros).
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.lupa}>🔍</Text>
          <TextInput
            placeholder="Número ou nome da linha"
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
            keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={limparBusca} style={styles.clearButton} hitSlop={8}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => handleSearch()} style={styles.searchButton} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.searchButtonText}>Buscar</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.erro}>{error}</Text>}

      {termoBuscado === null && !loading ? (
        telaInicial
      ) : (
        <FlatList
          data={linhas}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listaConteudo}
          ListHeaderComponent={
            !loading && linhas.length > 0 ? (
              <View style={styles.resultadoCabecalho}>
                <Text style={styles.resultadoTexto}>
                  {linhas.length} {linhas.length === 1 ? 'resultado' : 'resultados'} para “{termoBuscado}”
                </Text>
                <TouchableOpacity onPress={limparBusca} hitSlop={8}>
                  <Text style={styles.limpar}>Voltar ao início</Text>
                </TouchableOpacity>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => irParaLinha(router, item)} style={styles.cardLinha}>
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>{item.lt}</Text>
              </View>
              <Text style={styles.cardLinhaSentido} numberOfLines={2}>
                {item.tl}
              </Text>
              <FavoriteButton linha={item} />
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => `${item.cd}-${item.sl}-${index}`}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.vazio}>
                <Text style={styles.vazioIcone}>🚏</Text>
                <Text style={styles.vazioTitulo}>Nenhuma linha encontrada</Text>
                <Text style={styles.vazioTexto}>Confira o número ou tente o nome de um bairro ou terminal.</Text>
                <TouchableOpacity onPress={limparBusca} style={styles.vazioBotao}>
                  <Text style={styles.vazioBotaoTexto}>Voltar ao início</Text>
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Busca
    searchContainer: {
      flexDirection: 'row',
      padding: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      height: 46,
    },
    lupa: { fontSize: 15, marginRight: 6, opacity: 0.7 },
    searchInput: { flex: 1, fontSize: 16, height: '100%', color: colors.text },
    clearButton: { padding: 4 },
    clearButtonText: { fontSize: 16, color: colors.textMuted },
    searchButton: {
      marginLeft: 10,
      paddingHorizontal: 16,
      height: 46,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    searchButtonText: { color: colors.onPrimary, fontWeight: '700' },
    erro: {
      marginHorizontal: 12,
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      fontSize: 13,
      color: colors.danger,
      backgroundColor: colors.dangerBackground,
    },

    // Tela inicial
    inicioConteudo: { padding: 16, paddingBottom: 32 },
    boasVindas: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primarySoftBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
    },
    boasVindasTitulo: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    boasVindasTexto: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusAoVivo: { backgroundColor: colors.surface, borderColor: colors.border },
    statusDemo: { backgroundColor: colors.warningBackground, borderColor: colors.warningBorder },
    statusPonto: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusTexto: { fontSize: 12, fontWeight: '600' },

    secaoCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    secaoTitulo: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10, marginTop: 4 },
    limpar: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 10 },
    verTodos: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 16, marginTop: 2 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipTexto: { fontSize: 13, color: colors.text },

    grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
    popular: {
      width: '48.5%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    popularNumero: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    popularDescricao: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

    cardDica: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardDicaTitulo: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    cardDicaTexto: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

    // Lista de linhas (resultados e favoritos)
    listaConteudo: { padding: 12, flexGrow: 1 },
    resultadoCabecalho: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    resultadoTexto: { fontSize: 13, color: colors.textSecondary, marginBottom: 10, flex: 1 },
    cardLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingLeft: 12,
      paddingRight: 4,
      marginBottom: 10,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginRight: 12,
      minWidth: 84,
      alignItems: 'center',
    },
    badgeTexto: { color: colors.onPrimary, fontWeight: 'bold', fontSize: 15 },
    cardLinhaSentido: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 19 },

    // Sem resultados
    vazio: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
    vazioIcone: { fontSize: 44, marginBottom: 10 },
    vazioTitulo: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
    vazioTexto: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
    vazioBotao: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
    vazioBotaoTexto: { color: colors.primary, fontWeight: '600' },
  });
}
