# ⬛ BRUTAL-140 — Pitch Deck

> **The Realtime Hackathon by Portal — Agosto 2026**
> Duración objetivo: **6 minutos** (4 min de pitch + 2 min de demo).
> Cada `---` es una diapositiva. Las notas del presentador van en `>`.
> Las diapositivas marcadas **[CORTAR PRIMERO]** se eliminan para la versión de 3 minutos.
>
> **Para proyectar:** [`presentacion.html`](presentacion.html) — este mismo guion ya montado.
> Se abre con doble clic, no necesita red. `←` `→` navegar · `N` notas · `O` índice · `C` corte de 3 min · `F` pantalla completa.
> Este archivo sigue siendo la fuente: si cambias una diapositiva aquí, cámbiala también allí.

---

## 01 — Portada

# BRUTAL-140

### Motor espacial colaborativo con IA

**140 m². 7 × 20 metros. Tres humanos y un agente autónomo diseñando el mismo edificio al mismo tiempo.**

`Next.js · React Three Fiber · Portal · LLM`

> **[0:00 – 0:15]** No leas la diapositiva. Di la frase que la resume:
> *"Vamos a meter a una IA dentro de un plano, no al lado de él."*
> Deja el título 3 segundos en pantalla y pasa.

---

## 02 — El problema

## El diseño espacial sigue siendo de un solo jugador

- **Las herramientas son individuales.** Revit, SketchUp, AutoCAD: un archivo, un dueño, un turno. La colaboración es enviar capturas por WhatsApp.
- **La IA está en la barra lateral.** Genera imágenes bonitas o texto. No conoce tus coordenadas, no respeta tus metros, no puede tocar tu geometría.
- **El conflicto se descubre tarde.** El choque térmico, el pasillo bloqueado y la fachada tapada aparecen en obra, no en el lienzo.

> **[0:15 – 0:50]** Este es el dolor. Sé concreto, no filosófico.
> Frase de remate: *"Le pides a un LLM que diseñe un laboratorio y te devuelve un párrafo. No te devuelve un x, y, z."*

---

## 03 — La restricción es el producto

## ¿Por qué exactamente 140 m²?

```
        7.00 m
   ┌─────────────┐
   │             │
   │             │   x ∈ [-3.5, 3.5]
   │  140.00 m²  │   z ∈ [-10, 10]      20.00 m
   │             │   altura libre 4.50 m
   │             │
   └─────────────┘
```

- Un lienzo infinito no tiene conflictos. **Un lienzo cerrado los obliga.**
- Cada volumen que entra le quita sitio a otro. Cada decisión es una negociación **entre personas y agente**, en vivo.
- Toda la geometría se recorta a la parcela en el modelo (`clampToPlot`). Ni un humano ni la IA pueden salirse: **la restricción no es una advertencia de UI, es física del sistema.**

> **[0:50 – 1:20]** Este es el giro conceptual del proyecto y el que más se recuerda.
> *"El realtime se nota cuando hay algo que repartir. Por eso el lienzo es pequeño a propósito."*

---

## 04 — Qué construimos

## Un lienzo 3D donde la IA es un participante más

| | |
|---|---|
| **Programa** | Laboratorio modular de innovación: Robótica, Impresión 3D y HPC |
| **Estética** | Brutalista, concreto expuesto, luz blanca |
| **Obligatorio** | Jardín interno — sin él no hay dónde ventilar |
| **Sala** | `lab_140` — todos entran a la misma |

**Tres cosas que no hace ningún editor 3D colaborativo hoy:**

1. Tu cursor es **un cuerpo a escala humana dentro de la malla**, no una flecha en píxeles.
2. **El Arquitecto** —el agente— tiene su propio cursor, su propia identidad y mueve tus muros.
3. El estado de la sala **es el log de mensajes**. No hay base de datos.

> **[1:20 – 1:50]** Aquí el jurado ya tiene que querer ver la pantalla.
> Enumera 1-2-3 con los dedos, sin explicarlos todavía: se explican después de la demo.

---

## 05 — [ DEMO EN VIVO ]

# ▶

### 7 × 20 m · dos navegadores · un agente

> **[1:50 – 3:50]** **Cambia a la demo. El guion plano a plano está en [DEMO.md](DEMO.md).**
> Los seis latidos, en orden: **presencia → conflicto térmico → la IA entra sola → aplicar → adoptar cámara → bloquear y recargar.**
> Si algo falla, sigue hablando y pasa al vídeo pregrabado. **Nunca depures en el escenario.**

---

## 06 — Lo que acabas de ver (1/3)

## Presencia física, no un puntero de colores

- El cursor viaja como **`(x, y, z)` en metros** por el canal de señales, y se dibuja como un avatar con ojos a **1.56 m** y un cono de visión en el suelo.
- La **cámara de cada peer también se difunde** (ojo + objetivo). Por eso el avatar mira de verdad hacia donde su dueño está mirando.
- Pulsar a alguien en el roster **te lleva a su encuadre exacto** con un vuelo de 620 ms. Ver lo que ve el otro es un clic, no una llamada de Zoom.
- Cada cursor lleva encima **qué volumen tiene agarrado**: el resto ve el halo de color sobre esa pieza antes de que se mueva.

> **[3:50 – 4:15]** Detalle que gusta a los ingenieros: agarrar o soltar una pieza **salta el limitador de frecuencia**, porque no es ruido de ratón, es un cambio de estado. Se ve al instante aunque el ratón esté quieto.

---

## 07 — Lo que acabas de ver (2/3)

## El Arquitecto no es un chatbot: es un participante

- Publica **desde el servidor** con la clave secreta y una identidad estable, `ai_architect`. La `sk_` no sale nunca del backend.
- Su cursor **se desplaza interpolado** hasta la zona en conflicto —5 waypoints, 70 ms— con estado visible: `analizando` → `corrigiendo` → `observando`. **Se ve pensar.**
- Aparece en la lista de participantes **como uno más**, aunque no abra sesión de presencia: entra por su cursor y sale por TTL.
- Cuando corrige, no escribe una sugerencia: **emite `geometry.correction` y el muro se mueve en las dos pantallas a la vez.**

> **[4:15 – 4:45]** La frase clave del pitch entero:
> *"No le preguntamos a la IA qué opina del plano. La IA está dentro del plano, con cursor propio, y todos la ven llegar."*

---

## 08 — Lo que acabas de ver (3/3)

## El log de mensajes **es** el estado

- No hay base de datos ni CRDT. La geometría se **reduce del historial de la sala en orden de llegada**: `entity.upsert`, `entity.remove`, `state.reset`, `geometry.correction`, `state.lock`.
- Recargar el navegador **reconstruye el laboratorio entero** desde el backfill de Portal (200 mensajes). Quien entra tarde hereda todo, incluido el cierre.
- El bloqueo se aplica **dentro del mismo pase de reducción**: cualquier geometría posterior a un `state.lock` la ignoran **todos** los clientes por igual. Una corrección tardía del agente no puede despertar un diseño ya congelado.
- Resultado: **todos los clientes convergen al mismo estado final sin negociar nada.**

> **[4:45 – 5:10]** Si el jurado es técnico, esta es la diapositiva donde ganas.
> *"El estado final no depende de quién llegó primero ni de quién recargó. Depende del log, y el log es uno solo."*

---

## 09 — Arquitectura: dos canales, una decisión

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  lab_140          DURABLE    │     │  lab_140_signals   EFÍMERO   │
│  history: 200                │     │  history: "none"             │
├──────────────────────────────┤     ├──────────────────────────────┤
│  chat                        │     │  cursor         ~8 Hz        │
│  entity.upsert               │     │  entity.drag    ~8 Hz        │
│  entity.remove               │     │  camera         ~8 Hz        │
│  geometry.correction   ← IA  │     │  sun            ~8 Hz        │
│  state.lock                  │     │                 ← IA         │
│  state.reset                 │     │                              │
│  sun.set                     │     │  TTL: 8 s / 2 s / 30 s       │
└──────────────────────────────┘     └──────────────────────────────┘
        el estado se reduce               se pinta y se olvida
```

**Por qué separados:** el SDK descarta los mensajes efímeros entrantes, así que la única difusión fiable es el mensaje persistente. Si el cursor viajara por el canal de estado, **8 señales por segundo expulsarían la geometría de la ventana de historial** y recargar dejaría la parcela vacía.

**Coste de esa decisión:** cero. Un cliente nuevo abre el canal de señales con `history: "none"` y **no hereda ni un byte de ruido.**

**Y el patrón se reutiliza:** la **hora solar es estado de sala**. Mientras alguien arrastra el control, la hora viaja por el canal efímero y todos ven el sol moverse en vivo; al soltar, se confirma como `sun.set` en el canal durable. **Quien recargue o entre tarde hereda la misma hora**, así que el equipo discute la luz en el mismo instante del día. Mismo mecanismo que el arrastre de un muro, aplicado a otra dimensión del problema.

> **[5:10 – 5:35]** Enseña el diagrama y quédate callado 2 segundos antes de hablar.
> Este es el problema real que aparece a las 6 horas de hackathon y que casi nadie resuelve.

---

## 10 — El Arquitecto por dentro

## Primero mide. Después opina.

```
geometría → diagnóstico determinista → LLM (JSON) → sanitize → Portal
                     │                                  │
                     └──── si el LLM falla, ES ─────────┘
                           el motor de respaldo
```

**El diagnóstico no lo inventa el modelo.** Es código, y es el mismo que sirve de plan B:

| Regla | Umbral |
|---|---|
| Módulo caliente sin jardín cerca | `heat_kw ≥ 8` a más de **4.50 m** de un jardín |
| Clúster térmico | dos equipos con holgura **< 1.20 m** |
| Fachada larga tapada | volumen opaco a **< 0.90 m** de `x = ±3.5` |
| Circulación | pasillo continuo **≥ 1.10 m** en el eje Z |
| Bioclimática | **al menos un jardín interno**, obligatorio |

**Cada pieza disipa calor real:** HPC **18 kW** · Racks **12 kW** · Impresión 3D **4 kW** · Robótica **2 kW**.
Por eso la IA mueve el HPC junto al jardín: **no es una opinión estética, es ventilación.**

**Prioridad cuando hay varios conflictos:** `térmico > programa > circulación > luz`.
Un laboratorio de 30 kW sin jardín tiene un problema térmico, no un problema de luz.

> **[5:35 – 6:05]** Esta diapositiva mata la objeción "esto es un wrapper de ChatGPT".
> *"El LLM no descubre el conflicto. El LLM recibe el conflicto ya medido y decide dónde poner la pieza."*

---

## 11 — La IA no puede mentir sobre la parcela **[CORTAR PRIMERO]**

## Todo lo que devuelve el modelo es entrada no confiable

El JSON del LLM pasa por un saneado obligatorio antes de tocar la sala:

- **Los ids deben existir.** Si inventa una pieza, la corrección se descarta entera.
- **Las coordenadas se recortan a los 7 × 20.** No hay forma de sacar un muro de la parcela.
- **La rotación se ajusta a pasos de 90°.**
- **Máximo 2 correcciones por evaluación.** Nada de reescribir el plano de golpe.
- **Los textos se truncan.** El chat no se convierte en un ensayo.

Y una regla de honestidad en la UI: el panel muestra **qué motor respondió** — `gpt · openai` o `heurística local`. **No fingimos IA cuando no la hay.**

> Objeción típica del jurado: *"¿y si alucina?"* → *"Aluciona sobre coordenadas que ya recortamos, sobre ids que ya validamos, y como mucho mueve dos piezas."*

---

## 12 — Por qué esto no se cae en el escenario

## Cuatro capas de degradación, ninguna pantalla en blanco

| Si falla… | Qué pasa |
|---|---|
| **No hay clave de OpenAI** | El motor heurístico local responde. Mismo formato, mismas correcciones, badge honesto. |
| **El LLM lanza error o devuelve basura** | `catch` → heurística. La demo no se entera. |
| **Portal no está configurado** | El veredicto vuelve por HTTP y el panel lo pinta igual. Solo se pierde la difusión. |
| **Un peer se desconecta de golpe** | Su cursor, arrastre y cámara caducan solos por TTL. No quedan fantasmas. |

La barra superior **no miente**: muestra el estado real del canal —`Sincronizado`, `Reconectando…`, `modo degradado`, `sin socket (HTTP)`— traducido, no maquillado.

> **[6:05 – 6:25]** Dilo con orgullo, no como disculpa:
> *"Diseñamos para que la demo funcione con el wifi del hackathon."*

---

## 13 — El detalle que nadie ve **[CORTAR PRIMERO]**

## ¿Quién le pregunta a la IA cuando hay tres personas en la sala?

**El problema:** la evaluación es automática, 2.5 s después del último cambio de geometría. Con 3 clientes abiertos, el agente hablaría 3 veces y publicaría 3 veces las mismas correcciones.

**La solución, sin servidor de coordinación y sin negociación:**

```
anfitrión = el id de participante más bajo de la sala
```

Todos los clientes calculan lo mismo, todos llegan a la misma conclusión, **solo uno dispara la petición.** El agente no puede ser anfitrión de sí mismo. Con el diseño bloqueado, nadie pregunta: el estado final no se renegocia.

> Es un consenso determinista de una línea. Si te preguntan por escalabilidad, esta es la respuesta corta.

---

## 14 — Stack y números

| | |
|---|---|
| **Frontend / 3D** | Next.js 16 · React 19 · React Three Fiber · Three.js |
| **Realtime** | **Portal** — canales, presencia, historial, publicación server-side |
| **Agente** | OpenAI `gpt-4o`, `response_format: json_object` + evaluador heurístico propio |
| **UI** | TailwindCSS 4, monocromática, HUD superpuesta al WebGL a 100 vh |

**Números del build (39 horas):**

- **~5 250 líneas** de TypeScript/TSX · **37 archivos** en `src/`
- **11 tipos de evento** repartidos en **2 canales**
- **10 tipos de entidad** con dimensiones y carga térmica reales
- **~8 Hz** de techo de señal, con puerta de **0.08 m** para el cursor y **0.20 m** para la cámara: *ancho de banda gastado solo cuando algo se movió de verdad*

> **[6:25 – 6:45]** Los números importan porque demuestran que no es una maqueta.
> Menciona el techo de 8 Hz: es la diferencia entre una demo y algo que aguanta una sala llena.

---

## 15 — Qué exprime de Portal

## No usamos Portal como un WebSocket con marca

1. **Dos canales con políticas de historial distintas** para separar estado durable de señal efímera — la decisión de arquitectura de la que cuelga todo el proyecto.
2. **El historial como fuente de verdad.** El backfill de 200 mensajes *es* la persistencia: sin base de datos, recargar reconstruye el laboratorio.
3. **Presencia con metadata** (nombre y color) para el roster, y **presencia detallada** para saber quién está dentro.
4. **Publicación server-side con clave secreta**, que es lo que le da al agente una identidad real en el log en vez de ser "un mensaje del navegador de alguien".
5. **Estado del canal expuesto en la UI** en lugar de escondido: la sesión te dice si está degradada.

> **[6:45 – 7:00]** Diapositiva para el jurado de Portal específicamente. Léela como una lista, rápido.

---

## 16 — Hacia dónde va

## Roadmap

- **Ahora** → parcela fija, un programa, dos motores de evaluación, correcciones de hasta 2 piezas, **hora solar compartida**.
- **Entrando** → **medición real de luz natural**: se cuadricula el plano de trabajo a 0.85 m en celdas de 0.5 m —560 muestras—, se lanza un rayo al sol desde cada una y se mira qué volumen se interpone. El porcentaje del panel deja de ser un número narrado y pasa a ser un cálculo de anteproyecto **con culpable y m² de sombra atribuidos**.
- **Siguiente** → historial de versiones navegable (el log ya lo permite: es rebobinar la reducción), voz en la sala, y que el agente **proponga alternativas completas** en vez de correcciones puntuales.
- **Después** → catálogos reales de fabricantes, exportación a IFC, y parcelas arbitrarias con las mismas reglas.

**Lo que ya es cierto hoy:** un agente autónomo con cursor propio, dentro de una malla compartida, moviendo geometría que tres personas ven cambiar al mismo tiempo.

---

## 17 — Cierre

# 140 m² no caben dos veces.

### Por eso hay que decidir juntos. Y ahora la IA también está en la mesa.

**BRUTAL-140** · The Realtime Hackathon by Portal
`sala lab_140` — pásense, está abierta.

> **[7:00 – 7:15]** Termina en el 3D, no en una diapositiva de agradecimientos.
> Deja la parcela girando en pantalla mientras empiezan las preguntas.

---

## Anexo A — Preguntas del jurado y respuestas cortas

| Pregunta | Respuesta |
|---|---|
| *"¿Esto no es un wrapper de ChatGPT?"* | El conflicto lo detecta código determinista con umbrales físicos. El LLM recibe el diagnóstico ya medido y solo decide la colocación. Sin LLM, el sistema funciona igual. |
| *"¿Qué pasa si la IA alucina coordenadas?"* | Se recortan a la parcela, se validan contra ids que existen y se limitan a 2 correcciones. Una alucinación produce, como mucho, un movimiento válido pero mediocre. |
| *"¿Cómo resuelven los conflictos de edición?"* | El log es el orden. Se reduce en orden de llegada y todos los clientes convergen. El bloqueo se aplica dentro del mismo pase, así que congela igual para todos. |
| *"¿Cuánta latencia tiene?"* | El cursor va a ~8 Hz con puerta de 8 cm; la geometría viaja como mensaje persistente y se pinta optimista en local mientras se arrastra. Nadie espera a la red para ver su propio movimiento. |
| *"¿Escala a 20 personas?"* | El canal de señales no guarda historial, así que el coste por peer es constante. El anfitrión determinista evita que la IA se dispare N veces. El límite práctico está en el render, no en el estado. |
| *"¿Por qué no un CRDT?"* | Porque el dominio ya tiene un orden natural: quién puso qué antes. Un log reducido da convergencia con una fracción de la complejidad, y encima es auditable. |
| *"¿Dónde está la clave secreta?"* | Solo en el servidor. El navegador usa la clave pública anónima; el agente publica por HTTP desde el backend. |

---

## Anexo B — Versión de 3 minutos

Corta las diapositivas **11** y **13**, y comprime así:

| Tiempo | Diapositivas |
|---|---|
| 0:00 – 0:30 | 01 + 02 — portada y problema |
| 0:30 – 0:50 | 03 + 04 — la restricción y qué es |
| 0:50 – 2:10 | **05 — demo, versión corta (80 s)**: presencia → conflicto → la IA entra sola → aplicar |
| 2:10 – 2:40 | 07 + 08 — la IA es un participante, el log es el estado |
| 2:40 – 2:55 | 10 — reglas físicas reales (solo la tabla) |
| 2:55 – 3:00 | 17 — cierre |

> Si solo puedes decir una frase, di esta: **"La IA no comenta el plano. Está dentro del plano, con cursor propio, y mueve los muros."**
