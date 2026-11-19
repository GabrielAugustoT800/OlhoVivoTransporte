import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { FavoritesProvider } from '../context/FavoritesContext';

function RootNavigator() {
  const { colors, loading } = useTheme();

  if (loading) return null;

  const statusBarStyle = colors.background === '#121212' ? 'light' : 'dark';

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleAlign: 'center',
          contentStyle: {
            flex: 1,
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="linha/[codigo]" options={{ title: 'Detalhes da Linha', headerShown: true }} />
        <Stack.Screen name="preferences" options={{ title: 'Preferências', headerShown: true, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Página não encontrada', headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <RootNavigator />
      </FavoritesProvider>
    </ThemeProvider>
  );
}