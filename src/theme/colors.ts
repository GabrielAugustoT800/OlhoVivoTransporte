// Definição de tokens de cores para os temas Claro e Escuro do Living Eye

export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
  card: string;
  tabBar: string;
  tabIconActive: string;
  tabIconInactive: string;
  overlay: string;
  // Texto/ícone sobre fundo primary (botões)
  onPrimary: string;
  // Texto terciário (estado vazio, subtítulos fracos)
  textMuted: string;
  // Borda de campos de texto
  inputBorder: string;
  // Separador entre itens de lista
  divider: string;
  // Fundo/borda suave do primary (chips de histórico)
  primarySoft: string;
  primarySoftBorder: string;
  // Erro / ações destrutivas
  danger: string;
  dangerBackground: string;
  // Aviso (badge de modo demonstração)
  warningBackground: string;
  warningBorder: string;
  warningText: string;
  // Ícone de coração favorito (cheio / vazio)
  favoriteActive: string;
  favoriteInactive: string;
  // Mapa: linha do caminho a pé e marcador da parada
  routeLine: string;
  stopMarker: string;
}

export const light: ThemeColors = {
  background: '#ffffff',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  primary: '#0066cc',
  border: '#e0e0e0',
  card: '#f5f5f5',
  tabBar: '#ffffff',
  tabIconActive: '#0066cc',
  tabIconInactive: '#666666',
  overlay: 'rgba(0, 0, 0, 0.5)',
  onPrimary: '#ffffff',
  textMuted: '#999999',
  inputBorder: '#cccccc',
  divider: '#f0f0f0',
  primarySoft: '#f0f4f8',
  primarySoftBorder: '#d0dbe5',
  danger: '#ff4444',
  dangerBackground: '#ffebee',
  warningBackground: '#fff3cd',
  warningBorder: '#ffeeba',
  warningText: '#856404',
  favoriteActive: '#D32F2F',
  favoriteInactive: '#757575',
  routeLine: '#1565C0',
  stopMarker: '#D32F2F',
};

export const dark: ThemeColors = {
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#aaaaaa',
  primary: '#64b5f6',
  border: '#333333',
  card: '#1a1a1a',
  tabBar: '#1a1a1a',
  tabIconActive: '#64b5f6',
  tabIconInactive: '#888888',
  overlay: 'rgba(0, 0, 0, 0.7)',
  onPrimary: '#0d1b2a',
  textMuted: '#888888',
  inputBorder: '#444444',
  divider: '#2a2a2a',
  primarySoft: '#1a2a3a',
  primarySoftBorder: '#2a4a6a',
  danger: '#ff8a8a',
  dangerBackground: '#3a1a1a',
  warningBackground: '#3a3000',
  warningBorder: '#5a4a00',
  warningText: '#ffd54f',
  favoriteActive: '#FF6B6B',
  favoriteInactive: '#B0B0B0',
  routeLine: '#4FC3F7',
  stopMarker: '#FF6B6B',
};

export const themeMap: Record<ThemeName, ThemeColors> = {
  light,
  dark,
};
