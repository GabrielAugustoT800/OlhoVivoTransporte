// Importa hooks e componentes do React
import React, { useState, useEffect } from 'react';
// Importa componentes nativos do React Native
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
// Importa hooks do Expo Router para navegação e parâmetros de rota
import { useLocalSearchParams, useRouter } from 'expo-router';
// Importa a inset segura para contornar notch e barras do sistema
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Importa o serviço de API do Olho Vivo
import { SPTransAPI } from '../../services/sptrans';
// Importa utilitários de armazenamento local
import { addFavorite } from '../../utils/storage';

// Define a interface para a previsão de chegada de um ônibus
interface Previsao {
  // Parada de chegada
  p: number;
  // Hora da previsão
  t: string;
  // Sentido da linha
  s: number;
}

// Define a interface para a posição de um veículo
interface Veiculo {
  // Código do veículo
  id: number;
  // Latitude da posição
  lat: number;
  // Longitude da posição (corrigido: agora é number)
  lon: number;
  // Hora da atualização
  hr: string;
}

// Define a interface para os detalhes da linha
interface LinhaDetalhes {
  // Código da linha
  cd: number;
  // Nome/número da linha (ex: "2010-10 (Pça da Sé/ V. Mariana)")
  lt: string;
  // Sentido (IDA ou VOLTA)
  tl: string;
  // Previsões de chegada
  previsoes: Previsao[];
  // Veículos em operação
  veiculos: Veiculo[];
}

// Componente da tela de detalhes da linha
export default function LineDetailScreen() {
  // Obtém o parâmetro 'codigo' da URL (ex: /linha/2010)
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  // Estado para armazenar os detalhes da linha
  const [linha, setLinha] = useState<LinhaDetalhes | null>(null);
  // Estado para controlar o carregamento (mostra spinner enquanto busca)
  const [loading, setLoading] = useState(true);
  // Estado para armazenar mensagens de erro
  const [error, setError] = useState<string | null>(null);
  // Estado para controlar se está atualizando (pull-to-refresh)
  const [refreshing, setRefreshing] = useState(false);
  // Hook para navegação programática
  const router = useRouter();
  // Obtém as insets de segurança (notch, barra de status, etc)
  const insets = useSafeAreaInsets();

  // Hook que executa uma vez ao montar o componente
  useEffect(() => {
    // Se houver um código válido, carrega os detalhes da linha
    if (codigo) {
      // Carrega os detalhes
      carregarDetalhes();
    }
  }, [codigo]);

  // Função para carregar os detalhes da linha
  const carregarDetalhes = async () => {
    // Ativa o estado de carregamento
    setLoading(true);
    // Limpa o estado de erro anterior
    setError(null);

    try {
      // Converte o código para número
      const cd = parseInt(codigo as string, 10);
      // Se o código não for válido, mostra erro
      if (isNaN(cd)) {
        // Define o erro
        setError('Código da linha inválido');
        // Retorna sem fazer a requisição
        return;
      }

      // Busca informações básicas da linha (nome e sentido)
      const linhas = await SPTransAPI.buscarLinhas(cd.toString());
      // Filtra a linha exata pelo código
      const linhaEncontrada = linhas.find((l: any) => l.cd === cd);

      // Busca previsões de chegada da linha na API
      const previsoes = await SPTransAPI.buscarPrevisoes(cd);
      // Busca veículos da linha na API
      const veiculos = await SPTransAPI.buscarVeiculos(cd);

      // Armazena os detalhes no estado com nome e sentido reais da API
      setLinha({
        // Código da linha
        cd,
        // Nome/número da linha vindo da API (ou fallback se não encontrar)
        lt: linhaEncontrada?.lt || `Linha ${cd}`,
        // Sentido da linha vindo da API (ou fallback se não encontrar)
        tl: linhaEncontrada?.tl || 'IDA',
        // Previsões de chegada
        previsoes,
        // Veículos em operação
        veiculos,
      });
    } catch (err) {
      // Se houver erro, armazena a mensagem no estado
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes');
    } finally {
      // Desativa o estado de carregamento
      setLoading(false);
    }
  };

  // Função para atualizar os detalhes (pull-to-refresh)
  const handleRefresh = async () => {
    // Ativa o estado de atualização
    setRefreshing(true);
    // Aguarda um pouco para evitar requisições simultâneas
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Carrega os detalhes novamente
    await carregarDetalhes();
    // Desativa o estado de atualização
    setRefreshing(false);
  };

  // Se estiver carregando, mostra o spinner
  if (loading) {
    return (
      // Container centralizado
      <View style={styles.loadingContainer}>
        {/* Spinner de carregamento */}
        <ActivityIndicator size="large" color="#0066cc" />
        {/* Texto de carregamento */}
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
      </View>
    );
  }

  // Se houver erro e nenhum dado, mostra a mensagem de erro
  if (error && !linha) {
    return (
      // Container centralizado
      <View style={styles.errorContainer}>
        {/* Texto de erro */}
        <Text style={styles.errorText}>{error}</Text>
        {/* Botão para voltar */}
        <TouchableOpacity
          // Ao pressionar, volta para a tela anterior
          onPress={() => router.back()}
          // Estilo do botão
          style={styles.backButton}
        >
          {/* Texto do botão */}
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Se não houver dados, mostra mensagem
  if (!linha) {
    return (
      // Container centralizado
      <View style={styles.errorContainer}>
        {/* Texto de erro */}
        <Text style={styles.errorText}>Nenhum dado disponível</Text>
        {/* Botão para voltar */}
        <TouchableOpacity
          // Ao pressionar, volta para a tela anterior
          onPress={() => router.back()}
          // Estilo do botão
          style={styles.backButton}
        >
          {/* Texto do botão */}
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // ScrollView permite rolar a tela se houver muito conteúdo
    <ScrollView
      // Estilo do container
      style={[styles.container, { paddingBottom: insets.bottom }]}
      // Suporte a pull-to-refresh
      refreshControl={
        // Control de atualização (pull-to-refresh)
        <RefreshControl
          // Função chamada ao fazer pull-to-refresh
          onRefresh={handleRefresh}
          // Se está atualizando
          refreshing={refreshing}
          // Cor do spinner
          tintColor="#0066cc"
        />
      }
    >
      {/* Header com título da linha */}
      <View style={styles.header}>
        {/* Código/nome da linha */}
        <Text style={styles.linhaCode}>{linha.lt}</Text>
        {/* Sentido da linha */}
        <Text style={styles.linhaSentido}>{linha.tl}</Text>
        {/* Botão para adicionar aos favoritos */}
        <TouchableOpacity
          // Ao pressionar, adiciona aos favoritos
          onPress={async () => {
            // Adiciona ao AsyncStorage
            await addFavorite(linha);
            // Mostra alerta
            setError(`"${linha.lt}" adicionada aos favoritos!`);
            // Limpa o alerta após 2 segundos
            setTimeout(() => setError(null), 2000);
          }}
          // Estilo do botão
          style={styles.favoriteButton}
        >
          {/* Ícone de coração */}
          <Text style={styles.favoriteButtonText}>♥</Text>
        </TouchableOpacity>
      </View>

      {/* Se houver erro, mostra mensagem */}
      {error && <Text style={styles.errorMessage}>{error}</Text>}

      {/* Seção de previsões de chegada */}
      <View style={styles.section}>
        {/* Título da seção */}
        <Text style={styles.sectionTitle}>Previsões de Chegada</Text>
        {/* Se houver previsões, lista-as */}
        {linha.previsoes && linha.previsoes.length > 0 ? (
          // Mapa sobre as previsões
          linha.previsoes.slice(0, 5).map((previsao, index) => (
            // Container de cada previsão
            <View key={index} style={styles.previsaoItem}>
              {/* Parada */}
              <Text style={styles.previsaoParada}>Parada #{previsao.p}</Text>
              {/* Hora */}
              <Text style={styles.previsaoHora}>{previsao.t}</Text>
            </View>
          ))
        ) : (
          // Se não houver previsões, mostra mensagem
          <Text style={styles.noDataText}>Sem previsões disponíveis</Text>
        )}
      </View>

      {/* Seção de veículos em operação */}
      <View style={styles.section}>
        {/* Título da seção */}
        <Text style={styles.sectionTitle}>Veículos em Operação</Text>
        {/* Se houver veículos, lista-os */}
        {linha.veiculos && linha.veiculos.length > 0 ? (
          // Mapa sobre os veículos
          linha.veiculos.slice(0, 5).map((veiculo, index) => (
            // Container de cada veículo
            <View key={index} style={styles.veiculoItem}>
              {/* ID do veículo */}
              <Text style={styles.veiculoId}>Veículo #{veiculo.id}</Text>
              {/* Coordenadas */}
              <Text style={styles.veiculoCoordenadas}>
                {veiculo.lat.toFixed(5)}, {veiculo.lon.toFixed(5)}
              </Text>
              {/* Hora da atualização */}
              <Text style={styles.veiculoHora}>{veiculo.hr}</Text>
            </View>
          ))
        ) : (
          // Se não houver veículos, mostra mensagem
          <Text style={styles.noDataText}>Sem veículos em operação</Text>
        )}
      </View>

      {/* Botão para voltar */}
      <TouchableOpacity
        // Ao pressionar, volta para a tela anterior
        onPress={() => router.back()}
        // Estilo do botão
        style={styles.backButtonContainer}
      >
        {/* Texto do botão */}
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
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
    // Espaço interno
    padding: 12,
  },
  // Container de carregamento
  loadingContainer: {
    // Ocupa toda a altura disponível
    flex: 1,
    // Centraliza conteúdo
    justifyContent: 'center',
    alignItems: 'center',
    // Cor de fundo branca
    backgroundColor: '#fff',
  },
  // Texto de carregamento
  loadingText: {
    // Tamanho da fonte
    fontSize: 14,
    // Cor cinza
    color: '#666',
    // Espaço acima
    marginTop: 12,
  },
  // Container de erro
  errorContainer: {
    // Ocupa toda a altura disponível
    flex: 1,
    // Centraliza conteúdo
    justifyContent: 'center',
    alignItems: 'center',
    // Cor de fundo branca
    backgroundColor: '#fff',
    // Espaço interno
    padding: 24,
  },
  // Texto de erro
  errorText: {
    // Tamanho da fonte
    fontSize: 16,
    // Cor vermelha
    color: '#ff4444',
    // Peso da fonte
    fontWeight: '600',
    // Alinhamento centralizado
    textAlign: 'center',
  },
  // Mensagem de erro (dentro do conteúdo)
  errorMessage: {
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
    marginBottom: 12,
  },
  // Header da linha
  header: {
    // Espaço vertical
    paddingVertical: 16,
    // Borda inferior
    borderBottomWidth: 1,
    // Cor da borda
    borderBottomColor: '#e0e0e0',
    // Espaço abaixo
    marginBottom: 16,
    // Exibe os filhos em linha (horizontal)
    flexDirection: 'row',
    // Alinha verticalmente
    alignItems: 'center',
  },
  // Código/nome da linha
  linhaCode: {
    // Tamanho da fonte
    fontSize: 20,
    // Peso da fonte
    fontWeight: 'bold',
    // Cor azul
    color: '#0066cc',
    // Espaço à direita
    marginRight: 12,
  },
  // Sentido da linha
  linhaSentido: {
    // Tamanho da fonte
    fontSize: 14,
    // Cor cinza
    color: '#666',
    // Ocupar espaço disponível
    flex: 1,
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
  // Seção
  section: {
    // Espaço abaixo
    marginBottom: 24,
  },
  // Título da seção
  sectionTitle: {
    // Tamanho da fonte
    fontSize: 16,
    // Peso da fonte
    fontWeight: 'bold',
    // Cor azul
    color: '#0066cc',
    // Espaço abaixo
    marginBottom: 12,
  },
  // Item de previsão
  previsaoItem: {
    // Espaço vertical
    paddingVertical: 12,
    // Espaço horizontal
    paddingHorizontal: 12,
    // Borda inferior
    borderBottomWidth: 1,
    // Cor da borda
    borderBottomColor: '#f0f0f0',
  },
  // Parada da previsão
  previsaoParada: {
    // Tamanho da fonte
    fontSize: 14,
    // Cor cinza
    color: '#666',
    // Espaço abaixo
    marginBottom: 4,
  },
  // Hora da previsão
  previsaoHora: {
    // Tamanho da fonte
    fontSize: 15,
    // Peso da fonte
    fontWeight: 'bold',
    // Cor azul
    color: '#0066cc',
  },
  // Item de veículo
  veiculoItem: {
    // Espaço vertical
    paddingVertical: 12,
    // Espaço horizontal
    paddingHorizontal: 12,
    // Borda inferior
    borderBottomWidth: 1,
    // Cor da borda
    borderBottomColor: '#f0f0f0',
  },
  // ID do veículo
  veiculoId: {
    // Tamanho da fonte
    fontSize: 14,
    // Cor cinza
    color: '#666',
    // Espaço abaixo
    marginBottom: 4,
  },
  // Coordenadas do veículo
  veiculoCoordenadas: {
    // Tamanho da fonte
    fontSize: 13,
    // Cor azul
    color: '#0066cc',
    // Espaço abaixo
    marginBottom: 4,
  },
  // Hora da atualização do veículo
  veiculoHora: {
    // Tamanho da fonte
    fontSize: 12,
    // Cor cinza claro
    color: '#999',
  },
  // Texto de sem dados
  noDataText: {
    // Tamanho da fonte
    fontSize: 14,
    // Cor cinza
    color: '#999',
    // Alinhamento centralizado
    textAlign: 'center',
    // Espaço vertical
    paddingVertical: 16,
  },
  // Container do botão voltar
  backButtonContainer: {
    // Altura fixa
    height: 44,
    // Cor de fundo azul
    backgroundColor: '#0066cc',
    // Arredonda os cantos
    borderRadius: 8,
    // Centraliza conteúdo
    justifyContent: 'center',
    alignItems: 'center',
    // Espaço acima
    marginTop: 24,
    // Espaço abaixo
    marginBottom: 24,
  },
  // Texto do botão voltar
  backButtonText: {
    // Cor branca
    color: '#fff',
    // Tamanho da fonte
    fontSize: 16,
    // Peso da fonte
    fontWeight: '600',
  },
  // Botão voltar (alternativo)
  backButton: {
    // Altura fixa
    height: 44,
    // Largura mínima
    minWidth: 100,
    // Cor de fundo azul
    backgroundColor: '#0066cc',
    // Arredonda os cantos
    borderRadius: 8,
    // Centraliza conteúdo
    justifyContent: 'center',
    alignItems: 'center',
    // Espaço acima
    marginTop: 24,
  },
});