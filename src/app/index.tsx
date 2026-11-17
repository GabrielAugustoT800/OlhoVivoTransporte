// Importa hooks e componentes do React
import React, { useState, useEffect } from 'react';
// Importa componentes nativos do React Native
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
// Importa o hook de rota do Expo Router para navegação programática
import { useRouter } from 'expo-router';
// Importa a inset segura para contornar notch e barras do sistema
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Importa o serviço de API do Olho Vivo
import { SPTransAPI } from '../services/sptrans';
// Importa utilitários de armazenamento local
import { addFavorite } from '../utils/storage';

// Define a interface para uma linha de ônibus retornada pela API
interface Linha {
  // Código único da linha
  cd: number;
  // Nome/número da linha (ex: "2010-10 (Pça da Sé/ V. Mariana)")
  lt: string;
  // Sentido da linha (ex: 1 ou 2)
  sl: number;
  // Descrição do sentido (ex: "IDA" ou "VOLTA")
  tl: string;
}

// Componente da tela Home - lista de linhas de ônibus
export default function HomeScreen() {
  // Estado para armazenar o texto de busca digitado pelo usuário
  const [searchText, setSearchText] = useState('');
  // Estado para armazenar a lista de linhas retornada pela API
  const [linhas, setLinhas] = useState<Linha[]>([]);
  // Estado para controlar o carregamento (mostra spinner enquanto busca)
  const [loading, setLoading] = useState(false);
  // Estado para armazenar mensagens de erro
  const [error, setError] = useState<string | null>(null);
  // Hook para navegação programática (ir para outra tela)
  const router = useRouter();
  // Obtém as insets de segurança (notch, barra de status, etc)
  const insets = useSafeAreaInsets();

  // Função que busca as linhas na API Olho Vivo usando o texto de busca
  const handleSearch = async () => {
    // Se o campo de busca estiver vazio, mostra alerta
    if (!searchText.trim()) {
      // Limpa o estado de erro
      setError('Digite pelo menos um caractere');
      // Aguarda 2 segundos e limpa o erro
      setTimeout(() => setError(null), 2000);
      // Retorna sem fazer a requisição
      return;
    }

    // Ativa o spinner de carregamento
    setLoading(true);
    // Limpa o estado de erro anterior
    setError(null);

    try {
      // Chama a API do Olho Vivo para buscar linhas por padrão de texto
      const response = await SPTransAPI.buscarLinhas(searchText);
      // Armazena o resultado no estado
      setLinhas(response);
    } catch (err) {
      // Se houver erro, armazena a mensagem no estado
      setError(err instanceof Error ? err.message : 'Erro ao buscar linhas');
      // Limpa a lista de linhas se houver erro
      setLinhas([]);
    } finally {
      // Desativa o spinner de carregamento
      setLoading(false);
    }
  };

  // Função para renderizar cada item da lista de linhas
  const renderLinhaItem = ({ item }: { item: Linha }) => (
    // TouchableOpacity fornece feedback visual quando pressionado
    <TouchableOpacity
      // Ao pressionar, navega para a tela de detalhes da linha
      onPress={() => router.push(`/linha/${item.cd}`)}
      // Estilo do container do item
      style={styles.linhaItem}
    >
      {/* Renderiza o código da linha */}
      <View style={styles.linhaItemContent}>
        {/* Exibe o código da linha */}
        <Text style={styles.linhaItemCode}>{item.lt}</Text>
        {/* Exibe o sentido da linha (IDA/VOLTA) */}
        <Text style={styles.linhaItemSentido}>{item.tl}</Text>
      </View>
      {/* Botão para adicionar aos favoritos */}
      <TouchableOpacity
        // Ao pressionar, adiciona a linha aos favoritos
        onPress={async () => {
          // Adiciona a linha ao armazenamento local do AsyncStorage
          await addFavorite(item);
          // Mostra alerta de sucesso
          setError(`"${item.lt}" adicionada aos favoritos!`);
          // Limpa o alerta após 2 segundos
          setTimeout(() => setError(null), 2000);
        }}
        // Estilo do botão de favorito
        style={styles.favoriteButton}
      >
        {/* Ícone de coração (texto simples, sem dependência) */}
        <Text style={styles.favoriteButtonText}>♥</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    // View raiz com padding de segurança
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Container da barra de busca */}
      <View style={styles.searchContainer}>
        {/* Input para digitar o texto de busca */}
        <TextInput
          // Placeholder quando vazio
          placeholder="Buscar linha (ex: 2010)"
          // Valor do input vinculado ao estado
          value={searchText}
          // Função chamada quando o texto muda
          onChangeText={setSearchText}
          // Estilo do input
          style={styles.searchInput}
          // Tipo de teclado: numérico
          keyboardType="number-pad"
          // Permite buscar ao pressionar a tecla de envio do teclado
          onSubmitEditing={handleSearch}
        />
        {/* Botão para buscar */}
        <TouchableOpacity
          // Ao pressionar, chama a função de busca
          onPress={handleSearch}
          // Estilo do botão
          style={styles.searchButton}
          // Desabilita o botão se estiver carregando
          disabled={loading}
        >
          {/* Renderiza o spinner se estiver carregando, senão mostra "Buscar" */}
          {loading ? (
            // Spinner de carregamento
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            // Texto do botão
            <Text style={styles.searchButtonText}>Buscar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Renderiza mensagem de erro se houver */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Renderiza a lista de linhas */}
      <FlatList
        // Dados a renderizar (array de linhas)
        data={linhas}
        // Função para renderizar cada item
        renderItem={renderLinhaItem}
        // Chave única para cada item
        keyExtractor={(item) => item.cd.toString()}
        // Exibe uma mensagem se a lista estiver vazia
        ListEmptyComponent={
          // Se não estiver carregando e não houver linhas, mostra mensagem
          !loading && linhas.length === 0 ? (
            // Container com texto centralizado
            <View style={styles.emptyContainer}>
              {/* Texto informativo */}
              <Text style={styles.emptyText}>Nenhuma linha encontrada</Text>
              {/* Instrução para o usuário */}
              <Text style={styles.emptySubText}>Digite o número de uma linha para buscar</Text>
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
  // Container da barra de busca
  searchContainer: {
    // Exibe os filhos em linha (horizontal)
    flexDirection: 'row',
    // Espaço entre input e botão
    paddingHorizontal: 12,
    // Espaço vertical
    paddingVertical: 12,
    // Espaço abaixo da barra
    marginBottom: 12,
    // Borda inferior sutil
    borderBottomWidth: 1,
    // Cor da borda
    borderBottomColor: '#e0e0e0',
  },
  // Input de busca
  searchInput: {
    // Ocupar espaço disponível
    flex: 1,
    // Altura do input
    height: 40,
    // Borda do input
    borderWidth: 1,
    // Cor da borda
    borderColor: '#ccc',
    // Arredonda os cantos
    borderRadius: 8,
    // Espaço interno para o texto
    paddingHorizontal: 12,
    // Cor do texto
    color: '#333',
    // Espaço à direita (antes do botão)
    marginRight: 8,
  },
  // Botão de busca
  searchButton: {
    // Altura igual ao input
    height: 40,
    // Largura fixa
    width: 70,
    // Cor de fundo azul
    backgroundColor: '#0066cc',
    // Arredonda os cantos
    borderRadius: 8,
    // Centraliza conteúdo na horizontal e vertical
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Texto do botão de busca
  searchButtonText: {
    // Cor branca
    color: '#fff',
    // Peso da fonte
    fontWeight: '600',
    // Tamanho da fonte
    fontSize: 14,
  },
  // Lista de linhas
  list: {
    // Espaço à volta dos itens
    paddingHorizontal: 12,
  },
  // Container vazio (quando não há resultados)
  emptyContainer: {
    // Ocupar toda a altura disponível
    flex: 1,
    // Centraliza conteúdo
    justifyContent: 'center',
    alignItems: 'center',
    // Espaço interno
    paddingVertical: 40,
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
  // Botão de favorito
  favoriteButton: {
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
  // Texto do botão de favorito
  favoriteButtonText: {
    // Tamanho da fonte
    fontSize: 18,
    // Cor vermelha
    color: '#ff4444',
  },
  // Texto de erro
  errorText: {
    // Cor vermelha
    color: '#ff4444',
    // Espaço horizontal
    paddingHorizontal: 12,
    // Espaço vertical
    paddingVertical: 8,
    // Tamanho da fonte
    fontSize: 13,
    // Fundo claro
    backgroundColor: '#ffebee',
    // Arredonda os cantos
    borderRadius: 4,
    // Espaço abaixo
    marginHorizontal: 12,
    marginBottom: 12,
  },
});
