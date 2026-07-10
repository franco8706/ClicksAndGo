/**
 * =====================================================================
 * 🌐 Tipo canónico de los diccionarios i18n
 * es/en/pt son estructuralmente idénticos (verificado: 162 claves cada uno),
 * por lo que la forma de es.json sirve como contrato para los tres.
 * Reemplaza los `dict: any` dispersos en componentes y páginas.
 * =====================================================================
 */
import esDict from "@/dictionaries/es.json";

export type Dict = typeof esDict;
