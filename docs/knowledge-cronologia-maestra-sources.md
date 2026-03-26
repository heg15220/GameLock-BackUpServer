# Cronologia Maestra: Fuentes y Generacion Masiva

## Fuentes usadas
- Wikidata Query Service (SPARQL): https://query.wikidata.org/
- Wikidata API (`wbgetentities`): https://www.wikidata.org/w/api.php
- Documentacion SPARQL de Wikidata: https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
- Propiedades de fecha usadas:
  - `P585` (point in time): https://www.wikidata.org/wiki/Property:P585
  - `P580` (start time): https://www.wikidata.org/wiki/Property:P580
  - `P571` (inception): https://www.wikidata.org/wiki/Property:P571
  - `P577` (publication date): https://www.wikidata.org/wiki/Property:P577
  - `P619` (launch date): https://www.wikidata.org/wiki/Property:P619

## Script de generacion
- Archivo: `scripts/generate-timeline-event-bank.py`
- Comando:

```bash
python scripts/generate-timeline-event-bank.py
```

## Salidas generadas
- `src/games/knowledge/timelineEventBank.generated.js`
- `src/games/knowledge/timelineEventBank.generated.meta.json`

## Notas de calidad
- Se generan 10.000 eventos nuevos.
- Dedupe por entidad Wikidata (`QID`) para evitar duplicados.
- Año validado y acotado a hechos historicos (<= 2026).
- Contenido localizado para `es` y `en` con resumen bilingue.
