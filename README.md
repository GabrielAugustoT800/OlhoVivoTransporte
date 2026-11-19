# Living Eye · Olho Vivo Transporte

Aplicativo mobile em **Expo** (React Native + TypeScript) para quem anda de ônibus em São Paulo. Ele consome a **API Olho Vivo da SPTrans** para mostrar linhas, paradas, previsões de chegada e a posição dos ônibus em tempo real. Também desenha no mapa o caminho a pé até a parada.

Quando a API não está disponível (sem token, sem internet ou fora do ar), o app entra sozinho no **Modo Demonstração**. Nesse modo, ele usa o **GTFS oficial da SPTrans** para simular os ônibus nos trajetos reais.

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Busca de linhas** | Busca por número (`8000`) ou por bairro/terminal (`Lapa`). Cada sentido da linha aparece como um resultado separado. |
| **Tela inicial de Linhas** | Antes da primeira busca, mostra os favoritos, as buscas recentes, linhas populares e dicas de uso. |
| **Detalhe da linha** | Mostra as previsões de chegada nas paradas e os veículos em operação, com "puxar para atualizar". |
| **Previsões com plano B e C** | Se a SPTrans não envia previsões, o app tenta consultar parada por parada. Se ainda assim não vier nada, estima a chegada pela posição real dos ônibus (veja [Previsões](#-previsões-de-chegada)). |
| **Paradas próximas** | Usa o GPS para listar as paradas num raio de 500 m, ou busca uma parada pelo nome. |
| **Mapa com caminho a pé** | Ao tocar numa parada, abre um mapa em tela cheia com a rota a pé, a distância, o tempo estimado e um atalho para o app de mapas. |
| **Favoritos** | Coração cheio ♥ ou vazio ♡ em todas as telas. Cada linha e sentido é salvo separadamente, e os dados ficam no aparelho (AsyncStorage). |
| **Tema claro e escuro** | A engrenagem ⚙️ no topo das abas abre um painel lateral para escolher o tema. A escolha é aplicada na hora e fica salva, inclusive no mapa. |
| **Modo Demonstração** | É ativado automaticamente quando a API falha, ou forçado pelo usuário nas Preferências. Um selo avisa quando os dados são simulados. |

---

## 🧭 Telas e rotas (Expo Router)

| URL | Arquivo | Tela |
|---|---|---|
| `/` | `src/app/index.tsx` | Tela de abertura ("ENTRAR") |
| `/linhas` | `src/app/(tabs)/linhas.tsx` | Aba Linhas (busca e tela inicial) |
| `/buscar` | `src/app/(tabs)/buscar.tsx` | Aba Buscar (paradas próximas e mapa) |
| `/favoritos` | `src/app/(tabs)/favoritos.tsx` | Aba Favoritos |
| `/linha/[codigo]` | `src/app/linha/[codigo].tsx` | Detalhe da linha (previsões e veículos) |
| `/preferences` | `src/app/preferences.tsx` | Preferências (intervalo e modo demo) |
| qualquer outra | `src/app/+not-found.tsx` | Página não encontrada |

O painel de configurações e o mapa **não são rotas**. Os dois são `Modal`s abertos por cima da tela atual (`SettingsPanel` e `StopRouteMap`).

---

## 🏛️ Arquitetura

### Fonte de dados com fallback automático

```
Início do app ─► RealtimeService.initialize()
                   │
                   ├─ token válido ─────────► OlhoVivoApiSource  (API SPTrans ao vivo)
                   │
                   └─ sem token / erro / ───► OlhoVivoMockSource (simulação com GTFS)
                      "forçar modo demo"
```

- **`src/services/realtimeSource.ts`** define a interface `RealtimeDataSource`, implementada tanto pela API real quanto pelo mock. Assim, as telas não precisam saber qual das duas está ativa.
- **`src/hooks/useRealtime.ts`** autentica uma única vez para o app inteiro e entrega às telas `source`, `isDemoMode` e `ready`.
- **`src/services/sptrans.ts`** faz as chamadas HTTP à API Olho Vivo v2.1 (`Login`, `Linha`, `Parada`, `Previsao`, `Posicao`).
- **`src/services/sptransMockService.ts`** simula a mesma API. Ele posiciona os ônibus ao longo dos trajetos (`shapes`) e os espaça conforme a frequência real da faixa horária (`headway`), então os ônibus "andam" com o relógio.

### Identificação das linhas

Uma linha da SPTrans tem um registro por sentido. Por isso, toda linha recebe uma **chave única e estável** (`src/utils/linhaKey.ts`):

- `linha_<letreiro>_<sentido>`, por exemplo `linha_8000-10_1`;
- ou `cl:<código>` quando só se conhece o código da API.

A mesma chave é usada nos favoritos, na navegação (`src/utils/navigation.ts` → `irParaLinha`) e no detalhe da linha. Na tela de detalhe, `src/utils/resolverLinha.ts` converte a chave no código que a fonte ativa entende: o `cl` real para a API, ou o código simulado para o mock.

### 🕒 Previsões de chegada

A API da SPTrans às vezes devolve os veículos mas **nenhuma previsão** (`"ps": []`). Para a tela não ficar vazia, o app segue três etapas, nesta ordem:

1. **Plano A:** `GET /Previsao/Linha?codigoLinha=<cl>`, as previsões de todas as paradas de uma vez.
2. **Plano B:** lista as paradas da linha (`/Parada/BuscarParadasPorLinha`) e consulta `/Previsao?codigoParada&codigoLinha` para até 8 delas.
3. **Plano C (estimativa):** `src/services/previsaoEstimada.ts` posiciona os ônibus reais no trajeto da linha no GTFS. Para cada parada, encontra o ônibus mais próximo que ainda não passou por ela e converte a distância em minutos, a cerca de 15 km/h. Nesse caso, a tela mostra "≈ X min" e o aviso *"Estimativa calculada pela posição atual dos ônibus"*.

Em todos os casos, aparece só a próxima chegada de cada parada, com o nome da parada quando disponível.

### 🗺️ Mapa e caminho a pé

- **`src/components/StopRouteMap.tsx`** usa `react-native-maps` e `expo-location`. Mostra sua localização, a parada e o caminho, e enquadra a rota automaticamente.
- **`src/services/walkingRoute.ts`** calcula o caminho a pé com o serviço público **OSRM** (`routing.openstreetmap.de`, perfil de caminhada, sem chave de API). Se o serviço falhar ou passar de 8 s, o mapa mostra uma linha reta tracejada com o aviso "Rota aproximada".
- **`src/components/StopRouteMap.web.tsx`** é a versão para navegador, já que o mapa nativo não roda na web: mostra um link para o Google Maps.
- No tema escuro, o mapa usa o estilo de `src/theme/mapStyleDark.ts`.

### 🎨 Tema

- **`src/theme/colors.ts`** tem os tokens de cor dos temas `light` e `dark`, com as mesmas chaves nos dois.
- **`src/theme/ThemeContext.tsx`** guarda o tema, salva a escolha em `@app/theme` e expõe o hook `useTheme()`.
- As telas montam os estilos com `useMemo(() => createStyles(colors))`, então a troca de tema aparece na hora.

### 💾 Dados salvos no aparelho (AsyncStorage)

| Chave | Conteúdo |
|---|---|
| `@app/favoritos` | Lista de favoritos `{ key, cd, lt, tl }`, gerenciada por `src/context/FavoritesContext.tsx` |
| `@app/theme` | Tema escolhido (`light` / `dark`) |
| `@sptrans:v1:history` | Últimas 10 buscas |
| `@sptrans:v1:prefs` | Preferências (intervalo de atualização, forçar modo demo) |
| `@sptrans:v1:cache:*` | Cache de respostas com tempo de expiração |

O `FavoritesContext` é a única fonte da verdade para os favoritos. Ele atualiza a tela na hora, grava as alterações em fila (toques rápidos não se sobrescrevem) e nunca duplica uma chave.

---

## 📁 Estrutura de pastas

```
OlhoVivoTransporte/
├── assets/
│   └── gtfs/                 JSONs compactos do GTFS (gerados pelo script)
├── gtfs/                     .txt originais do GTFS (não versionado)
├── scripts/
│   └── build-gtfs.js         Converte o GTFS bruto nos JSONs de assets/gtfs
├── proxy-sptrans.js          Proxy local opcional para testes na web (porta 3001)
└── src/
    ├── app/                  Rotas (Expo Router)
    │   ├── _layout.tsx       Stack raiz + ThemeProvider + FavoritesProvider
    │   ├── index.tsx         Tela de abertura
    │   ├── preferences.tsx
    │   ├── +not-found.tsx
    │   ├── (tabs)/           Abas: linhas, buscar, favoritos
    │   └── linha/[codigo].tsx
    ├── components/           FavoriteButton, SettingsButton, SettingsPanel, StopRouteMap
    ├── context/              FavoritesContext
    ├── data/                 gtfsRepository (consultas ao GTFS local)
    ├── hooks/                useRealtime, usePreferences, useSearchHistory
    ├── mocks/                Dados simulados auxiliares
    ├── services/             sptrans, sptransMockService, realtimeSource,
    │                         previsaoEstimada, walkingRoute
    ├── theme/                colors, ThemeContext, mapStyleDark
    ├── types/                Tipos da API (Linha, Parada, Previsao, Veiculo)
    └── utils/                storage, linhaKey, resolverLinha, navigation
```

---

## 🛠️ Tecnologias

| Ferramenta | Uso |
|---|---|
| **Expo SDK 58 + React Native 0.88 + TypeScript** | Base do app multiplataforma, com tipagem estática |
| **Expo Router** | Navegação baseada em arquivos (`src/app/`), com rotas tipadas (`typedRoutes`) |
| **Axios** | Requisições HTTP à API Olho Vivo e ao OSRM |
| **AsyncStorage** | Persistência local de favoritos, tema, histórico, preferências e cache |
| **expo-location** | Localização do usuário (paradas próximas e mapa) |
| **react-native-maps** | Mapa com marcador e caminho a pé |
| **OSRM (routing.openstreetmap.de)** | Cálculo da rota a pé, sem chave de API |
| **GTFS da SPTrans** | Linhas, paradas, trajetos e frequências oficiais (modo demo e plano C) |
| **Ícones Unicode (♥ ♡ ⚙️ 🔍)** | Ícones sem dependências extras |

---

## 🔧 Como executar

### Pré-requisitos

- **Node.js** (versão LTS) e **npm**
- **Expo Go** no celular, ou um emulador Android/iOS
- **Token da SPTrans** (opcional): crie em [sptrans.com.br/desenvolvedores](https://www.sptrans.com.br/desenvolvedores). Sem token, o app roda no Modo Demonstração.

### Passos

1. **Instalar as dependências**
   ```bash
   npm install
   ```

2. **Configurar o token** (opcional)
   ```bash
   cp .env.example .env
   ```
   Abra o `.env` e troque `seu_token_aqui` pelo seu token:
   ```
   EXPO_PUBLIC_SPTRANS_TOKEN=seu_token
   ```
   > O `.env` está no `.gitignore` e **não deve ser versionado**.

3. **Iniciar o app**
   ```bash
   npx expo start -c
   ```
   - **Android:** pressione `a` ou escaneie o QR code com o Expo Go
   - **iOS:** pressione `i`
   - **Web:** pressione `w` (veja as limitações abaixo)

4. **Verificar os tipos**
   ```bash
   npx tsc --noEmit
   ```

> **Dica para o emulador Android:** defina uma localização em São Paulo em *Extended controls → Location*. Sem isso, o emulador usa uma localização na Califórnia, e as paradas próximas e o mapa não fazem sentido.

> **Adicionar bibliotecas:** use sempre `npx expo install <pacote>` para obter a versão compatível com o SDK.

### Regenerar os dados do GTFS (opcional)

1. Baixe o GTFS da SPTrans e extraia os `.txt` na pasta `gtfs/`.
2. Rode:
   ```bash
   node scripts/build-gtfs.js ./gtfs ./assets/gtfs
   ```

O script não tem dependências externas. Ele simplifica os trajetos (Douglas-Peucker) e gera `routes`, `stops`, `routeStops`, `stopRoutes`, `shapes`, `frequencies`, `calendar` e `meta.json`. A versão atual tem 1.326 linhas, 22.261 paradas e 2.268 trajetos.

### Forçar o Modo Demonstração

Em **⚙️ → Mais preferências → Forçar modo demo**. Útil em apresentações sem internet.

---

## ⚠️ Problemas conhecidos e limitações

| Item | Plataforma | Descrição | Status |
|---|---|---|---|
| **Previsões vazias na API real** | Android/iOS | A SPTrans às vezes responde `"ps": []` mesmo com ônibus rodando. | 🟢 **Mitigado** pelos planos B e C (estimativa pela posição dos ônibus) |
| **CORS no navegador** | Web | O navegador bloqueia a API Olho Vivo. O proxy público (`corsproxy.io`) não repassa o cookie de sessão, então o app cai no modo demo. | ✅ Esperado: use Android/iOS para a API real |
| **Mapa na web** | Web | O `react-native-maps` não roda no navegador. | ✅ Esperado: a web mostra um link para o Google Maps |
| **Favoritos "somem" no Expo Go** | Expo Go | O armazenamento fica vinculado ao endereço do servidor. Trocar de rede ou alternar LAN/`--tunnel` faz o app abrir como se fosse outro projeto, mas os dados continuam lá. | 🟡 Inicie o servidor sempre do mesmo jeito |
| **Rota a pé aproximada** | Todas | Se o OSRM público estiver fora do ar, o mapa mostra uma linha reta. | 🟢 Tratado com aviso na tela |
| **Atualização automática** | Todas | O intervalo escolhido nas Preferências ainda não é aplicado à tela de detalhe. Para atualizar, puxe a tela para baixo. | 🟡 Pendente |
| **Tema na tela de Preferências** | Todas | A tela `/preferences` ainda tem uma opção de tema antiga, separada do painel ⚙️. O tema válido é o do painel. | 🟡 Pendente |
| **Ícones Unicode** | Android | Podem variar conforme a fonte do aparelho. | 🟢 Verificado no Expo Go |

---

## 👥 Integrantes

| Nome completo | RM |
|---|---|
| (Gabriel Augusto) | (567057) |
| (Lucas Morio) | (567616) |
| (Lucas Koiti) | (568128) |

---

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo [`LICENSE`](LICENSE).

Os dados de transporte são da **SPTrans** (API Olho Vivo e GTFS). Os mapas são do Google Maps / Apple Maps, e as rotas a pé vêm do **OpenStreetMap / OSRM**.
