const i18next = require("i18next");
const Backend = require("i18next-fs-backend");
const middleware = require("i18next-http-middleware");
const path = require("path");

// Initialize i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init(
    {
      // Debug mode (set to false in production)
      debug: process.env.NODE_ENV === "development",

      // Fallback language
      fallbackLng: "en",

      // Supported languages
      supportedLngs: ["en", "ar"],

      // Namespace
      ns: ["translation"],
      defaultNS: "translation",

      // Backend configuration
      backend: {
        loadPath: path.join(__dirname, "../locales/{{lng}}.json"),
      },

      // Language detection options
      detection: {
        order: ["header", "cookie", "querystring"],
        caches: ["cookie"],
        lookupHeader: "accept-language",
        lookupCookie: "i18next",
        lookupQuerystring: "lng",
      },

      // Interpolation options
      interpolation: {
        escapeValue: false, // React already does escaping
      },

      // React options
      react: {
        useSuspense: false,
      },

      // Load all languages on init
      preload: ["en", "ar"],
    },
    (err, t) => {
      if (err) {
        console.error("i18n initialization error:", err);
      } else {
        console.log("i18n initialized successfully");
      }
    }
  );

module.exports = {
  i18next,
  middleware: middleware.handle(i18next),
  t: i18next.t.bind(i18next),
};
