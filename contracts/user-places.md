# Contrato — Lugares del usuario (SinGluten Life)

Estado: pendiente de firma. Reemplaza el contrato anterior.

## Objetivo

Un usuario con sesión puede agregar, editar y eliminar de forma lógica sus lugares. Esos lugares aparecen en las listas públicas según la cercanía, sin tapar un lugar que el algoritmo ya publica. La ubicación que se guarda es la del marcador en el mapa de OpenStreetMap.

## Enfoque y restricciones aprobados

- Ruta `/mi-lugar`. El ítem de menú existe solo con usuario logueado (el mismo login que las recetas). Sin sesión, la ruta pide login y no aparece en la navegación.
- Cada usuario puede cargar varios lugares.
- Campos de alta y edición: nombre, imagen, descripción, horarios, reseña opcional y menú opcional. El menú puede ir vacío.
- La dirección no es un solo texto. Son cinco controles: combo de país, combo de provincia, combo de barrio, texto de calle y texto de altura.
- País lista todos los países. Provincia lista todas las provincias o estados del país elegido. Barrio lista todas las localidades de la provincia elegida. En Argentina las localidades salen del padrón oficial. Si el mapa devuelve un barrio que no estaba en la lista, se agrega y queda seleccionado.
- La dirección guardada es la concatenación `calle altura, barrio, provincia, país`.
- El mapa es Leaflet con teselas de OpenStreetMap, el mismo mapa que ya usa Lugares remotos. No usa clave de Google. Es obligatorio para guardar, aunque la dirección esté completa. Se guarda `lat` y `lon` del marcador.
- Al completar calle y altura (con país, provincia y barrio), el marcador se coloca geocodificando esa dirección concatenada con Nominatim.
- El marcador se mueve con un clic en el mapa o arrastrándolo.
- Si la persona mueve el marcador, país, provincia, barrio, calle y altura se completan con la dirección que Nominatim devuelve en ese punto.
- Si Nominatim no encuentra el número de puerta, el marcador queda en el punto que sí resuelve y la persona lo ajusta a mano.
- No se puede guardar sin coordenadas del marcador.
- `VITE_GOOGLE_MAPS_API_KEY` no se usa en este formulario. Sin esa clave el mapa igual carga.
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
- `menu` (opcional, vacío si no hay)
- `review` (opcional, vacío si no hay)
- `country`
- `province`
- `neighborhood`
- `street`
- `streetNumber`
- `address` (concatenación de los cinco campos)
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
3. Un lugar propio entra en Lugares y en Lugares remotos según la cercanía al origen correcto, usando las coordenadas del marcador.
4. A igual cercanía, o si está cerca de uno scrapeado, gana el del algoritmo.
5. Si el nombre y la ubicación coinciden con uno ya publicado por el algoritmo, el del usuario no se muestra en público.
6. Se puede guardar sin menú.
7. No se puede guardar sin marcador en el mapa.
8. La dirección concatenada mueve el marcador. Mover el marcador completa país, provincia, barrio, calle y altura.
9. El mapa de Mi lugar carga sin `VITE_GOOGLE_MAPS_API_KEY`.
