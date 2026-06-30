import React from "react";

const COPY = {
  es: {
    label: "Fuentes y licencias de los datos cartográficos:",
    countries: "límites de países",
    subdivisions: "provincias y subdivisiones",
    metadata: "nombres y regiones",
    cities: "ciudades",
    publicDomain: "dominio público",
    dataDownload: "base derivada ODbL",
    notices: "avisos y licencias completos"
  },
  en: {
    label: "Map data sources and licenses:",
    countries: "country boundaries",
    subdivisions: "provinces and subdivisions",
    metadata: "names and regions",
    cities: "cities",
    publicDomain: "public domain",
    dataDownload: "ODbL-derived database",
    notices: "full notices and licenses"
  }
};

function MapDataLegalFooter({ locale = "es" }) {
  const copy = COPY[locale] ?? COPY.es;

  return (
    <footer className="maps-legal-footer" aria-label={copy.label}>
      <span>{copy.label}</span>{" "}
      <a href="https://github.com/datasets/geo-countries" target="_blank" rel="noreferrer">
        {copy.countries} (PDDL 1.0)
      </a>
      {" · "}
      <a href="https://github.com/codeforgermany/click_that_hood" target="_blank" rel="noreferrer">
        {copy.subdivisions} (MIT)
      </a>
      {" · "}
      <a href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">
        {copy.metadata} (ODbL 1.0)
      </a>
      {" · "}
      <a href="https://github.com/nvkelso/natural-earth-vector" target="_blank" rel="noreferrer">
        {copy.cities} ({copy.publicDomain})
      </a>
      {" · "}
      <a href="/legal/map-country-metadata-odbl.json" download>
        {copy.dataDownload}
      </a>
      {" · "}
      <a href="/legal/map-data-licenses.txt" target="_blank" rel="noreferrer">
        {copy.notices}
      </a>
    </footer>
  );
}

export default MapDataLegalFooter;
