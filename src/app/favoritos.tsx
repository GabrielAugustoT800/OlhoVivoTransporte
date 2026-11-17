// Importa hooks e componentes do React
import React, { useState, useEffect } from 'react';
// Importa componentes nativos do React Native
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
// Importa o hook de rota do Expo Router para navegação programática
import { useRouter, useFocusEffect } from 'expo-router';
// Importa a inset segura para contornar notch e barras do sistema
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Importa utilitários de armazenamento local
import { getFavorites, removeFavorite } from '../utils/storage';

// Define a interface para uma linha de ônibus favorita
interface LinhaFavorita {
  // Código único da linha
  cd: number;
  // Nome/número da linha (ex: "2010-10 (Pça da Sé/ V. Mariana)")
  lt: string;
  // Sentido da linha (ex: 1 ou 2)
  sl: number;
  // Descrição do sentido (ex: "IDA" ou "VOLTA")
  tl: string;
}

// Componente da tela Favoritos - linhas favoritas persistidas localmente
export default function FavoritosScreen() {
  // Estado para armazenar a lista de linhas favoritas
  const [favoritas, setFavoritas] = useState<LinhaFavorita[]>([]);
  // Estado para controlar se está carregando
  const [loading, setLoading] = useState(true);
  // Hook para navegação programática (ir para outra tela)
  const router = useRouter();
  // Obtém as insets de segurança (notch, barra de status, etc)
  const insets = useSafeAreaInsets();

  // Hook do Expo Router que executa quando a tela ganha foco (volta do detalhes, por exemplo)
  useFocusEffect(
    // Função de callback que executa quando a tela recebe foco
    React.useCallback(() => {
      // Chama a função para carregar os favoritos
      carregarFavoritos();
      // Função de limpeza (executada quando sair da tela)
      return () => {
        // Nada a limpar por enquanto
      };
    }, [])
  );

  // Função para carregar os favoritos do AsyncStorage
  const carregarFavoritos = async () => {
    // Ativa o estado de carregamento
    setLoading(true);
    try {
      // Obtém os favoritos do AsyncStorage
      const fav = await getFavorites();
      // Armazena no estado
      setFavoritas(fav);
    } catch (error) {
      // Se houver erro, imprime no console
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      // Desativa o estado de carregamento
      setLoading(false);
    }
  };

  // Função para renderizar cada item da lista de favoritas
  const renderLinhaItem = ({ item }: { item: LinhaFavorita }) => (
    // TouchableOpacity fornece feedback visual quando pressionado
    <TouchableOpacity
      // Ao pressionar, navega para a tela de detalhes da linha
      onPress={() => router.push(`/linha/${item.cd}`)}
      // Estilo do container do item
      style={styles.linhaItem}
    >
      {/* Renderiza o código e sentido da linha */}
      <View style={styles.linhaItemContent}>
        {/* Exibe o código da linha */}
        <Text style={styles.linhaItemCode}>{item.lt}</Text>
        {/* Exibe o sentido da linha (IDA/VOLTA) */}
        <Text style={styles.linhaItemSentido}>{item.tl}</Text>
      </View>
      {/* Botão para remover dos favoritos */}
      <TouchableOpacity
        // Ao pressionar, remove a linha dos favoritos
        onPress={async () => {
          // Remove a linha do armazenamento local
          await removeFavorite(item.cd);
          // Recarrega a lista
          carregarFavoritos();
        }}
        // Estilo do botão
        style={styles.removeButton}
      >
        {/* Ícone de X (texto simples) */}
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    // View raiz com padding de segurança
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Renderiza a lista de linhas favoritas */}
      <FlatList
        // Dados a renderizar (array de linhas favoritas)
        data={favoritas}
        // Função para renderizar cada item
        renderItem={renderLinhaItem}
        // Chave única para cada item
        keyExtractor={(item) => item.cd.toString()}
        // Exibe uma mensagem se a lista estiver vazia
        ListEmptyComponent={
          // Se não estiver carregando e não houver favoritas, mostra mensagem
          !loading && favoritas.length === 0 ? (
            // Container com texto centralizado
            <View style={styles.emptyContainer}>
              {/* Ícone de coração vazio (emoji) */}
              <Text style={styles.emptyIcon}>♡</Text>
              {/* Texto informativo */}
              <Text style={styles.emptyText}>Nenhuma linha favorita</Text>
              {/* Instrução para o usuário */}
              <Text style={styles.emptySubText}>Busque linhas e adicione aos favoritos</Text>
            </View>
          ) : undefined
        }
        // Estilo da lista
        style={styles.list}
      />
    </View>
  );
}

// Estilos do componente
const styles = StyleSheet.create({
  // Container raiz
  container: {
    // Ocupa toda a altura disponível
    flex: 1,
    // Cor de fundo branca
    backgroundColor: '#fff',
  },
  // Lista de linhas
  list: {
    // Espaço à volta dos itens
    paddingHorizontal: 12,
  },
  // Container vazio (quando não há favoritas)
  emptyContainer: {
    // Ocupar toda a altura disponível
    flex: 1,
    // Centraliza conteúdo
    justifyContent: 'center',
    alignItems: 'center',
    // Espaço interno
    paddingVertical: 40,
  },
  // Ícone vazio (emoji)
  emptyIcon: {
    // Tamanho grande
    fontSize: 48,
    // Espaço abaixo
    marginBottom: 12,
  },
  // Texto vazio
  emptyText: {
    // Tamanho da fonte
    fontSize: 16,
    // Peso da fonte
    fontWeight: '600',
    // Cor cinza escuro
    color: '#333',
    // Espaço abaixo
    marginBottom: 8,
  },
  // Subtexto vazio
  emptySubText: {
    // Tamanho da fonte
    fontSize: 14,
    // Cor cinza claro
    color: '#999',
  },
  // Item da lista de linhas
  linhaItem: {
    // Exibe os filhos em linha (horizontal)
    flexDirection: 'row',
    // Espaço vertical
    paddingVertical: 12,
    // Espaço horizontal
    paddingHorizontal: 12,
    // Borda inferior
    borderBottomWidth: 1,
    // Cor da borda
    borderBottomColor: '#f0f0f0',
    // Centraliza verticalmente
    alignItems: 'center',
  },
  // Conteúdo do item (texto)
  linhaItemContent: {
    // Ocupar espaço disponível
    flex: 1,
  },
  // Código da linha
  linhaItemCode: {
    // Tamanho da fonte
    fontSize: 16,
    // Peso da fonte
    fontWeight: 'bold',
    // Cor azul
    color: '#0066cc',
    // Espaço abaixo
    marginBottom: 4,
  },
  // Sentido da linha
  linhaItemSentido: {
    // Tamanho da fonte
    fontSize: 13,
    // Cor cinza
    color: '#666',
  },
  // Botão de remover
  removeButton: {
    // Altura fixa
    height: 36,
    // Largura fixa
    width: 36,
    // Cor de fundo clara
    backgroundColor: '#f5f5f5',
    // Arredonda em círculo
    borderRadius: 18,
    // Centraliza conteúdo
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Texto do botão de remover
  removeButtonText: {
    // Tamanho da fonte
    fontSize: 18,
    // Cor cinza
    color: '#999',
  },
});
