# Contrato — Lugares del usuario (SinGluten Life)

Estado: pendiente de firma.

## Objetivo

Un usuario con sesión puede agregar, editar y eliminar de forma lógica sus lugares. Esos lugares aparecen en las listas públicas según la cercanía, sin tapar un lugar que el algoritmo ya publica.

## Enfoque y restricciones aprobados

- Ruta `/mi-lugar`. El ítem de menú existe solo con usuario logueado (el mismo login que las recetas). Sin sesión, la ruta pide login y no aparece en la navegación.
- Cada usuario puede cargar varios lugares.
- Campos de alta y edición: nombre, imagen, descripción, horarios, menú, dirección y reseña opcional. La dirección se geocodifica para ordenar por distancia.
- Editar cambia solo los lugares de ese usuario.
- Eliminar es borrado lógico: el registro se conserva, guarda la observación escrita al borrar, y deja de salir en las listas públicas.
- En Lugares, la distancia se mide desde la ubicación del usuario (GPS, IP o manual), radio 25 km.
- En Lugares remotos, la distancia se mide desde el punto del mapa, radio 40 km.
- Orden: más cercano primero. Si dos lugares están a menos de 200 m entre sí, o su distancia al origen difiere en 150 m o menos, el lugar de scraping (guías, OpenStreetMap, Photon) queda antes que el del usuario.
- Si el lugar del usuario ya está en esas fuentes (nombre normalizado parecido y a menos de 250 m), las listas públicas muestran solo el del algoritmo. En Mi lugar el dueño sigue viendo el suyo, marcado como ya publicado por las guías.
- Persistencia: tabla MySQL y un PHP que lee `db-config.php`, el mismo patrón que las recetas de la comunidad. El listado público no devuelve lugares borrados.

## Interfaces

Lugar de usuario:

- `id`
- `name`
- `image`
- `description`
- `hours`
- `menu`
- `review` (opcional, vacío si no hay)
- `address`
- `lat`
- `lon`
- `author`
- `createdAt`
- `updatedAt`
- `deletedAt` (`null` si está activo)
- `deleteNote` (observación del borrado; vacía si no fue borrado)

Listas públicas: el mismo objeto de lugar que ya usa `PlaceCard`, con `source: 'user'` o `source: 'scrape'`.

## Definition of Done

1. Sin sesión no hay entrada de menú. Con sesión sí, y se puede crear, editar y borrar.
2. El borrado guarda la observación y el lugar no vuelve a las listas públicas.
3. Un lugar propio entra en Lugares y en Lugares remotos según la cercanía al origen correcto.
4. A igual cercanía, o si está cerca de uno scrapeado, gana el del algoritmo.
5. Si el nombre y la ubicación coinciden con uno ya publicado por el algoritmo, el del usuario no se muestra en público.
