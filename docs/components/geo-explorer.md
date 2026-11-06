# Explorador de Malhas Territoriais IBGE & SIG (`fzl-geo-explorer`)

> Suíte de Web Components geográficos e SIG (Sistemas de Informação Geográfica) para visualização cartográfica interativa, inspeção matemática da pirâmide de tiles Slippy Map ($Z/X/Y$) e navegação hierárquica por malhas territoriais do IBGE (Brasil, Grandes Regiões, Estados e Municípios).

---

## 1. Visão Geral

O componente `<fzl-geo-explorer>` e seus componentes satélites trazem para o ecossistema `@fzl/webcomponents-lit` a experiência de cartografia temática e exploração espacial inspirada na ferramenta de mapeamento intersetorial do IBGE.

Ele combina de maneira modular e desacoplada:

1. **Visualizador Cartográfico de Alta Performance (`<fzl-geo-map>`)**:
   - Container baseado em Leaflet encapsulado em Shadow DOM com estilos isolados.
   - Suporte a múltiplos basemaps vetoriais e raster (CartoDB Positron, CartoDB Dark Matter, OpenStreetMap, Esri World Imagery / Satélite e OpenTopoMap).
   - Grade de depuração matemática de tiles Slippy Map exibindo dinamicamente as coordenadas $Z/X/Y$ de cada bloco de $256 \times 256$ pixels.
   - Renderização reativa de malhas GeoJSON do IBGE com estilização determinística e efeitos de hover/seleção.

2. **Inspetor Matemático de Zoom & Projeção (`<fzl-geo-zoom-inspector>`)**:
   - Controle deslizante contínuo de zoom de 0 a 18 com botões incrementais.
   - Presets semânticos rápidos: *Mundo (z=2)*, *América (z=3)*, *Brasil (z=4)*, *Estado (z=7)*, *Cidade (z=11)* e *Rua (z=16)*.
   - Métricas em tempo real da pirâmide quadtree: dimensão em tiles ($2^Z \times 2^Z$), total mundial de tiles ($4^Z$), tile central sob o cursor e resolução em metros por pixel no equador.

3. **Gerenciador de Camadas com Auto-LOD (`<fzl-geo-layer-manager>`)**:
   - Alternância de camadas territoriais do IBGE: País (BR), Grandes Regiões, Unidades Federativas (UFs) e Municípios.
   - Mecanismo inteligente de **Auto-LOD (Level of Detail)**: adapta a resolução e visibilidade da malha conforme o nível de zoom, evitando downloads pesados desnecessários em escalas continentais.
   - Painel de métricas ativas com contagem de feições, tamanho estimado de download e status de carregamento com spinners e badges de estado.

4. **Inspetor de Atributos da Feição (`<fzl-geo-feature-details>`)**:
   - Exibição tabular instantânea das propriedades da feição territorial sob hover ou clique (Nome, Sigla, Código IBGE, Macro-Região e Área Territorial aproximada em $km^2$).

5. **Legenda Temática Padronizada (`<fzl-geo-legend>`)**:
   - Paleta cromática oficial e acessível para as 5 macrorregiões brasileiras (Norte, Nordeste, Centro-Oeste, Sudeste e Sul).

6. **Acessibilidade e Alto Contraste**:
   - Construído com `FzlWidgetMixin` da arquitetura `@fzl/core`.
   - Suporte a foco pelo teclado, anúncios `aria-live`, contrastes auditados para modo escuro e High Contrast Mode.

---

## 2. Exemplo de Uso

### Uso do Dashboard Completo (`<fzl-geo-explorer>`)

```html
<!-- Importa o módulo do componente -->
<script type="module" src="@fzl/webcomponents-lit/geo-explorer"></script>

<!-- Renderiza o explorador completo -->
<fzl-geo-explorer
  lat="-14.235"
  lng="-51.925"
  zoom="4"
  basemap="carto-positron"
  auto-lod
></fzl-geo-explorer>
```

### Uso do Mapa Isolado com Subcomponentes Customizados

```html
<script type="module" src="@fzl/webcomponents-lit/geo-map"></script>

<div style="display: flex; gap: 16px;">
  <fzl-geo-map
    id="meu-mapa"
    lat="-15.7801"
    lng="-47.9292"
    zoom="4"
    basemap="osm"
    show-debug-grid="true"
    style="width: 70%; height: 500px;"
  ></fzl-geo-map>

  <fzl-geo-zoom-inspector
    id="meu-inspector"
    zoom="4"
    style="width: 30%;"
  ></fzl-geo-zoom-inspector>
</div>

<script>
  const mapa = document.getElementById('meu-mapa');
  const inspector = document.getElementById('meu-inspector');

  // Sincroniza o movimento do mapa com o inspetor
  mapa.addEventListener('fzl-map-move', (e) => {
    inspector.zoom = e.detail.zoom;
    inspector.stats = e.detail.stats;
  });

  // Responde a cliques nos presets do inspetor
  inspector.addEventListener('fzl-zoom-preset', (e) => {
    mapa.flyTo(e.detail.lat, e.detail.lng, e.detail.zoom);
  });
</script>
```

---

## 3. Propriedades e Atributos

### `<fzl-geo-explorer>`

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `lat` | `lat` | `number` | `-14.235` | Latitude central inicial do mapa. |
| `lng` | `lng` | `number` | `-51.925` | Longitude central inicial do mapa. |
| `zoom` | `zoom` | `number` | `4` | Nível de zoom inicial ($0..18$). |
| `basemap` | `basemap` | `string` | `'carto-positron'` | Chave do basemap ativo (`carto-positron`, `carto-dark`, `osm`, `esri-satellite`, `opentopomap`). |
| `showDebugGrid` | `show-debug-grid` | `boolean` | `false` | Se ativa a grade de blocos cartográficos Slippy Map ($Z/X/Y$). |
| `autoLod` | `auto-lod` | `boolean` | `true` | Habilita o ajuste automático de camadas de acordo com o nível de zoom. |
| `selectedUf` | `selected-uf` | `string` | `''` | Sigla da UF atualmente em foco (ex: `'SP'`, `'RJ'`). |

### `<fzl-geo-map>`

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `lat` | `lat` | `number` | `-14.235` | Latitude central do mapa. |
| `lng` | `lng` | `number` | `-51.925` | Longitude central do mapa. |
| `zoom` | `zoom` | `number` | `4` | Nível de zoom do mapa. |
| `minZoom` | `min-zoom` | `number` | `2` | Nível de zoom mínimo permitido. |
| `maxZoom` | `max-zoom` | `number` | `18` | Nível de zoom máximo permitido. |
| `basemap` | `basemap` | `string` | `'carto-positron'` | Provedor do mapa de fundo. |
| `showDebugGrid` | `show-debug-grid` | `boolean` | `false` | Exibe a sobreposição de depuração $Z/X/Y$. |
| `geoJsonData` | — | `GeoJSON \| null` | `null` | Objeto GeoJSON a ser renderizado na camada vetorial ativa. |

---

## 4. Eventos Customizados

| Evento | Objeto `detail` | Descrição |
| :--- | :--- | :--- |
| `fzl-map-move` | `{ lat, lng, zoom, bbox, stats }` | Disparado a cada alteração de centro ou zoom do mapa. |
| `fzl-zoom-preset` | `{ name, zoom, lat, lng }` | Disparado ao clicar em um botão de preset territorial. |
| `fzl-layer-toggle` | `{ layerId, enabled }` | Disparado ao ativar ou desativar uma camada territorial. |
| `fzl-auto-lod-toggle` | `{ enabled }` | Disparado ao alternar o modo Auto-LOD. |
| `fzl-basemap-change` | `{ basemap }` | Disparado ao selecionar um novo provedor de basemap. |
| `fzl-feature-select` | `{ properties }` | Disparado ao clicar sobre um polígono territorial. |
| `fzl-feature-hover` | `{ properties }` | Disparado ao passar o cursor sobre um polígono territorial. |

---

## 5. Fundamentação Matemática (Slippy Map Tiles)

A arquitetura de tiles padrão da web (OSM / Google / Leaflet) divide o globo em projeção Web Mercator (EPSG:3857) segundo uma árvore quaternária (*quadtree*):

- **No zoom $Z$**:
  $$\text{Tiles por eixo} = 2^Z$$
  $$\text{Total de tiles mundiais} = 4^Z = 2^Z \times 2^Z$$
- **Conversão de Coordenadas Geográficas $(\phi, \lambda)$ para Tile $(X, Y)$**:
  $$X = \left\lfloor \frac{\lambda + 180}{360} \times 2^Z \right\rfloor$$
  $$Y = \left\lfloor \left(1 - \frac{\ln(\tan(\phi \times \pi / 180) + \sec(\phi \times \pi / 180))}{\pi}\right) \times 2^{Z-1} \right\rfloor$$
- **Resolução Espacial no Equador**:
  $$\text{Resolução} \approx \frac{40.075.016,686 \text{ m}}{256 \times 2^Z} \text{ metros/pixel}$$

Todas essas fórmulas são calculadas de forma determinística pelo utilitário `geo-math.ts` e refletidas na interface do usuário em tempo real.
