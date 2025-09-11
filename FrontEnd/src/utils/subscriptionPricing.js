/**
 * Utility functions for subscription pricing calculations
 */

/**
 * Calculate the adjusted price for a subscription upgrade based on time remaining
 * @param {Object} currentSubscription - User's current subscription
 * @param {Object} targetSubscription - Subscription user wants to upgrade to
 * @returns {number} - Adjusted price for the upgrade
 */
export const calculateUpgradePrice = (currentSubscription, targetSubscription) => {
  // If target subscription is free, return 0
  if (!targetSubscription || targetSubscription.price === 0) {
    return 0;
  }

  // If user has no current subscription, return full price
  if (!currentSubscription || !currentSubscription.planId) {
    return targetSubscription.price;
  }

  // If current subscription is free, return full price of target
  if (currentSubscription.planId.price === 0) {
    return targetSubscription.price;
  }

  // If current subscription is inactive or ended, return full price
  if (currentSubscription.status !== 'active' || !currentSubscription.endDate) {
    return targetSubscription.price;
  }

  // If upgrading to the same plan, return 0
  if (currentSubscription.planId._id === targetSubscription._id) {
    return 0;
  }

  try {
    const currentDate = new Date();
    const endDate = new Date(currentSubscription.endDate);
    const startDate = new Date(currentSubscription.startDate);

    // If subscription has already expired, return full price
    if (endDate <= currentDate) {
      return targetSubscription.price;
    }

    // Calculate time periods in milliseconds
    const totalDuration = endDate.getTime() - startDate.getTime();
    const remainingDuration = endDate.getTime() - currentDate.getTime();

    // Ensure we don't have negative durations
    if (remainingDuration <= 0 || totalDuration <= 0) {
      return targetSubscription.price;
    }

    // Calculate the percentage of time remaining
    const remainingPercentage = remainingDuration / totalDuration;

    // Calculate the unused portion of the current subscription using "règle de 3"
    // If user paid 50$ for 30 days and has 18 days remaining:
    // remainingValue = (18 days / 30 days) * 50$ = 30$
    const currentPlanPrice = currentSubscription.planId.price;
    const unusedAmount = currentPlanPrice * remainingPercentage;

    // Calculate the adjusted price (target price minus unused amount)
    const adjustedPrice = targetSubscription.price - unusedAmount;

    // Ensure the adjusted price is not negative
    return Math.max(0, adjustedPrice);

  } catch (error) {
    console.error('Error calculating upgrade price:', error);
    // Return full price if calculation fails
    return targetSubscription.price;
  }
};

/**
 * Get display price for a subscription (either original or calculated upgrade price)
 * @param {Object} subscription - The subscription to get price for
 * @param {Object} userSubscription - User's current subscription
 * @returns {number} - Price to display
 */
export const getDisplayPrice = (subscription, userSubscription) => {
  // For free plans, always return 0
  if (!subscription || subscription.price === 0) {
    return 0;
  }

  // If user has no subscription, return original price
  if (!userSubscription || !userSubscription.planId) {
    return subscription.price;
  }

  // If user's current subscription is the same as this subscription, return current subscription value
  if (userSubscription.planId._id === subscription._id) {
    return getCurrentSubscriptionValue(userSubscription);
  }

  // Calculate and return upgrade price
  return calculateUpgradePrice(userSubscription, subscription);
};

/**
 * Calculate the current value of user's subscription based on remaining time
 * @param {Object} currentSubscription - User's current subscription
 * @returns {number} - Current value of the subscription
 */
export const getCurrentSubscriptionValue = (currentSubscription) => {
  if (!currentSubscription || !currentSubscription.planId || currentSubscription.status !== 'active') {
    return 0;
  }

  if (currentSubscription.planId.price === 0) {
    return 0;
  }

  try {
    const currentDate = new Date();
    const endDate = new Date(currentSubscription.endDate);
    const startDate = new Date(currentSubscription.startDate);

    // If subscription has expired, return 0
    if (endDate <= currentDate) {
      return 0;
    }

    // Calculate time periods
    const totalDuration = endDate.getTime() - startDate.getTime();
    const remainingDuration = endDate.getTime() - currentDate.getTime();

    // Ensure valid durations
    if (remainingDuration <= 0 || totalDuration <= 0) {
      return 0;
    }

    // Calculate remaining percentage
    const remainingPercentage = remainingDuration / totalDuration;

    // Calculate current value using "règle de 3"
    const currentValue = currentSubscription.planId.price * remainingPercentage;

    return Math.max(0, currentValue);

  } catch (error) {
    console.error('Error calculating current subscription value:', error);
    return 0;
  }
};

/**
 * Check if a subscription is an upgrade from current subscription
 * @param {Object} currentSubscription - User's current subscription
 * @param {Object} targetSubscription - Subscription to check
 * @returns {boolean} - True if it's an upgrade
 */
export const isUpgrade = (currentSubscription, targetSubscription) => {
  if (!currentSubscription || !currentSubscription.planId || !targetSubscription) {
    return false;
  }

  // If target is free, it's not an upgrade
  if (targetSubscription.price === 0) {
    return false;
  }

  // If current is free and target is not, it's an upgrade
  if (currentSubscription.planId.price === 0 && targetSubscription.price > 0) {
    return true;
  }

  // If target price is higher, it's an upgrade
  return targetSubscription.price > currentSubscription.planId.price;
};

/**
 * Format price for display
 * @param {number} price - Price to format
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price) => {
  if (price === 0) {
    return 'Free';
  }
  return `$${price.toFixed(2)}`;
};

/**
 * Get savings amount when upgrading
 * @param {Object} currentSubscription - User's current subscription
 * @param {Object} targetSubscription - Target subscription
 * @returns {number} - Amount saved
 */
export const getSavingsAmount = (currentSubscription, targetSubscription) => {
  if (!targetSubscription || targetSubscription.price === 0) {
    return 0;
  }

  const originalPrice = targetSubscription.price;
  const adjustedPrice = calculateUpgradePrice(currentSubscription, targetSubscription);
  
  return Math.max(0, originalPrice - adjustedPrice);
};
