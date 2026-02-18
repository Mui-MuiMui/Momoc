import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ja from "./ja.json";

// Detect initial language from VSCode or browser
function detectLanguage(): string {
  // Check if VSCode set language via document attribute
  const htmlLang = document.documentElement.lang;
  if (htmlLang) {
    const lang = htmlLang.split("-")[0];
    if (lang === "ja") return "ja";
  }

  // Check navigator language
  const navLang = navigator.language?.split("-")[0];
  if (navLang === "ja") return "ja";

  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
