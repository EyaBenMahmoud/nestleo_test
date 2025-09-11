/**
 * Subscription Limit Validator
 * Validates if an action is allowed based on the user's subscription limits
 */

// Import the translation utilities
import { translateFeatureName } from '../../utils/subscriptionTranslations';

export const isInTrialPeriod = (user) => {
  if (!user?.subscription) return false;
  
  // Check if explicitly marked as trial
  if (user.subscription.status === 'trial') return true;
  
  // Check if in the trial period (status is active but planId is null)
  if (user.subscription.status === 'active' && !user.subscription.planId) {
    const startDate = new Date(user.subscription.startDate);
    const endDate = new Date(user.subscription.endDate);
    const currentDate = new Date();
    
    return currentDate >= startDate && currentDate <= endDate;
  }
  
  return false;
};

export const hasTaskManagementAccess = (user) => {
  // If user is in trial period, allow access immediately
  if (isInTrialPeriod(user)) {
    return true;
  }

  // If no user or no subscription, default to false
  if (!user?.subscription?.planId?.features) {
    return false;
  }

  // Find the Task Management feature
  const feature = user.subscription.planId.features.find(f => 
    f.name.toLowerCase().includes('worker pack')
  );
  
  // If feature not found or not active, return false
  if (!feature || !feature.isActive) {
    return false;
  }
  
  return true;
};

// Extract numeric value from feature name (e.g., "Nombre d'immeubles: 5" -> 5)
export const extractFeatureValue = (features, featureNamePattern) => {
  // Use a more flexible match that doesn't require an exact substring match
  const feature = features?.find(f =>
    f.name.toLowerCase().startsWith(featureNamePattern.toLowerCase())
  );

  // Check if feature exists
  if (!feature) return null;

  // Add check for feature activation status
  if (feature.isActive === false) return 0; // Return 0 for inactive features

  // Check if feature has metadata with value stored
  if (feature.metadata?.value !== undefined) {
    return feature.metadata.value;
  }

  // Otherwise try to extract from the name
  const valueMatch = feature.name.match(/:\s*(\d+|Illimité)/i);
  if (!valueMatch) return null;

  if (valueMatch[1].toLowerCase() === 'illimité') {
    return -1; // -1 represents unlimited
  }

  return parseInt(valueMatch[1]);
};

// Check if user can add more buildings based on their subscription
export const canAddBuilding = (user) => {
  // If user is in trial period, allow unlimited buildings
  if (isInTrialPeriod(user)) {
    return true;
  }

  // If no user or no subscription, default to false
  if (!user?.subscription?.planId?.features) {
    return false;
  }

  const maxBuildings = extractFeatureValue(user.subscription.planId.features, "Nombre d'immeubles");

  // If unlimited (-1) or no limit found, allow
  if (maxBuildings === -1 || maxBuildings === null) {
    return true;
  }

  // Get current building count from user.buildings array
  const currentBuildings = user.buildings?.length || 0;

  return currentBuildings < maxBuildings;
};

// Get the maximum number of buildings allowed by the subscription
export const getBuildingLimit = (user) => {
  // If user is in trial period, show unlimited
  if (isInTrialPeriod(user)) {
    return "Illimité";
  }

  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  const maxBuildings = extractFeatureValue(user.subscription.planId.features, "Nombre d'immeubles");
  return maxBuildings === -1 ? "Illimité" : maxBuildings;
};

// Check if user can add more apartments to a specific building
export const canAddApartment = (user, buildingId) => {
  // If user is in trial period, allow unlimited apartments
  if (isInTrialPeriod(user)) {
    return true;
  }

  // If no user or no subscription, default to false
  if (!user?.subscription?.planId?.features) {
    return false;
  }

  const maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");

  // If unlimited (-1) or no limit found, allow
  if (maxApartments === -1 || maxApartments === null) {
    return true;
  }

  // Find the building in user's buildings
  const building = user.buildings?.find(b => b._id === buildingId);
  if (!building) return true; // If building not found, allow (will be handled elsewhere)

  // Count apartments in all blocs of the building
  const currentApartments = building.blocs?.reduce(
    (total, bloc) => total + (bloc.apartments?.length || 0), 0
  ) || 0;

  return currentApartments < maxApartments;
};

// Get the maximum document size allowed (in MB)
export const getMaxDocumentSize = (user) => {
  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  const maxSize = extractFeatureValue(user.subscription.planId.features, "Partage de documents");
  return maxSize === -1 ? Infinity : maxSize;
};

// Add a helper to get total current document size
export const getTotalDocumentStorage = (user) => {
  // Sum up the size of all documents across all buildings
  let totalSizeMB = 0;

  user?.buildings?.forEach(building => {
    building?.documents?.forEach(doc => {
      // Convert bytes to MB
      totalSizeMB += (doc.fileSize / (1024 * 1024)) || 0;
    });
  });

  return totalSizeMB;
};

// Enhance canUploadDocument to consider existing document total
export const canUploadDocument = (user, fileSizeMB) => {
  if (!user?.subscription?.planId?.features) {
    return false;
  }

  const maxSize = getMaxDocumentSize(user);

  // If unlimited storage, allow upload
  if (maxSize === Infinity || maxSize === -1) {
    return true;
  }

  // Get current total document storage
  const currentStorageMB = getTotalDocumentStorage(user);

  // Check if new file would exceed the limit
  return (currentStorageMB + fileSizeMB) <= maxSize;
};

// Add function to get remaining storage
export const getRemainingDocumentStorage = (user) => {
  const maxSize = getMaxDocumentSize(user);

  if (maxSize === Infinity || maxSize === -1) {
    return Infinity;
  }

  const currentStorageMB = getTotalDocumentStorage(user);
  return Math.max(0, maxSize - currentStorageMB);
};


// Check if user can create more invoices based on their subscription
export const canCreateInvoice = (user) => {
  // If no user or no subscription, default to false
  if (!user?.subscription?.planId?.features) {
    return false;
  }

  // Changed from "Factures mensuelles" to "Factures" to match your actual feature name
  const maxInvoices = extractFeatureValue(user.subscription.planId.features, "Factures");

  // If feature is inactive, disallow creation
  if (maxInvoices === 0) return false;

  // If unlimited (-1) or no limit found, allow
  if (maxInvoices === -1 || maxInvoices === null) {
    return true;
  }

  // Get current month's invoice count
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Assuming invoices are stored in user.invoices with a date field
  const currentMonthInvoices = user.invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.date);
    return invoiceDate.getMonth() === currentMonth &&
      invoiceDate.getFullYear() === currentYear;
  })?.length || 0;

  return currentMonthInvoices < maxInvoices;
};

// Get the maximum number of invoices allowed per month by the subscription
export const getInvoiceLimit = (user) => {
  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  const maxInvoices = extractFeatureValue(user.subscription.planId.features, "Factures");

  // Check if feature is inactive
  if (maxInvoices === 0) return "0 (Inactive)";

  return maxInvoices === -1 ? "Illimité" : maxInvoices;
};

// Get the current month's invoice count
export const getCurrentMonthInvoiceCount = (user) => {
  if (!user?.invoices) {
    return 0;
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return user.invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.date);
    return invoiceDate.getMonth() === currentMonth &&
      invoiceDate.getFullYear() === currentYear;
  })?.length || 0;
};

// Check if user is approaching the invoice limit (80% or more)
export const isApproachingInvoiceLimit = (user) => {
  if (!user?.subscription?.planId?.features || !user?.invoices) {
    return false;
  }

  const maxInvoices = extractFeatureValue(user.subscription.planId.features, "Factures mensuelles");

  // If unlimited, user is never approaching the limit
  if (maxInvoices === -1 || maxInvoices === null) {
    return false;
  }

  const currentCount = getCurrentMonthInvoiceCount(user);

  // Return true if using 80% or more of limit
  return currentCount >= (maxInvoices * 0.8);
};

// Similarly update function for scheduled invoices
export const canCreateScheduledInvoice = (user) => {
  if (!user?.subscription?.planId?.features) {
    return false;
  }

  // Changed to match the actual feature name in your subscription
  const maxScheduled = extractFeatureValue(user.subscription.planId.features, "Factures récurrentes");

  // If feature is inactive, disallow creation
  if (maxScheduled === 0) return false;

  // If unlimited or no limit found, allow
  if (maxScheduled === -1 || maxScheduled === null) {
    return true;
  }

  // Get current scheduled invoice count
  const currentScheduledCount = user.scheduledInvoices?.length || 0;

  return currentScheduledCount < maxScheduled;
};

export const getScheduledInvoiceLimit = (user) => {
  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  const maxInvoices = extractFeatureValue(user.subscription.planId.features, "Factures récurrentes");

  // Check if feature is inactive
  if (maxInvoices === 0) return "0 (Inactive)";

  return maxInvoices === -1 ? "Illimité" : maxInvoices;
};



/**
 * Check if gamification system is available for the user's subscription
 */
export const hasGamificationAccess = (user) => {
  // If no user or no subscription, default to false
  if (!user?.subscription?.planId?.features) {
    console.log("No features array found in planId.");

    return false;
  }

  // Find the gamification feature in the subscription features
  const gamificationFeature = user.subscription.planId.features.find(f =>
    f.name.toLowerCase().includes("système de gamification")
  );

  // If feature doesn't exist or is inactive, return false
  if (!gamificationFeature || gamificationFeature.isActive === false) {
    console.log("Gamification feature not found or inactive.");

    return false;
  }

  return true;
};


export const isGamificationEnabledForBuilding = (building) => {
  return building?.gamificationEnabled === true;
};


export const isGamificationAvailable = (user) => {
  if (user?.role === "SyndicateAdmin") {
    return hasGamificationAccess(user);
  }
  return false;
};


// Updated function with detailed logging
export const isGamificationEnabledForBuildingPerAdminSubcription = (building) => {
  console.log("Building received:", building);
  
  // Check if building exists
  if (!building) {
    console.log("No building provided");
    return false;
  }
  
  // Check if building has user property
  const buildingAdmin = building?.user;
  console.log("Building Admin:", buildingAdmin);
  
  if (!buildingAdmin) {
    console.log("No building admin found");
    return false;
  }
  
  // Log subscription details
  console.log("Admin subscription:", buildingAdmin.subscription);
  
  // Check if admin has an active subscription
  if (!buildingAdmin.subscription || buildingAdmin.subscription.status !== 'active') {
    console.log("Admin subscription not active");
    return false;
  }
  
  // Log plan ID
  console.log("Subscription plan ID:", buildingAdmin.subscription.planId);
  
  // Now check if hasGamificationAccess can find the features
  const result = hasGamificationAccess(buildingAdmin);
  console.log("hasGamificationAccess result:", result);
  
  return result;
};


/**
 * Video Conference Pack Functions
 * Check if user can create/join video conferences based on their subscription
 */

// Check if user has access to video conference feature
export const hasVideoConferenceAccess = (user) => {
  console.log('Debug - hasVideoConferenceAccess called with user:', user);
  
  // If user is in trial period, allow access immediately
  if (isInTrialPeriod(user)) {
    console.log('Debug - User is in trial period, allowing access');
    return true;
  }

  // If no user or no subscription, default to false
  if (!user?.subscription?.planId?.features) {
    console.log('Debug - No subscription or features found:', {
      hasUser: !!user,
      hasSubscription: !!user?.subscription,
      hasPlanId: !!user?.subscription?.planId,
      hasFeatures: !!user?.subscription?.planId?.features
    });
    return false;
  }

  console.log('Debug - Available features:', user.subscription.planId.features.map(f => ({ name: f.name, isActive: f.isActive })));

  // Find the Video Conference feature - check for multiple possible naming patterns
  const feature = user.subscription.planId.features.find(f => {
    const featureName = f.name.toLowerCase();
    return featureName.startsWith('videoconferencepack') || 
           featureName.startsWith('conférence vidéo') ||
           featureName.includes('video conference') ||
           featureName.includes('vidéo');
  });
  
  console.log('Debug - Found video conference feature:', feature);
  
  // If feature not found or not active, return false
  if (!feature || !feature.isActive) {
    console.log('Debug - Video conference feature not found or not active:', {
      featureFound: !!feature,
      isActive: feature?.isActive
    });
    return false;
  }
  
  console.log('Debug - Video conference access granted');
  return true;
};

// Get the maximum video conference duration allowed (in minutes)
export const getMaxVideoConferenceDuration = (user) => {
  // If user is in trial period, allow unlimited duration
  if (isInTrialPeriod(user)) {
    return Infinity;
  }

  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  // Try to find the video conference feature with different naming patterns
  let maxDuration = extractFeatureValue(user.subscription.planId.features, "videoConferencePack");
  
  // If not found with the new pattern, try the old pattern
  if (maxDuration === null || maxDuration === undefined) {
    maxDuration = extractFeatureValue(user.subscription.planId.features, "Conférence vidéo");
  }
  
  return maxDuration === -1 ? Infinity : maxDuration;
};

// Check if user can start a video conference with the specified duration
export const canStartVideoConference = (user, durationMinutes) => {
  // If user is in trial period, allow unlimited duration
  if (isInTrialPeriod(user)) {
    return true;
  }

  // If no user or no subscription, default to false
  if (!user?.subscription?.planId?.features) {
    return false;
  }

  // Check if user has access to video conference feature
  if (!hasVideoConferenceAccess(user)) {
    return false;
  }

  const maxDuration = getMaxVideoConferenceDuration(user);

  // If unlimited duration, allow
  if (maxDuration === Infinity || maxDuration === -1) {
    return true;
  }

  // Check if requested duration is within limit
  return durationMinutes <= maxDuration;
};

// Get remaining video conference time for current month
export const getRemainingVideoConferenceTime = (user) => {
  // If user is in trial period, allow unlimited time
  if (isInTrialPeriod(user)) {
    return Infinity;
  }

  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  const maxDuration = getMaxVideoConferenceDuration(user);

  // If unlimited, return infinity
  if (maxDuration === Infinity || maxDuration === -1) {
    return Infinity;
  }

  // Get current month's video conference usage
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate used time from user's video conference history
  const usedTime = user.videoConferences?.filter(conference => {
    const conferenceDate = new Date(conference.startDate);
    return conferenceDate.getMonth() === currentMonth &&
      conferenceDate.getFullYear() === currentYear;
  })?.reduce((total, conference) => {
    return total + (conference.duration || 0);
  }, 0) || 0;

  return Math.max(0, maxDuration - usedTime);
};

// Get current month's video conference usage
export const getCurrentMonthVideoConferenceUsage = (user) => {
  if (!user?.videoConferences) {
    return 0;
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return user.videoConferences?.filter(conference => {
    const conferenceDate = new Date(conference.startDate);
    return conferenceDate.getMonth() === currentMonth &&
      conferenceDate.getFullYear() === currentYear;
  })?.reduce((total, conference) => {
    return total + (conference.duration || 0);
  }, 0) || 0;
};

// Check if user is approaching the video conference limit (80% or more)
export const isApproachingVideoConferenceLimit = (user) => {
  // If user is in trial period, never approaching limit (unlimited access)
  if (isInTrialPeriod(user)) {
    return false;
  }

  if (!user?.subscription?.planId?.features) {
    return false;
  }

  const maxDuration = getMaxVideoConferenceDuration(user);

  // If unlimited, user is never approaching the limit
  if (maxDuration === Infinity || maxDuration === -1) {
    return false;
  }

  const currentUsage = getCurrentMonthVideoConferenceUsage(user);

  // Return true if using 80% or more of limit
  return currentUsage >= (maxDuration * 0.8);
};

// Get video conference limit display text
export const getVideoConferenceLimit = (user) => {
  // If user is in trial period, show unlimited
  if (isInTrialPeriod(user)) {
    return "Illimité";
  }

  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  const maxDuration = extractFeatureValue(user.subscription.planId.features, "Conférence vidéo");

  // Check if feature is inactive
  if (maxDuration === 0) return "0 (Inactive)";

  return maxDuration === -1 ? "Illimité" : `${maxDuration} minutes`;
};

// Validate if a meeting can continue based on duration limit
export const canContinueVideoConference = (user, currentDurationMinutes, additionalMinutes = 0) => {
  if (!hasVideoConferenceAccess(user)) {
    return false;
  }

  const maxDuration = getMaxVideoConferenceDuration(user);

  // If unlimited duration, allow
  if (maxDuration === Infinity || maxDuration === -1) {
    return true;
  }

  const totalDuration = currentDurationMinutes + additionalMinutes;
  const remainingTime = getRemainingVideoConferenceTime(user);

  return totalDuration <= remainingTime;
};

// Function to record video conference usage
export const recordVideoConferenceUsage = async (user, eventId, durationMinutes) => {
  try {
    // This would typically make an API call to record the usage
    const conferenceRecord = {
      eventId: eventId,
      userId: user._id,
      startDate: new Date(),
      duration: durationMinutes,
      buildingId: user.currentBuilding || user.buildings?.[0]?._id
    };

    // In a real implementation, you would make an API call here
    // await api.post('/api/video-conferences/record-usage', conferenceRecord);
    
    console.log('Video conference usage recorded:', conferenceRecord);
    return conferenceRecord;
  } catch (error) {
    console.error('Failed to record video conference usage:', error);
    throw error;
  }
};

// Check if user has used any video conference time this month
export const hasVideoConferenceUsageThisMonth = (user) => {
  if (!user?.videoConferences) {
    return false;
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return user.videoConferences?.some(conference => {
    const conferenceDate = new Date(conference.startDate);
    return conferenceDate.getMonth() === currentMonth &&
      conferenceDate.getFullYear() === currentYear;
  });
};

// Get the maximum number of apartments allowed per building by the subscription
export const getApartmentLimit = (user) => {
  // If user is in trial period, show unlimited
  if (isInTrialPeriod(user)) {
    return "Illimité";
  }

  if (!user?.subscription?.planId?.features) {
    return 0;
  }

  const maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");
  return maxApartments === -1 ? "Illimité" : maxApartments;
};

// Check if user is approaching the apartment limit for a specific building (80% or more)
export const isApproachingApartmentLimit = (user, building) => {
  // If user is in trial period, never approaching limit
  if (isInTrialPeriod(user)) {
    return false;
  }

  if (!user?.subscription?.planId?.features || !building) {
    return false;
  }

  const maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");

  // If unlimited, user is never approaching the limit
  if (maxApartments === -1 || maxApartments === null) {
    return false;
  }

  const currentApartments = building.blocs?.reduce(
    (total, bloc) => total + (bloc.apartments?.length || 0), 0
  ) || 0;

  // Return true if using 80% or more of limit
  return currentApartments >= (maxApartments * 0.8);
};
