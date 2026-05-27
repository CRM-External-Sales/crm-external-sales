import enClient from "./locales/en/client.json";
import esClient from "./locales/es/client.json";

export const clientResources = {
  es: { client: esClient },
  en: { client: enClient },
} as const;
