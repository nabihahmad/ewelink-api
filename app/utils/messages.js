import en from "../locales/en.json";
import ar from "../locales/ar.json";

const languages = {
  en,
  ar,
};

const get = (key, lang = "en") => {
  const messages = languages[lang] || languages.en;
  return messages[key] || key;
};

export default { get };
