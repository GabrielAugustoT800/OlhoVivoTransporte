// Tela 404 - exibida quando nenhuma rota é encontrada pelo Expo Router.
// O componente usa Link para navegar de volta para a rota inicial "/".

// Importa o componente Link do Expo Router para navegação entre rotas
import { Link } from 'expo-router';
// Importa componentes nativos do React Native para montar a tela
import { View, Text, StyleSheet } from 'react-native';

// Componente da tela de erro 404 (página não encontrada)
export default function NotFoundScreen() {
  // Renderiza o container centralizado com mensagem e link de retorno
  return (
    // Container ocupa toda a tela e centraliza o conteúdo
    <View style={styles.container}>
      {/* Título da tela de erro */}
      <Text style={styles.title}>Oops!</Text>
      {/* Subtítulo explicando o erro */}
      <Text style={styles.subtitle}>
        Não conseguimos encontrar a página que você procura.
      </Text>
      {/* Link para voltar à página inicial "/" */}
      <Link href="/" style={styles.link}>
        Voltar ao início
      </Link>
    </View>
  );
}

// Estilos do componente
const styles = StyleSheet.create({
  // Container raiz com fundo branco e conteúdo centralizado
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  // Título em destaque
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  // Subtítulo com texto menor e cinza
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  // Link azul para voltar ao início
  link: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
});