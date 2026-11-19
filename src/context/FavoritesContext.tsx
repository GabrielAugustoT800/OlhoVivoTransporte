import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getFavorites, saveFavorites, FavoriteItem } from '../utils/storage';
import { getLinhaKey } from '../utils/linhaKey';

type LinhaInput = { cd: number | string; lt?: string; tl?: string };

interface FavoritesContextType {
  favoritos: FavoriteItem[];
  isFavorito: (key: string) => boolean;
  toggleFavorito: (linha: LinhaInput) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

function toItem(linha: LinhaInput): FavoriteItem {
  const key = getLinhaKey(linha);
  return {
    key: key || '',
    cd: Number(linha.cd),
    lt: linha.lt || `Linha ${linha.cd}`,
    tl: linha.tl || '',
  };
}

function toggleInList(list: FavoriteItem[], item: FavoriteItem): FavoriteItem[] {
  return list.some((f) => f.key === item.key)
    ? list.filter((f) => f.key !== item.key)
    : [...list, item];
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoritos, setFavoritos] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FavoriteItem[]>([]);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    getFavorites()
      .then((favs) => {
        if (!active) return;
        listRef.current = favs;
        setFavoritos(favs);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Conjunto de chaves para consulta rápida e consistente
  const favoriteKeys = useMemo(() => new Set(favoritos.map(f => f.key)), [favoritos]);

  const isFavorito = useCallback(
    (key: string) => favoriteKeys.has(key),
    [favoriteKeys]
  );

  const toggleFavorito = useCallback((linha: LinhaInput) => {
    const item = toItem(linha);
    
    // Garante que não adicionamos a mesma key duas vezes se já estiver na lista
    const currentList = listRef.current;
    const next = toggleInList(currentList, item);

    listRef.current = next;
    setFavoritos(next);

    queueRef.current = queueRef.current
      .then(() => saveFavorites(next))
      .catch((error) => {
        console.error('Erro ao salvar favoritos, desfazendo alteração:', error);
        listRef.current = toggleInList(listRef.current, item);
        setFavoritos((prev) => toggleInList(prev, item));
      });

    return queueRef.current;
  }, []);

  return (
    <FavoritesContext.Provider value={{ favoritos, isFavorito, toggleFavorito, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites deve ser usado dentro de um FavoritesProvider');
  }
  return context;
}
