# SinGluten Life — prototipo visual

App para personas celiacas o intolerantes al gluten (sin TACC).

## Stack previsto
- Front: React (esta carpeta)
- Back: .NET Core (aún no)
- DB: PostgreSQL (aún no)

## Cómo correr el front

```bash
cd frontend
npm install
npm run dev
```

## Qué hay ahora
Pantallas con datos de ejemplo:
- Inicio
- Lugares cerca (restaurantes, panaderías, dietéticas)
- Farmacias / droguerías con productos sin TACC
- Menú del día
- Recetas filtradas por presupuesto + dónde comprar ingredientes

## Próximo análisis (sin implementar)
- Lugares cercanos: geolocalización del browser + Google Places / OpenStreetMap, filtrando por “gluten free” y directorios locales (ACELA, apps argentinas, listados de locales certificados).
- Productos: padrón ANMAT de alimentos libres de gluten.
- Recetas: base propia o APIs (Spoonacular, Edamam) + precios de referencia.       
