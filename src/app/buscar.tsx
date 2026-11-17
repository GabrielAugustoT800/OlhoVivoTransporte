// Importa hooks e componentes do React
import React, { useState } from 'react';
// Importa componentes nativos do React Native
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
// Importa a inset segura para contornar notch e barras do sistema
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Importa o serviço de API do Olho Vivo
import { SPTransAPI } from '../services/sptrans';

// Define a interface para um ponto de parada retornado pela API
interface Parada {
  // Código único da parada
  cp: number;
  // Nome do local/descrição da parada
  np: string;
}

// Componente da tela de Buscar - busca de pontos de parada
export default function BuscarScreen() {
  // Estado para armazenar o texto de busca digitado pelo usuário
  const [searchText, setSearchText] = useState('');
  // Estado para armazenar a lista de paradas retornada pela API
  const [paradas, setParadas] = useState<Parada[]>([]);
  // Estado para controlar o carregamento (mostra spinner enquanto busca)
  const [loading, setLoading] = useState(false);
  // Estado para armazenar mensagens de erro
  const [error, setError] = useState<string | null>(null);
  // Obtém as insets de segurança (notch, barra de status, etc)
  const insets = useSafeAreaInsets();

  // Função que busca as paradas na API Olho Vivo usando o texto de busca
  const handleSearch = async () => {
    // Se o campo de busca estiver vazio, mostra alerta
    if (!searchText.trim()) {
      // Define o estado de erro
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
      // Chama a API do Olho Vivo para buscar paradas por padrão de texto
      const response = await SPTransAPI.buscarParadas(searchText);
      // Armazena o resultado no estado
      setParadas(response);
    } catch (err) {
      // Se houver erro, armazena a mensagem no estado
      setError(err instanceof Error ? err.message : 'Erro ao buscar paradas');
      // Limpa a lista de paradas se houver erro
      setParadas([]);
    } finally {
      // Desativa o spinner de carregamento
      setLoading(false);
    }
  };

  // Função para renderizar cada item da lista de paradas
  const renderParadaItem = ({ item }: { item: Parada }) => (
    // TouchableOpacity fornece feedback visual quando pressionado
    <TouchableOpacity
      // Estilo do container do item
      style={styles.paradaItem}
      // Desabilita se estiver carregando
      disabled={loading}
    >
      {/* Container com os dados da parada */}
      <View style={styles.paradaItemContent}>
        {/* Exibe o código da parada */}
        <Text style={styles.paradaItemCode}>Parada #{item.cp}</Text>
        {/* Exibe o nome/descrição da parada */}
        <Text style={styles.paradaItemName} numberOfLines={2}>
          {item.np}
        </Text>
      </View>
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
          placeholder="Buscar parada (ex: Pça da Sé)"
          // Valor do input vinculado ao estado
          value={searchText}
          // Função chamada quando o texto muda
          onChangeText={setSearchText}
          // Estilo do input
          style={styles.searchInput}
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

      {/* Renderiza informação sobre o uso desta tela */}
      <View style={styles.infoContainer}>
        {/* Título */}
        <Text style={styles.infoTitle}>Buscar Paradas de Ônibus</Text>
        {/* Descrição */}
        <Text style={styles.infoText}>
          Digite o nome de uma rua, avenida ou logradouro para encontrar paradas de ônibus próximas.
        </Text>
      </View>

      {/* Renderiza a lista de paradas */}
      <FlatList
        // Dados a renderizar (array de paradas)
        data={paradas}
        // Função para renderizar cada item
        renderItem={renderParadaItem}
        // Chave única para cada item
        keyExtractor={(item) => item.cp.toString()}
        // Exibe uma mensagem se a lista estiver vazia
        ListEmptyComponent={
          // Se não estiver carregando e não houver paradas, mostra mensagem
          !loading && paradas.length === 0 ? (
            // Container com texto centralizado
            <View style={styles.emptyContainer}>
              {/* Ícone de lupa (texto simples) */}
              <Text style={styles.emptyIcon}>🔍</Text>
              {/* Texto informativo */}
              <Text style={styles.emptyText}>Nenhuma parada encontrada</Text>
              {/* Instrução para o usuário */}
              <Text style={styles.emptySubText}>Tente outro endereço ou parada</Text>
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
    // Espaço à volta
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
  // Container de informações
  infoContainer: {
    // Espaço ao redor
    paddingHorizontal: 12,
    // Espaço vertical
    paddingVertical: 12,
    // Cor de fundo clara
    backgroundColor: '#f9f9f9',
    // Espaço abaixo
    marginBottom: 12,
  },
  // Título da informação
  infoTitle: {
    // Tamanho da fonte
    fontSize: 14,
    // Peso da fonte
    fontWeight: '600',
    // Cor azul
    color: '#0066cc',
    // Espaço abaixo
    marginBottom: 4,
  },
  // Texto da informação
  infoText: {
    // Tamanho da fonte
    fontSize: 13,
    // Cor cinza
    color: '#666',
    // Altura da linha
    lineHeight: 18,
  },
  // Lista de paradas
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
  // Item da lista de paradas
  paradaItem: {
    // Espaço vertical
    paddingVertical: 12,
    // Espaço horizontal
    paddingHorizontal: 12,
    // Borda inferior
    borderBottomWidth: 1,
    // Cor da borda
    borderBottomColor: '#f0f0f0',
  },
  // Conteúdo do item (texto)
  paradaItemContent: {
    // Sem estilos adicionais, usa herança do parent
  },
  // Código da parada
  paradaItemCode: {
    // Tamanho da fonte
    fontSize: 13,
    // Cor cinza claro
    color: '#999',
    // Espaço abaixo
    marginBottom: 4,
  },
  // Nome da parada
  paradaItemName: {
    // Tamanho da fonte
    fontSize: 15,
    // Peso da fonte
    fontWeight: '500',
    // Cor azul
    color: '#0066cc',
    // Altura da linha
    lineHeight: 20,
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
