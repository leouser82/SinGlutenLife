# Contrato — Ficha del lugar propio (SinGluten Life)

Estado: pendiente de firma. Reemplaza el contrato anterior solo en lo que se lista acá. El mapa, el guardado, las listas y el borrado lógico siguen como están.

## Objetivo

La ficha pública de un lugar cargado por el usuario se ve como la de los demás lugares. La descripción acepta un texto más largo. En el formulario, país, provincia, calle y altura ocupan menos ancho.

## Enfoque y restricciones aprobados

- La ficha de un lugar con `source: 'user'` usa la misma estructura que `PlaceDetalle` de un lugar scrapeado: volver, tipo y distancia, nombre, dirección, foto grande, pestañas Fotos, Menú, Horarios y Opiniones.
- Sobre el lugar muestra la descripción del usuario.
- Qué ofrecen sin TACC muestra el menú. Si el menú está vacío, se ve el mismo aviso vacío que en los demás lugares.
- Ubicación muestra la dirección, el enlace Ver en Google Maps y el mapa embebido de OpenStreetMap.
- Horarios queda en la columna derecha, con el mismo listado.
- Opiniones muestra la reseña escrita. Si no hay reseña, se ve el mismo aviso de sin opiniones.
- No se muestran estrellas ni el botón de opiniones de Google.
- La descripción pasa de 600 a 2000 caracteres en el formulario, en el PHP, en el middleware local y en la columna `description`.
- En el formulario, país y provincia van en una sola fila, cada uno a la mitad. Calle y altura van en la fila siguiente: la altura queda angosta y la calle ocupa el resto. El barrio sigue en su propia fila.
- El texto ya guardado con el límite de 600 no se recupera solo: hay que editarlo y guardarlo de nuevo.

## Definition of Done

1. Abrir un lugar propio muestra la ficha con foto, pestañas y las dos columnas, incluido el mapa en Ubicación.
2. La descripción se puede escribir hasta 2000 caracteres y se guarda completa.
3. País y provincia comparten fila. Calle y altura comparten fila, y la altura es más angosta que la calle.
