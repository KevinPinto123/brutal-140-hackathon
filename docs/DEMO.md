# 🎬 BRUTAL-140 — Guía del vídeo demo

> **The Realtime Hackathon by Portal — Agosto 2026**
> Formato objetivo: **2:00 exactos**, 1080p, con locución en español.
> Este documento es el guion de producción completo: preparación, plano a plano, texto de locución, plan B y checklist.

---

## 0. Qué tiene que demostrar el vídeo

Un jurado de hackathon de realtime ve 40 demos. Las tres afirmaciones que este vídeo tiene que dejar **probadas, no dichas**:

| # | Afirmación | Cómo se prueba en cámara |
|---|---|---|
| **1** | Es realtime de verdad, no un mock | Dos ventanas visibles a la vez. Lo que pasa en una **aparece en la otra sin recargar**. |
| **2** | La IA es un participante, no un chatbot | El cursor del agente **entra solo**, se desplaza por la parcela y **mueve un volumen** que ambos usuarios ven moverse. |
| **3** | El estado es real, no un render | **Recargar** una ventana y que el laboratorio —y su bloqueo— vuelvan intactos. |

Todo lo demás (materiales, vistas rápidas, gizmos) es decorado. **Si hay que cortar, se corta el decorado, nunca uno de estos tres.**

---

## 1. Pre-vuelo técnico

### 1.1 Entorno

```bash
cp .env.example .env.local
```

| Variable | ¿Obligatoria para el vídeo? | Qué pasa si falta |
|---|---|---|
| `NEXT_PUBLIC_PORTAL_KEY` (`pk_`) | **Sí** | No hay sala. No hay demo. |
| `PORTAL_SECRET` (`sk_`) | **Sí** | ⚠️ **El agente deja de difundir.** Su cursor y sus correcciones solo los vería la ventana que preguntó. Se cae la afirmación #2. |
| `OPENAI_API_KEY` | Recomendada | Sin ella el motor heurístico responde igual y el badge dice `heurística local`. Es honesto y funciona, pero con clave el badge dice `gpt · openai` y suma. |
| `OPENAI_MODEL` | No | Por defecto `gpt-4o`. |

> ⚠️ **`PORTAL_SECRET` nunca se commitea y nunca aparece en pantalla.** Si grabas la terminal, cierra el editor de `.env.local` antes.

### 1.2 Arranque

**Graba contra build de producción, no contra `next dev`.** El modo desarrollo recompila, muestra overlays y mete tirones en el WebGL justo cuando la IA se desplaza.

```bash
npm run build
```

```bash
npm start
```

Verifica antes de grabar que la barra superior dice **"Sincronizado con Portal"** con el punto verde. Cualquier otro estado (`Reconectando…`, `modo degradado`, `sin socket`) se ve en cámara y resta.

### 1.3 Las dos identidades

La identidad vive en `localStorage`, así que **dos pestañas del mismo perfil comparten usuario**. Para tener dos participantes de verdad:

- **Ventana A** → navegador normal.
- **Ventana B** → **ventana de incógnito** (o un segundo perfil de Chrome).

Ambas a `http://localhost:3000`. Comprueba en el panel **PARTICIPANTES** que dice `(2)` y que son dos nombres distintos con colores distintos.

### 1.4 ⚠️ Los cuatro avatares fantasma

**Este es el gotcha que arruina la primera toma.** Mientras no llega **ningún cursor remoto**, la escena 3D dibuja un roster de referencia: Diego, Claudia, Mateo y AI Architect. Son maqueta, y desaparecen de golpe en cuanto el otro peer mueve el puntero.

**Antes de pulsar REC:** que las dos personas **muevan el ratón sobre la losa una vez**. Los avatares reales sustituyen a los de referencia y ya no vuelven mientras haya señal (TTL de 8 s). Si grabas con los de maqueta en pantalla, se verán cuatro personas desvanecerse en el segundo 5 y el jurado pensará que algo se rompió.

Lo mismo aplica a los paneles **PARTICIPANTES** y **PRESENCIA EN 3D**: muestran datos de referencia hasta que el canal está listo. Espera al `(2)`.

### 1.5 El cronómetro de la barra superior

El contador de sesión arranca en **04:18:32** —es un valor sembrado en el código, no una sesión real de cuatro horas—. No hagas zoom sobre él ni lo menciones. Si prefieres quitarte el problema, pon el `SEED` a `0` en [TopBar.tsx](../src/components/ui/TopBar.tsx) antes de grabar.

### 1.6 Resolución y ventanas

El layout necesita **~1 280 px de ancho mínimo** para respirar (barras laterales de 206 px y 296 px más la ventana central).

| Montaje | Cómo | Cuándo usarlo |
|---|---|---|
| **Recomendado** | Pantalla 2560 × 1440, dos ventanas de 1280 × 1440 lado a lado. Exportar a 1080p. | Toda la demo en split permanente. Es el montaje que mejor prueba la afirmación #1. |
| Alternativo | Ventana A a pantalla completa; ventana B se superpone en esquina (PiP) solo en los momentos de sincronía. | Si solo tienes 1080p. Requiere edición. |
| **Evitar** | Dos ventanas de 960 px. | El layout se comprime y la barra inferior se vuelve ilegible. |

> Si usas split permanente, **etiqueta las ventanas en post**: `USUARIO A` y `USUARIO B` en una esquina, tipografía monoespaciada, discreto. Sin eso el jurado tarda 10 segundos en entender qué está viendo — y solo tienes 120.

---

## 2. Reparto y roles

| Rol | Quién | Qué hace |
|---|---|---|
| **Usuario A** (ventana izquierda) | Operador 1 | Coloca el jardín interno y los muros. Es quien pulsa **Aplicar sugerencia** y **Bloquear diseño**. |
| **Usuario B** (ventana derecha) | Operador 2 | Coloca el módulo HPC y los racks — **es quien provoca el conflicto térmico**. Es quien recarga al final. |
| **El Arquitecto** | El sistema | Entra solo. Nadie lo llama. |
| **Locución** | Una tercera persona, o A en post | Nunca narres mientras haces clic: se nota en el ritmo. Graba el audio aparte. |

**Ensayen la coreografía dos veces sin grabar.** Los tiempos muertos son el enemigo: 2 minutos se van muy rápido.

---

## 3. La receta del conflicto (lo más importante de esta guía)

La IA solo tiene algo interesante que decir si **le das un conflicto real**. Este es el que el sistema detecta de forma garantizada y corrige de la forma más vistosa:

### Regla que vamos a romper

> Todo módulo que disipa **≥ 8 kW** necesita un **jardín a menos de 4.50 m**. Si no lo tiene, la corrección es **llevarlo junto al jardín** para ventilación cruzada.

### La secuencia exacta

| Orden | Quién | Herramienta | Dónde en la parcela | Por qué |
|---|---|---|---|---|
| 1 | **A** | `Jardín interno` | **Tercio lejano** de la parcela (≈ `z = +6`) | **Tiene que existir un jardín.** Sin él, la IA se queja pero no puede reubicar nada, y el plano de la corrección no sucede. |
| 2 | **A** | `Muro` ×2 | Junto a una fachada larga | Da cuerpo al recinto y degrada visiblemente **Iluminación natural** en el panel. |
| 3 | **B** | `Módulo HPC` **18 kW** | **Tercio opuesto** (≈ `z = -6`) | 12 m de separación ≫ 4.50 m → **conflicto térmico garantizado**. |
| 4 | **B** | `Racks de servidores` **12 kW** | **Pegado al HPC** | Suma un **clúster térmico de 30 kW**. Refuerza el diagnóstico y hace que el panel se ponga en ámbar. |

**El jardín va primero. Siempre.** Es la única pieza de la que depende que la corrección ocurra.

### Qué va a hacer la IA

Buscará un hueco libre alrededor del jardín, en anillos crecientes por los cuatro costados, descartando lo ocupado, y **moverá el HPC unos 10 metros a lo largo de la parcela** hasta quedar pegado al jardín. Es un movimiento largo y perfectamente visible en cámara. Con el motor LLM la colocación puede variar ligeramente; el efecto en pantalla es el mismo.

### Cómo se coloca cada pieza

- Selecciona la herramienta en la barra izquierda → **un clic sobre la losa** deposita la pieza ahí.
- Las herramientas de programa muestran su carga: **`Módulo HPC · 18 kW` en ámbar**. Vale la pena un plano de medio segundo sobre esa etiqueta.
- **Arrastrar** un volumen lo mueve; se ve moverse en la otra ventana mientras arrastras.
- Teclas: **`R`** rota 90°, **`Supr`** elimina, **`Esc`** deselecciona.
- Orbitar es arrastrar sobre el vacío. Un movimiento de más de 4 px ya cuenta como órbita, no como clic — **si quieres colocar, haz un clic seco**.

### El disparo automático

**Nadie llama a la IA.** Pasados **2.5 segundos** desde el último cambio de geometría, un solo cliente —elegido de forma determinista— dispara la evaluación. En cámara: coloca la última pieza, **suelta el ratón y no toques nada**. La IA entra sola. Ese silencio de tres segundos es el mejor plano del vídeo; no lo llenes.

---

## 3 bis. Beat opcional: la hora solar

> ⚠️ **Comprobar antes de guionizarlo.** La hora solar **ya es estado compartido de la sala** (viaja en vivo por el canal efímero mientras se arrastra y se confirma en el durable al soltar), pero el **control en la HUD y la medición de luz por trazado de rayos estaban entrando en el código mientras se escribió esta guía**. Abre la app y mira si hay un control de hora sobre el lienzo. Si no lo hay, **salta este beat**: el vídeo funciona perfectamente sin él.

Si el control existe, es el mejor plano opcional que tienes, y va **entre el plano 7 y el 8** (róbale 8 s al plano 7):

- **A arrastra la hora** de mediodía hacia el atardecer.
- **En la ventana B el sol se mueve a la vez**, sin que B toque nada: las sombras barren la parcela y la luz pasa de blanca a ámbar rasante.
- Al soltar, la hora **queda fijada para toda la sala** — y sobrevive a la recarga del plano 9.

Locución para ese beat:
> *"La hora del día también es estado compartido. Cuando alguien mueve el sol, se mueve para todos — y el equipo discute la luz en el mismo instante, no cada uno en el suyo."*

**Gotcha de continuidad:** la hora es **durable**, igual que el bloqueo. Si en una toma anterior dejaste el sol a las siete de la tarde, **la siguiente toma arranca a las siete de la tarde**. Devuélvelo a mediodía antes de repetir, o la parcela saldrá naranja en el plano 1 sin que nadie lo haya pedido.

---

## 4. Guion plano a plano

| # | Tiempo | Duración | En pantalla | Acción |
|---|---|---|---|---|
| **1** | 0:00 – 0:10 | 10 s | Split. Parcela vacía en ambas ventanas. Los dos avatares reales, con sus conos de visión. | A y B mueven el puntero suavemente sobre la losa. **No colocar nada todavía.** |
| **2** | 0:10 – 0:20 | 10 s | Zoom suave sobre la barra superior: `Sesión en vivo · Sincronizado con Portal`, roster con 2 avatares. | Ninguna. Es un plano de contexto. |
| **3** | 0:20 – 0:35 | 15 s | A coloca **jardín interno** + 2 muros. Aparecen **simultáneamente en la ventana B**. | La cámara de B **no se toca**: que se vea que la geometría llega sola. |
| **4** | 0:35 – 0:50 | 15 s | B coloca **HPC** y **racks** en el extremo opuesto. Plano corto sobre `18 kW` en la barra de herramientas. | B suelta el ratón. **Manos quietas.** |
| **5** | **0:50 – 1:05** | **15 s** | 🔥 **EL PLANO CLAVE.** El cursor del Arquitecto **entra y se desplaza** por la parcela con la etiqueta `analizando`. El panel derecho pasa a `Analizando`, llega su mensaje al chat y las métricas se ponen en ámbar. | **Nadie toca nada.** Silencio de locución 3 segundos. |
| **6** | 1:05 – 1:20 | 15 s | A pulsa **`Aplicar sugerencia (1)`**. El cursor de la IA se desplaza al destino con estado `corrigiendo` y **el módulo HPC viaja 10 m hasta el jardín — en las dos ventanas a la vez**. | Un solo clic. Deja que la animación termine. |
| **7** | 1:20 – 1:32 | 12 s | Plano sobre el panel derecho: métricas recalculadas, badge del motor (`gpt · openai` o `heurística local`), miniatura de calor con la corrección. | Opcional: A pulsa un participante en el roster y **la cámara vuela a la vista del otro** (620 ms). |
| **8** | 1:32 – 1:45 | 13 s | A pulsa **`Bloquear diseño`**. El marco del lienzo se tiñe de acento, ambas ventanas muestran **`Cerrado por <nombre>`**, las herramientas se desactivan. | B intenta arrastrar un volumen: **no se mueve**. Un intento, breve. |
| **9** | **1:45 – 1:55** | **10 s** | 🔥 **LA PRUEBA FINAL.** B **recarga la ventana** (F5). El laboratorio se reconstruye entero desde el historial: geometría, corrección de la IA **y el bloqueo**. | Recargar y esperar. Que se vea el `Inicializando lienzo 7 × 20…` y luego el estado íntegro. |
| **10** | 1:55 – 2:00 | 5 s | Órbita lenta sobre el laboratorio terminado. Cierre con el título. | Solo cámara. |

**Presupuesto de tiempo:** los planos **5**, **6** y **9** son el 40 % del vídeo y valen el 90 % de la nota. Si un plano se alarga, roba tiempo del **2**, del **7** o del **10**, nunca de esos tres.

---

## 5. Locución (texto literal)

Grábala aparte, en una toma limpia, y móntala encima. Ritmo tranquilo: **son 2 minutos, no 90 segundos de prisa**.

> **[0:00]** Esto es BRUTAL-140: una parcela de siete por veinte metros, ciento cuarenta metros cuadrados exactos, abierta a la vez para todo un equipo.
>
> **[0:10]** Los cursores no son flechas sobre una pantalla. Son cuerpos dentro de la malla, con su posición en equis, ye, zeta, y mirando hacia donde mira de verdad su dueño.
>
> **[0:20]** Cuando alguien coloca un volumen, no se sincroniza un archivo: se emite un mensaje. El resto de la sala lo ve aparecer al instante.
>
> **[0:35]** Ahora metemos el programa del laboratorio. Este módulo de computación disipa dieciocho kilovatios. Está en el extremo opuesto al jardín.
>
> **[0:50]** *(silencio — 3 segundos)* Nadie ha llamado a la inteligencia artificial. **Ha entrado sola.**
>
> **[0:57]** El Arquitecto no es un chat en una barra lateral: es un participante más de la sala, con cursor propio, que lee la geometría compartida, mide el conflicto térmico y se desplaza hasta él.
>
> **[1:05]** Y cuando aceptamos su corrección, no escribe una sugerencia. **Mueve el módulo.** Diez metros, hasta el jardín interno, para ventilación cruzada. Y las dos personas lo ven moverse a la vez.
>
> **[1:20]** El análisis se recalcula sobre la geometría real: iluminación, carga, circulación, acústica. Cada métrica responde a su propia causa.
>
> **[1:32]** Cerramos el diseño. El bloqueo viaja por el canal durable, así que congela la edición para toda la sala.
>
> **[1:45]** Y esta es la prueba: recargamos. **No hay base de datos.** El estado es el registro de mensajes, y al reducirlo vuelve el laboratorio entero — incluida la corrección de la IA y el cierre.
>
> **[1:55]** Ciento cuarenta metros cuadrados. Dos personas y un agente. En tiempo real.

**Duración leída:** ~1:50. Deja aire; no rellenes los silencios de los planos 5 y 9.

---

## 6. Plan B

Graba **siempre** una toma limpia de reserva antes de la buena. Si algo se tuerce:

| Síntoma | Causa probable | Salida |
|---|---|---|
| La IA no entra sola | No hay conflicto: el jardín está a menos de 4.50 m del HPC, **o no hay jardín**. | Arrastra el HPC al extremo opuesto y suelta. A los 2.5 s dispara. |
| La IA opina pero **no mueve nada** | No existe ningún jardín, así que no hay destino de ventilación. | Coloca un jardín interno y espera. |
| `Aplicar sugerencia` está en gris | El veredicto trajo 0 correcciones, o el diseño está bloqueado. | Desbloquea; o mete otra pieza caliente para generar conflicto. |
| El cursor de la IA solo se ve en una ventana | Falta `PORTAL_SECRET`. | Corta la grabación. Sin eso no se sostiene la afirmación #2. |
| El badge dice `heurística local` y esperabas LLM | Falta `OPENAI_API_KEY`, o el modelo falló y cayó al respaldo. | **No lo escondas.** Menciónalo: *"y si el modelo cae, el evaluador local responde igual"*. Suma en robustez. |
| Aparecen Diego, Claudia y Mateo | Ningún cursor remoto vivo → escena de referencia. | Que el otro mueva el ratón sobre la losa. Repite la toma. |
| El diseño no se puede editar y nadie lo bloqueó | Alguien pulsó **Bloquear** en una toma anterior; el estado sobrevive a la recarga. | Pulsa **Diseño bloqueado** para reabrir. |
| Quieres empezar de cero | — | **Limpiar parcela** en la barra izquierda: **pide dos clics** en 4 segundos. |

**Regla de oro:** si algo falla en directo, **no depures en cámara**. Corta, arregla, repite la toma.

---

## 7. Grabación y post

### Captura

- **1080p a 60 fps.** El WebGL orbitando a 30 fps se ve barato; el desplazamiento del cursor de la IA merece los 60.
- **Sin cursor del sistema resaltado.** Los avatares de la app ya son los protagonistas; un halo amarillo de OBS compite con ellos.
- **Silencia notificaciones.** Un toast de Slack encima del panel de la IA arruina la toma.
- **Modo oscuro del SO**, ventana sin barras de marcadores. La app es monocromática oscura: cualquier cromo blanco desentona.

### Montaje

1. **Etiquetas de ventana** (`USUARIO A` / `USUARIO B`) desde el primer fotograma. Monoespaciada, opacidad ~70 %.
2. **Zoom digital suave** (1.15×) en los planos 2, 4 y 7 para que el texto de los paneles se lea en móvil.
3. **Resalta el momento clave**: en el plano 5, un recuadro sutil sobre el cursor del Arquitecto cuando entra. Sin flechas rojas ni efectos de sonido.
4. **Sin música**, o música muy por debajo. La locución es el contenido.
5. **Subtítulos quemados en español.** Muchos jurados ven las demos sin sonido.
6. **Primer fotograma = miniatura**: la parcela con los dos avatares y el título. Nada de pantalla negra.

### Entrega

- `brutal-140-demo.mp4`, H.264, 1080p, **por debajo de 100 MB**.
- Duración: **2:00 o menos**. Si el envío pide 90 s, corta los planos 2, 7 y 10 y ajusta la locución.

---

## 8. Checklist final

**Antes de grabar**

- [ ] `.env.local` con `pk_`, `sk_` y (idealmente) `OPENAI_API_KEY`
- [ ] `npm run build` && `npm start` — **no** `next dev`
- [ ] Barra superior: **`Sincronizado con Portal`**, punto verde
- [ ] Dos ventanas, **perfiles distintos**, `PARTICIPANTES (2)` con nombres distintos
- [ ] Los dos han movido el ratón sobre la losa → **sin avatares de referencia**
- [ ] Parcela vacía (usa **Limpiar parcela** — dos clics)
- [ ] Diseño **desbloqueado**
- [ ] Hora solar de vuelta a **mediodía** si una toma anterior la movió (es estado durable)
- [ ] Notificaciones silenciadas, `.env.local` cerrado, sin barra de marcadores
- [ ] Coreografía ensayada **dos veces** sin grabar

**Que quede en el vídeo, sí o sí**

- [ ] Geometría apareciendo en la ventana B sin que B toque nada
- [ ] El cursor de la IA **entrando solo** y desplazándose
- [ ] El módulo **moviéndose en las dos ventanas a la vez**
- [ ] El bloqueo congelando la edición para ambos
- [ ] **La recarga reconstruyendo el estado completo**

**Después**

- [ ] Etiquetas `USUARIO A` / `USUARIO B` puestas
- [ ] Subtítulos en español
- [ ] Ninguna clave visible en ningún fotograma — **revísalo fotograma a fotograma en los planos de terminal**
- [ ] Duración ≤ 2:00
- [ ] Se ve bien en el móvil, con el sonido apagado

---

## 9. Relación con el pitch

Este vídeo es la diapositiva **05** de [PITCH.md](PITCH.md). Las diapositivas **06**, **07** y **08** explican, en ese orden, lo que el vídeo acaba de mostrar:

| Plano del vídeo | Diapositiva que lo explica |
|---|---|
| 1 – 3 (presencia y sincronía) | **06** — Presencia física, no un puntero de colores |
| 5 – 6 (la IA entra y corrige) | **07** — El Arquitecto no es un chatbot |
| 8 – 9 (bloqueo y recarga) | **08** — El log de mensajes *es* el estado |

Si presentas en vivo con el vídeo pregrabado como respaldo: **empieza en vivo**. Solo pincha el vídeo si la sala se cae. Un jurado distingue perfectamente una demo en vivo de una grabada, y la primera vale el doble.
