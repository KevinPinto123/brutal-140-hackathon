# ⬛ BRUTAL-140: Motor Espacial Colaborativo IA

> **The Realtime Hackathon by Portal - Agosto 2026**
> 
> *Construyendo IA que sucede ahora. Diseño espacial multijugador para entornos confinados.*

## ⚡ El Concepto

El diseño arquitectónico moderno está roto. Las herramientas son de un solo jugador, estáticas y tratan a la IA como un simple generador de texto o imágenes 2D. 

**BRUTAL-140** es un lienzo 3D colaborativo en tiempo real, restringido estrictamente a una parcela de 140m² (7 x 20 metros). Es un espacio donde desarrolladores, ingenieros y un Agente de IA autónomo (El Arquitecto) co-crean simultáneamente. 

No es un simple visualizador; es un motor de resolución de conflictos físicos. Mientras los usuarios humanos distribuyen módulos espaciales, la IA observa el estado global a través de **Portal** y actúa sobre el lienzo moviendo sus propios cursores para corregir la iluminación, optimizar la carga estructural y asegurar la viabilidad del entorno.

## 🎯 El Caso de Uso (Hackathon Demo)

Para la demostración en vivo de 39 horas, el entorno está pre-configurado con un objetivo específico: **El diseño de un laboratorio modular de innovación (Robótica, Impresión 3D y High-Performance Computing).**

La IA está instruida bajo parámetros de diseño estrictos:
*   **Estética:** Estilo brutalista (concreto expuesto).
*   **Iluminación:** Todo blanco con luz blanca artificial y natural.
*   **Bioclimática:** Integración obligatoria de jardines internos.

## 🛠️ Arquitectura en Tiempo Real (Powered by Portal)

Este proyecto exprime las capacidades de estado compartido de Portal:

1.  **Presencia Física 3D:** Los cursores no son flechas 2D; son avatares volumétricos dentro de la malla `(x, y, z)`. Los usuarios ven dónde está mirando y qué está tocando su equipo al milisegundo.
2.  **Sincronización de Mallas:** Cuando un usuario arrastra un bloque de concreto de 3x3m, Portal transmite el vector de traslación a todos los clientes sin latencia.
3.  **El "Ghost Cursor" de la IA:** La IA no es un chatbot en una ventana lateral. Es un usuario más conectado a la sala de Portal. Recibe el estado de la geometría en JSON, evalúa el diseño y transmite eventos de corrección (ej. "Mover muro 2 metros al norte para permitir jardín interno") que el frontend renderiza en vivo.

## 🚀 Flujo de la Demostración (2 Minutos)

1.  **Inicio (0:00):** Se abre el lienzo vacío de 7x20m. Dos usuarios humanos entran a la sala. Portal sincroniza su presencia.
2.  **Intervención Humana (0:30):** El Usuario A coloca el módulo de High-Performance Computing. El Usuario B coloca los racks de servidores bloqueando el flujo de luz blanca.
3.  **Intervención IA (1:00):** La IA detecta la colisión térmica y estética en el estado compartido. Aparece el cursor de la IA, selecciona los racks y los reubica automáticamente junto a la zona del jardín interno para ventilación.
4.  **Aprobación (1:30):** Ambos usuarios ven la corrección en tiempo real, asienten con el modelo de cámara 3D y bloquean el estado final del laboratorio.

## 💻 Stack Tecnológico

*   **Frontend & 3D:** Next.js + React Three Fiber (Three.js) para renderizado WebGL hiper-ligero.
*   **Realtime Backend:** Portal (Rooms, Presence, Broadcast Events).
*   **AI Engine:** LLM (OpenAI / Anthropic) con `response_format: { type: "json_object" }` para escupir coordenadas espaciales `(x,y,z)` estructuradas basadas en el estado del mapa.
*   **Styling:** TailwindCSS para la UI superpuesta (minimalista, monocromática).

## 🧠 Lógica del Estado (Portal Payload Example)

```json
// Lo que Portal transmite en cada milisegundo
{
  "room_id": "lab_140",
  "entities": {
    "module_hpc": { "x": 2, "y": 0, "z": 5, "rotation": 90, "type": "concrete" },
    "garden_01": { "x": 5, "y": 0, "z": 15, "rotation": 0, "type": "biophilic" }
  },
  "active_cursors": {
    "user_1": { "x": 2.5, "z": 5.5, "status": "dragging" },
    "ai_architect": { "x": 5.5, "z": 14.5, "status": "evaluating_light" }
  }
}