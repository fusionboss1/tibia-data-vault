/**
 * Feature flags configuration
 * Set to `true` to enable a feature, `false` to hide it from UI
 */
export const FEATURES = {
  // Released features (always enabled)
  DASHBOARD: false,
  SERVERS: false,
  WEEKLY_DELIVERY: false,

  // Features in development (disable for production)
  INVENTORY: false,
  BOUNTY_CALCULATOR: true,
}

/**
 * Check if a feature is enabled
 * @param {string} featureName - Key from FEATURES object
 * @returns {boolean}
 */
export const isFeatureEnabled = (featureName) => {
  return FEATURES[featureName] === true
}
