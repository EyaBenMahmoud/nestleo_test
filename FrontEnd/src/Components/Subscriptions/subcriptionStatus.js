import { isInTrialPeriod } from "./SubcriptionValidator";

/**
 * Checks if a building admin has an active subscription
 * @param {Object} building - Building object with populated user field
 * @returns {boolean} - Whether the admin has an active subscription
 */
export const isBuildingAdminSubscriptionActive = (building) => {
  // Debug logging
  console.log("Checking subscription for building:", building?.name);
  console.log("Building user data:", building?.user);
  
  if (!building?.user) {
    console.log("No building user found");
    return false;
  }
  
  const admin = building.user;
  
  // Check if admin is in trial period
  const inTrialPeriod = isInTrialPeriod(admin);
  console.log("Admin in trial period:", inTrialPeriod);
  
  if (inTrialPeriod) {
    return true;
  }
  
  // Check if admin has active subscription
  const hasActiveSubscription = 
    admin.subscription && 
    admin.subscription.status === 'active' && 
    admin.subscription.planId;
  
  console.log("Admin subscription status:", admin?.subscription?.status);
  console.log("Admin has active subscription:", hasActiveSubscription);
  
  return hasActiveSubscription;
};

/**
 * Checks if a co-owner has access to at least one building with active admin subscription
 * @param {Object} coOwner - User object with role SyndicateCoowner
 * @param {Array} buildings - Array of buildings with populated user field
 * @returns {boolean} - Whether the co-owner has access to at least one active building
 */
export const hasAccessToActiveBuildingSubscription = (coOwner, buildings) => {
  console.log("Checking building access for co-owner:", coOwner?.firstName, coOwner?.lastName);
  console.log("Buildings available:", buildings?.length || 0);
  
  if (coOwner.role !== "SyndicateCoowner" || !buildings?.length) {
    console.log("Not a co-owner or no buildings");
    return false;
  }
  
  // Important: Check if buildings have user property populated
  const hasPopulatedUsers = buildings.some(building => building.user);
  console.log("Buildings have populated users:", hasPopulatedUsers);
  
  if (!hasPopulatedUsers) {
    console.log("WARNING: Building users not populated, access check will fail!");
    // If users are not populated, we need to assume access is granted
    // to avoid incorrectly blocking access
    return true;
  }
  
  // Filter for coowner's active building associations
  // CRITICAL FIX: Check if buildingAssociations is populated correctly
  if (!Array.isArray(coOwner.buildingAssociations)) {
    console.log("buildingAssociations is not an array:", coOwner.buildingAssociations);
    // If associations are not available, assume access is granted
    return true;
  }
  
  const activeBuildingAssociations = coOwner.buildingAssociations.filter(
    assoc => assoc && assoc.isActive === true
  );
  
  console.log("Active building associations:", activeBuildingAssociations.length);

  // Check if any associated building has active admin subscription
  const hasActiveAccess = buildings.some(building => {
    // Check if this building is in the coowner's active associations
    const isActiveForCoowner = activeBuildingAssociations.some(
      assoc => assoc.building && (
        // Handle both populated and unpopulated building references
        (assoc.building._id && assoc.building._id.toString() === building._id.toString()) || 
        (typeof assoc.building === 'string' && assoc.building === building._id.toString())
      )
    );
    
    console.log(`Building ${building.name} active for coowner: ${isActiveForCoowner}`);
    
    // If active for coowner, check admin's subscription
    if (isActiveForCoowner) {
      const adminSubActive = isBuildingAdminSubscriptionActive(building);
      console.log(`Building ${building.name} admin subscription active: ${adminSubActive}`);
      return adminSubActive;
    }
    
    return false;
  });
  
  console.log("Co-owner has access to active buildings:", hasActiveAccess);
  return hasActiveAccess;
};