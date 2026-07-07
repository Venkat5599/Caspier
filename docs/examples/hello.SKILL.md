---
name: hello-weather
version: 0.1.0
description: Returns a one-line weather summary for a city. Example skill manifest.
runtime: code
pricing:
  pricePerCall: "1000"
  asset: CSPR
inputSchema:
  type: object
  required: [city]
  properties:
    city:
      type: string
outputSchema:
  type: object
  required: [summary]
  properties:
    summary:
      type: string
tools:
  - http.get
scope:
  egress:
    - api.open-meteo.com
  maxSpendPerCall: "0"
---

# hello-weather

Given a `city`, fetch current conditions and return a single-sentence summary.

## Behavior
1. Geocode the city.
2. Fetch current weather.
3. Return `{ summary: "<city> is <temp>°C, <conditions>." }`.

This is an example `SKILL.md` showing the manifest contract. The body describes
what the skill does; the runtime executes it inside the sandbox, metered per call.
