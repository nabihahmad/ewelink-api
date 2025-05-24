const en = require("../locales/en.json");
const ar = require("../locales/ar.json");

const languages = {
  en,
  ar,
};

const get = (key, lang = "en") => {
  const messages = languages[lang] || languages.en;
  return messages[key] || key;
};

module.exports = { get };
