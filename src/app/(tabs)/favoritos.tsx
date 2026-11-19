// Tela Favoritos: linhas favoritas salvas no aparelho.
// Mesmo visual de cards da aba Linhas (selo com o número + sentido + coração).

import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FavoriteItem } from '../../utils/storage';
import { useFavorites } from '../../context/FavoritesContext';
import { FavoriteButton } from '../../components/FavoriteButton';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeColors } from '../../theme/colors';
import { irParaLinha } from '../../utils/navigation';

export default function FavoritosScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Lista vem do contexto: atualiza na hora quando qualquer tela favorita/remove
  const { favoritos, loading } = useFavorites();

  // O coração está sempre cheio aqui; tocar nele remove o item da lista
  const renderLinhaItem = ({ item }: { item: FavoriteItem }) => (
    <TouchableOpacity onPress={() => irParaLinha(router, item)} style={styles.cardLinha}>
      <View style={styles.badge}>
        <Text style={styles.badgeTexto}>{item.lt}</Text>
      </View>
      <View style={styles.cardConteudo}>
        <Text style={styles.cardSentido} numberOfLines={2}>
          {item.tl || 'Ver detalhes da linha'}
        </Text>
        <Text style={styles.cardAcao}>Ver previsões ›</Text>
      </View>
      <FavoriteButton linha={item} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        data={favoritos}
        renderItem={renderLinhaItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listaConteudo}
        ListHeaderComponent={
          favoritos.length > 0 ? (
            <View style={styles.cabecalho}>
              <Text style={styles.cabecalhoTitulo}>
                {favoritos.length} {favoritos.length === 1 ? 'linha salva' : 'linhas salvas'}
              </Text>
              <Text style={styles.cabecalhoTexto}>Toque no ♥ para remover dos favoritos.</Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.vazio}>
              <View style={styles.vazioCirculo}>
                <Text style={styles.vazioIcone}>♡</Text>
              </View>
              <Text style={styles.vazioTitulo}>Nenhuma linha favorita ainda</Text>
              <Text style={styles.vazioTexto}>
                Busque uma linha e toque no ♡ para acessá-la rapidamente por aqui.
              </Text>
              <TouchableOpacity onPress={() => router.push('/linhas')} style={styles.vazioBotao}>
                <Text style={styles.vazioBotaoTexto}>Buscar linhas</Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listaConteudo: { padding: 12, flexGrow: 1 },

    cabecalho: { paddingHorizontal: 2, marginBottom: 12, marginTop: 4 },
    cabecalhoTitulo: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    cabecalhoTexto: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

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
    cardConteudo: { flex: 1 },
    cardSentido: { fontSize: 14, color: colors.text, lineHeight: 19 },
    cardAcao: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 },

    vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
    vazioCirculo: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primarySoftBorder,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    vazioIcone: { fontSize: 40, color: colors.favoriteActive },
    vazioTitulo: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
    vazioTexto: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
    vazioBotao: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
    vazioBotaoTexto: { color: colors.onPrimary, fontWeight: '700' },
  });
}
