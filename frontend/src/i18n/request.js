import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requested = await requestLocale;
  const resolvedLocale = routing.locales.includes(locale)
    ? locale
    : routing.locales.includes(requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
