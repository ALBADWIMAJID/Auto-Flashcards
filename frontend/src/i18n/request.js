import { getRequestConfig } from "next-intl/server";

const locales = ["en", "ar", "ru"];

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale) ? locale : "en";

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
