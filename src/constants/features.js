/**
 * Feature flags configuration
 * Set to `true` to enable a feature, `false` to hide it from UI
 */
export const FEATURES = {
  // Released features (always enabled)
  DASHBOARD: true,
  SERVERS: true,
  WEEKLY_DELIVERY: false,

  // Features in development (disable for production)
  INVENTORY: true,  // Stash Inventory - still in development
  BOUNTY_CALCULATOR: true,
  MARKET_BROWSER: true,
}

/**
 * Check if a feature is enabled
 * @param {string} featureName - Key from FEATURES object
 * @returns {boolean}
 */
export const isFeatureEnabled = (featureName) => {
  return FEATURES[featureName] === true
}
