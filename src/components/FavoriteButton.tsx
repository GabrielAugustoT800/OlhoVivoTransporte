import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, Animated } from 'react-native';
import { useFavorites } from '../context/FavoritesContext';
import { useTheme } from '../theme/ThemeContext';
import { getLinhaKey } from '../utils/linhaKey';

interface FavoriteButtonProps {
  linha: { cd: number | string; lt?: string; tl?: string };
  size?: number;
}

// Coração cheio (favoritada) / vazio (não favoritada).
// @expo/vector-icons não está instalado, então usa os glifos Unicode ♥ / ♡.
export function FavoriteButton({ linha, size = 24 }: FavoriteButtonProps) {
  const { isFavorito, toggleFavorito, loading } = useFavorites();
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const active = isFavorito(getLinhaKey(linha) || '');

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
    toggleFavorito(linha);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={styles.button}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text
          style={[
            styles.heart,
            {
              fontSize: size,
              lineHeight: size * 1.2,
              color: active ? colors.favoriteActive : colors.favoriteInactive,
            },
          ]}
        >
          {active ? '♥' : '♡'}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heart: {
    textAlign: 'center',
  },
});
