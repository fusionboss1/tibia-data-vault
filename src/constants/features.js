/**
 * Feature flags configuration
 * Set to `true` to enable a feature, `false` to hide it from UI
 */
export const FEATURES = {
  // Released features (always enabled)
  SERVERS: true,
  EXPORTEITOR: true,
  WEEKLY_DELIVERY: true,

  // Features in development (disable for production)
  INVENTORY: true,  // Stash Inventory - still in development
}

/**
 * Check if a feature is enabled
 * @param {string} featureName - Key from FEATURES object
 * @returns {boolean}
 */
export const isFeatureEnabled = (featureName) => {
  return FEATURES[featureName] === true
}
