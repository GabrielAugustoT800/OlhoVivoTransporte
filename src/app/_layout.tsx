// Importa as funções de navegação do Expo Router
import { Tabs } from 'expo-router';
// Importa o componente de texto do React Native para desenhar os ícones das abas
import { Text } from 'react-native';
// Importa a cor segura para o iOS (notch, barra de status, etc)
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define o layout raiz que renderiza a navegação por abas
export default function Layout() {
  // Obtém as insets de segurança (notch, barra de status, etc) para ajustar o layout
  const insets = useSafeAreaInsets();

  return (
    // Renderiza o navegador de abas do Expo Router
    <Tabs
      // Define a cor de fundo das abas como branco
      screenOptions={{
        tabBarStyle: {
          // Define a altura das abas considerando a inset inferior (barra de home do iOS, etc)
          paddingBottom: insets.bottom,
          // Altura total das abas com padding
          height: 64 + insets.bottom,
          // Cor de fundo branca
          backgroundColor: '#fff',
          // Remove a borda superior das abas
          borderTopWidth: 0,
          // Sombra suave nas abas
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        // Estilo dos rótulos das abas (texto abaixo do ícone)
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        // Estilo do ícone das abas
        tabBarIconStyle: {
          width: 24,
          height: 24,
        },
        // Cor ativa (quando a aba está selecionada)
        tabBarActiveTintColor: '#0066cc',
        // Cor inativa (quando a aba não está selecionada)
        tabBarInactiveTintColor: '#666',
        // Remove o header padrão das abas (vamos personalizar no index.tsx, etc)
        headerShown: true,
      }}
    >
      {/* Define a primeira aba: Home - lista de linhas */}
      <Tabs.Screen
        // Rota: /
        name="index"
        // Opções específicas desta aba
        options={{
          // Título exibido no header
          title: 'Linhas',
          // Renderiza o ícone da aba
          tabBarIcon: ({ color, size }) => (
            // Ícone de casa desenhado com texto, na cor e tamanho da aba
            <Text style={{ color, fontSize: size }}>⌂</Text>
          ),
          // Título do header
          headerTitle: 'Living Eye - Ônibus SP',
        }}
      />

      {/* Define a segunda aba: Buscar - busca de paradas */}
      <Tabs.Screen
        // Rota: /buscar
        name="buscar"
        // Opções específicas desta aba
        options={{
          // Título exibido no header
          title: 'Buscar',
          // Renderiza o ícone da aba
          tabBarIcon: ({ color, size }) => (
            // Ícone de lupa desenhado com texto, na cor e tamanho da aba
            <Text style={{ color, fontSize: size }}>⌕</Text>
          ),
          // Título do header
          headerTitle: 'Buscar Parada',
        }}
      />

      {/* Define a terceira aba: Favoritos - linhas favoritas */}
      <Tabs.Screen
        // Rota: /favoritos
        name="favoritos"
        // Opções específicas desta aba
        options={{
          // Título exibido no header
          title: 'Favoritos',
          // Renderiza o ícone da aba
          tabBarIcon: ({ color, size }) => (
            // Ícone de coração desenhado com texto, na cor e tamanho da aba
            <Text style={{ color, fontSize: size }}>♥</Text>
          ),
          // Título do header
          headerTitle: 'Meus Favoritos',
        }}
      />
    </Tabs>
  );
}
