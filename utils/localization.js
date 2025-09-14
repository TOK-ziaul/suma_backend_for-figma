/**
 * Get localized content based on language preference
 * @param {object} content - Object with language keys (en, ar)
 * @param {string} language - Language code (en, ar)
 * @param {string} fallback - Fallback language (default: 'en')
 * @returns {string} Localized content
 */
const getLocalizedContent = (content, language = "en", fallback = "en") => {
  if (!content || typeof content !== "object") {
    return content;
  }

  // If content is already a string, return it
  if (typeof content === "string") {
    return content;
  }

  // Return localized content or fallback
  return (
    content[language] ||
    content[fallback] ||
    content.en ||
    Object.values(content)[0] ||
    ""
  );
};

/**
 * Localize a product object
 * @param {object} product - Product object
 * @param {string} language - Language code
 * @returns {object} Localized product
 */
const localizeProduct = (product, language = "en") => {
  if (!product) return product;

  return {
    ...product,
    name: getLocalizedContent(product.name, language),
    description: getLocalizedContent(product.description, language),
  };
};

/**
 * Localize an array of products
 * @param {array} products - Array of product objects
 * @param {string} language - Language code
 * @returns {array} Array of localized products
 */
const localizeProducts = (products, language = "en") => {
  if (!Array.isArray(products)) return products;

  return products.map((product) => localizeProduct(product, language));
};

/**
 * Get language from request headers or query params
 * @param {object} req - Express request object
 * @returns {string} Language code
 */
const getLanguageFromRequest = (req) => {
  // Check query parameter first
  if (req.query.lang && ["en", "ar"].includes(req.query.lang)) {
    return req.query.lang;
  }

  // Check Accept-Language header
  const acceptLanguage = req.get("Accept-Language");
  if (acceptLanguage) {
    if (acceptLanguage.includes("ar")) return "ar";
    if (acceptLanguage.includes("en")) return "en";
  }

  // Check i18n middleware language
  if (req.language && ["en", "ar"].includes(req.language)) {
    return req.language;
  }

  // Default to English
  return "en";
};

module.exports = {
  getLocalizedContent,
  localizeProduct,
  localizeProducts,
  getLanguageFromRequest,
};
