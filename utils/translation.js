const { t } = require("../config/i18n");

/**
 * Get translated message
 * @param {string} key - Translation key
 * @param {object} options - Translation options
 * @param {string} lng - Language code (optional, will use current language if not provided)
 * @returns {string} Translated message
 */
const translate = (key, options = {}, lng = null) => {
  return t(key, { ...options, lng });
};

/**
 * Get translated error message
 * @param {string} key - Error key
 * @param {object} options - Translation options
 * @param {string} lng - Language code (optional)
 * @returns {object} Error response object
 */
const getErrorResponse = (key, options = {}, lng = null) => {
  return {
    success: false,
    message: translate(key, options, lng),
  };
};

/**
 * Get translated success message
 * @param {string} key - Success key
 * @param {object} options - Translation options
 * @param {string} lng - Language code (optional)
 * @returns {object} Success response object
 */
const getSuccessResponse = (key, options = {}, lng = null) => {
  return {
    success: true,
    message: translate(key, options, lng),
  };
};

/**
 * Get translated response with data
 * @param {string} key - Message key
 * @param {any} data - Response data
 * @param {object} options - Translation options
 * @param {string} lng - Language code (optional)
 * @returns {object} Response object with data
 */
const getDataResponse = (key, data, options = {}, lng = null) => {
  return {
    success: true,
    message: translate(key, options, lng),
    data,
  };
};

/**
 * Get language from request
 * @param {object} req - Express request object
 * @returns {string} Language code
 */
const getLanguageFromRequest = (req) => {
  return req.language || req.lng || "en";
};

module.exports = {
  translate,
  getErrorResponse,
  getSuccessResponse,
  getDataResponse,
  getLanguageFromRequest,
};
