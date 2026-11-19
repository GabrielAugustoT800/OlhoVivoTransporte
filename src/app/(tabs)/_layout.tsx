import { Tabs } from 'expo-router';
import { Text, View, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { SettingsButton } from '../../components/SettingsButton';

/**
 * Componente de ícone da aba usando View + Text para controle total de layout no Android
 * Evita cortes usando flexbox e alinhamento centralizado
 * @param simbolo - Caractere exibido (⌂, ⌕, ♥)
 * @param color - Cor recebida da barra de abas
 * @param size - Tamanho sugerido (não usado como altura fixa)
 */
function IconeAba({ simbolo, color, size }: { simbolo: string; color: ColorValue; size: number }) {
  return (
    // View container flexível que preenche o espaço do botão da aba
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 28,
      }}
    >
      <Text
        style={{
          color,
          fontSize: size,
          // Permite que o texto defina sua própria altura
          includeFontPadding: false,
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
      >
        {simbolo}
      </Text>
    </View>
  );
}

// Define o layout das abas (Home, Buscar, Favoritos)
export default function TabsLayout() {
  // Obtém as insets de segurança para ajustar a barra de abas
  const insets = useSafeAreaInsets();
  // Hook de tema para cores dinâmicas
  const { colors } = useTheme();

  return (
    // Renderiza o navegador de abas do Expo Router
    <Tabs
      // O botão Voltar retorna para a tela visitada antes (ex: Favoritos), e não sempre para a primeira aba
      backBehavior="history"
      // Opções comuns a todas as abas
      screenOptions={{
        // Estilo da barra de abas
        tabBarStyle: {
          // Espaço inferior para a barra de navegação do sistema
          paddingBottom: insets.bottom,
          // Cor de fundo baseada no tema
          backgroundColor: colors.tabBar,
          // Borda superior baseada no tema
          borderTopWidth: 1,
          borderTopColor: colors.border,
          // Sombra no Android
          elevation: 8,
          // Cor da sombra no iOS
          shadowColor: colors.overlay,
          // Deslocamento da sombra no iOS
          shadowOffset: { width: 0, height: -2 },
          // Opacidade da sombra no iOS
          shadowOpacity: 0.1,
          // Raio da sombra no iOS
          shadowRadius: 4,
        },
        // Estilo dos rótulos das abas (texto abaixo do ícone)
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        // Caixa do ícone sem altura fixa
        tabBarIconStyle: {
          minWidth: 28,
        },
        // Cor da aba selecionada
        tabBarActiveTintColor: colors.tabIconActive,
        // Cor das abas não selecionadas
        tabBarInactiveTintColor: colors.tabIconInactive,
        // Exibe o cabeçalho padrão no topo das telas
        headerShown: true,
        // Botão de configurações no header de todas as abas
        headerRight: () => <SettingsButton />,
      }}
    >
      {/* Primeira aba: Linhas - lista de linhas */}
      <Tabs.Screen
        name="linhas"
        options={{
          title: 'Linhas',
          tabBarIcon: ({ color, size }) => <IconeAba simbolo="⌂" color={color} size={size} />,
          headerTitle: 'Living Eye - Ônibus SP',
        }}
      />

      {/* Segunda aba: Buscar - busca de paradas */}
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => <IconeAba simbolo="⌕" color={color} size={size} />,
          headerTitle: 'Buscar Parada',
        }}
      />

      {/* Terceira aba: Favoritos - linhas salvas */}
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => <IconeAba simbolo="♥" color={color} size={size} />,
          headerTitle: 'Meus Favoritos',
        }}
      />
    </Tabs>
  );
}