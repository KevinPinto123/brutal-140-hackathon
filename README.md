```
┌──────────────────────────────────────────────────────────────────┐
│  BRUTAL-140                                                      │
│  Motor espacial colaborativo con IA                              │
├──────────────────────────────────────────────────────────────────┤
│  PARCELA    7.00 × 20.00 m  ·  140.00 m²  ·  4.50 m libres       │
│  ESCALA     1:1, en metros, sin excepción                        │
│  SALA       lab_140                                              │
│  EQUIPO     3 humanos + 1 agente autónomo                        │
│  PLAZO      39 h  ·  The Realtime Hackathon by Portal            │
└──────────────────────────────────────────────────────────────────┘
```

Un lienzo 3D en tiempo real para diseñar entre varios un laboratorio de 140 m².
La IA no comenta el plano: entra con cursor propio, mide el calor y la luz de
cada módulo, y mueve los muros cuando algo choca.

**Sin base de datos.** El log de mensajes de Portal es todo el estado.

---

## Arranque

```bash
npm install
```

```bash
cp .env.example .env.local
```

Rellena `.env.local` con tus claves y levanta el servidor:

```bash
npm run dev
```

| Variable | Para qué | Si falta |
|---|---|---|
| `NEXT_PUBLIC_PORTAL_KEY` | Cliente anónimo del navegador | No hay sala: el lienzo queda en local |
| `PORTAL_SECRET` | Publicación server-side del agente | El Arquitecto responde por HTTP, pero deja de emitir en la sala |
| `PORTAL_PROJECT_ID` · `PORTAL_ENV_ID` | Identifican el entorno de Portal | — |
| `OPENAI_API_KEY` | El Arquitecto habla con `gpt-4o` | Cae a su evaluador heurístico local, y lo dice en pantalla |

> `PORTAL_SECRET` vive solo en el servidor y nunca se commitea. El navegador
> usa la clave pública; el agente publica desde el backend.

Sin ninguna clave el proyecto arranca igual. Verás una parcela vacía, un
Arquitecto heurístico y una barra superior que admite que está en modo
degradado en vez de fingir que todo va bien.

---

## PLANTA

**Qué hace el agente, en un dibujo.**

El diagnóstico es determinista: un módulo con `heat_kw ≥ 8` a más de **4.50 m**
de un jardín interno es un conflicto térmico, no una opinión estética.

```
       x −3.5    +3.5                 x −3.5    +3.5
 z +10 ┌─────────────┐          z +10 ┌─────────────┐
       │             │                │             │
       │   ███████   │                │   ███████   │     ███  jardín interno
       │   ███████   │                │   ███████   │
       │             │   El           │   ▓▓▓▓      │     ▓▓▓  HPC · 18 kW
       │             │   Arquitecto   │   ▓▓▓▓      │
       │             │   ─────────▶   │             │
       │             │                │             │
       │             │                │             │
       │   ▓▓▓▓      │                │             │
       │   ▓▓▓▓      │                │             │
 z −10 └─────────────┘          z −10 └─────────────┘

         12.4 m  ✗                      1.8 m  ✓
      sin ventilación                 dentro del radio
```

Nadie pulsa nada: 2.5 s después del último cambio de geometría, el agente
evalúa solo. Su cursor se desplaza interpolado hasta la zona en conflicto
—5 waypoints, 70 ms— con estado visible (`analizando`, `corrigiendo`,
`observando`) y luego mueve la pieza en todas las pantallas a la vez.

---

## SECCIÓN A–A′

**La decisión de arquitectura de la que cuelga todo lo demás.**

```
  ┌────────────────────────────┐   ┌────────────────────────────┐
  │  lab_140          DURABLE  │   │  lab_140_signals   EFÍMERO │
  │  history: 200              │   │  history: "none"           │
  ├────────────────────────────┤   ├────────────────────────────┤
  │  chat                      │   │  cursor       ~8 Hz  TTL 8s│
  │  entity.upsert             │   │  entity.drag  ~8 Hz  TTL 2s│
  │  entity.remove             │   │  camera       ~8 Hz  TTL30s│
  │  geometry.correction  ← IA │   │  sun          ~8 Hz        │
  │  state.lock                │   │                            │
  │  state.reset               │   │                            │
  │  sun.set                   │   │                            │
  └────────────────────────────┘   └────────────────────────────┘
       el estado se reduce            se pinta y se olvida
```

El SDK descarta los mensajes efímeros entrantes, así que la única difusión
fiable es el mensaje persistente. Si los cursores viajaran por el canal de
estado, **ocho señales por segundo expulsarían la geometría de la ventana de
historial** y recargar dejaría la parcela vacía. Separarlos cuesta cero: un
cliente nuevo abre el canal de señales con `history: "none"` y no hereda un
solo byte de ruido.

**El historial es la persistencia.** La geometría se reduce del log en orden de
llegada. Recargar reconstruye el laboratorio entero desde el backfill de 200
mensajes, y quien entra tarde hereda todo, incluido el cierre del diseño. El
bloqueo se aplica dentro del mismo pase de reducción, así que una corrección
tardía del agente no puede despertar un plano ya congelado — y todos los
clientes convergen al mismo estado final sin negociar nada.

Ese mismo reducer es el que rebobina: la cinta del tiempo no guarda copias ni
snapshots, pliega `foldRoom(log, upTo)` hasta un punto anterior y el lienzo, la
planta y las vistas rápidas muestran el pasado sin enterarse de que miran atrás.

Y el patrón se reutiliza en otra dimensión: **la hora solar es estado de sala.**
Mientras alguien arrastra el control, la hora viaja por el canal efímero y todos
ven el sol moverse en vivo; al soltar, se confirma como `sun.set` en el durable.

---

## CÁLCULO

**Primero mide. Después opina.**

```
geometría → diagnóstico determinista → LLM (JSON) → sanitize → Portal
                     │                                  │
                     └──── si el LLM falla, ES ─────────┘
                           el motor de respaldo
```

| Regla | Umbral |
|---|---|
| Módulo caliente sin jardín cerca | `heat_kw ≥ 8` a más de **4.50 m** |
| Clúster térmico | dos equipos con holgura **< 1.20 m** |
| Fachada larga tapada | volumen opaco a **< 0.90 m** de `x = ±3.5` |
| Circulación | pasillo continuo **≥ 1.10 m** en el eje Z |
| Bioclimática | al menos **un jardín interno**, obligatorio |

Cada pieza disipa calor real — HPC **18 kW**, racks **12 kW**, impresión 3D
**4 kW**, robótica **2 kW** — así que cuando la IA arrima el HPC al jardín no
está decorando: está ventilando.

**La luz se mide, no se narra.** Se cuadricula el plano de trabajo a 0.85 m en
celdas de 0.5 m —560 muestras—, se lanza un rayo hacia el sol desde cada una y
se comprueba qué volumen opaco se interpone. Sale un porcentaje defendible, un
mapa de sombra dibujable y, sobre todo, **el nombre del volumen que tapa la luz
y cuántos m² arruina**. Esa cifra entra en el prompt ya masticada.

Y no se negocia: el saneado deja pasar el texto del modelo para el resto del
análisis, pero **el valor de luz que se publica es siempre el medido**, aunque
el LLM devuelva otro. La medición gana.

Prioridad cuando hay varios conflictos: `térmico > programa > circulación > luz`.
Un laboratorio de 30 kW sin jardín tiene un problema térmico, no de luz.

---

## EL ARQUITECTO

**Por qué es un participante y no un chatbot.**

- Publica **desde el servidor** con la clave secreta y una identidad estable,
  `ai_architect`. Aparece en el roster como uno más: entra por su cursor y sale
  por TTL, sin abrir sesión de presencia.
- Todo lo que devuelve el modelo es **entrada no confiable**. Los ids deben
  existir o la corrección se descarta entera; las coordenadas se recortan a los
  7 × 20; la rotación se ajusta a pasos de 90°; máximo **2 correcciones** por
  evaluación; los textos se truncan.
- Con tres personas en la sala, **solo una pregunta**. El anfitrión es el id de
  participante más bajo, todos los clientes calculan lo mismo y solo uno dispara
  la petición. Consenso determinista de una línea, sin servidor de coordinación.
  El agente no puede ser anfitrión de sí mismo.
- El panel dice **qué motor respondió** — `gpt · openai` o `heurística local`.
  No fingimos IA cuando no la hay.

---

## PLIEGO DE CONDICIONES

**Cuatro capas de degradación, ninguna pantalla en blanco.**

| Si falla… | Qué pasa |
|---|---|
| No hay clave de OpenAI | El motor heurístico local responde. Mismo formato, mismas correcciones. |
| El LLM revienta o devuelve basura | `catch` → heurística. La demo no se entera. |
| Portal no está configurado | El veredicto vuelve por HTTP y el panel lo pinta igual. Solo se pierde la difusión. |
| Un peer se desconecta de golpe | Su cursor, arrastre y cámara caducan solos por TTL. No quedan fantasmas. |

La barra superior traduce el `ChannelStatus` real —`Sincronizado`,
`Reconectando…`, `modo degradado`, `sin socket (HTTP)`— porque una sesión
degradada se nota igual y preferimos decirlo.

---

## ESTADO DE MEDICIONES

| | |
|---:|---|
| **7 350** | líneas de TypeScript / TSX |
| **44** | archivos en `src/` |
| **11** | tipos de evento en **2** canales |
| **10** | tipos de entidad con dimensiones y carga térmica reales |
| **560** | muestras por medición de luz |
| **~8 Hz** | techo de señal, con puertas de 0.08 m (cursor) y 0.20 m (cámara) |

Ancho de banda gastado solo cuando algo se movió de verdad.

**Stack:** Next.js 16 · React 19 · React Three Fiber · Three.js · TailwindCSS 4
· Portal (`@portalsdk/core` + `@portalsdk/react`) · OpenAI `gpt-4o` con
`response_format: json_object`.

---

## PLANO DE SITUACIÓN

```
src/
├── app/api/architect/       El agente: publica en la sala con la clave secreta
├── components/
│   ├── providers/           RoomProvider — canales, señales, reducción del log
│   ├── scene/               WebGL: parcela, módulos, cielo, presencia 3D
│   └── ui/                  HUD sobre el lienzo: paneles, solar, cinta del tiempo
└── lib/
    ├── ai/
    │   ├── architect.ts     Diagnóstico determinista, LLM, saneado, heurística
    │   └── useArchitect.ts  Elección de anfitrión y disparo de la evaluación
    ├── portal/
    │   ├── events.ts        Los 11 eventos y los 2 canales
    │   ├── client.ts        Claves públicas, estado de conexión
    │   ├── identity.ts      Identidad y color de cada participante
    │   └── publish.ts       Publicación server-side con la clave secreta
    ├── room.ts              foldRoom — el reducer que convierte el log en estado
    ├── entities.ts          Los 10 tipos: dimensiones, material y calor
    ├── light.ts             Medidor de luz por trazado de rayos
    ├── heat.ts              Escala térmica compartida por el 3D y el panel
    ├── sun.ts               Hora solar, posición y color de la luz
    ├── views.ts             Encuadres de cámara compartidos por el producto
    └── constants.ts         Parcela, paleta de herramientas, materiales
```

---

## DOCUMENTACIÓN ANEXA

| | |
|---|---|
| [`docs/PITCH.md`](docs/PITCH.md) | Guion del pitch, 17 diapositivas + anexos |
| [`docs/presentacion.html`](docs/presentacion.html) | El pitch ya montado para proyectar. Doble clic, sin red |
| [`docs/DEMO.md`](docs/DEMO.md) | Guion de producción del vídeo de 2 minutos, plano a plano |
| [`docs/README.md`](docs/README.md) | El brief original, escrito antes de construir nada |

---

```
140 m² no caben dos veces. Por eso hay que decidir juntos —
y ahora la IA también está en la mesa.
```
