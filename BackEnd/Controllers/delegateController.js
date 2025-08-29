const User = require('../Models/User');
const Building = require('../Models/Building');
const crypto = require('crypto');
const { sendDelegateInvitationEmail, sendDelegateActivationNotificationEmail } = require('../Utils/Email');
const NotificationController = require('./notificationsController');

// Assign a delegate to a user
const assignDelegate = async (req, res) => {
  if (!req.user || (!req.user.id && !req.user._id)) {
    return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
  }
  const userId = req.user.id || req.user._id;
  const { delegateEmail, delegationType, sharedPercentage, delegateAmount } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Vérifier si l'email existe dans le système
    const delegate = await User.findOne({ email: delegateEmail });
    
    // Trouve les bâtiments où l'utilisateur est propriétaire ou copropriétaire
    const userBuildings = await Building.find({
      $or: [
        { user: userId },
        { coOwners: userId }
      ]
    });

    if (!delegate) {
      // Si le délégué n'existe pas, on permet quand même la délégation par email
      // Générer un token d'activation unique
      const activationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

      // Vérifier si l'email est déjà délégué
      const existingDelegate = user.delegates.find(d => d.email === delegateEmail);
      if (existingDelegate) {
        return res.status(400).json({ message: 'This email is already assigned as delegate' });
      }

      // Créer la délégation
      const newDelegate = {
        email: delegateEmail,
        type: delegationType,
        meetingDelegation: {
          isActive: false,
          activationToken,
          tokenExpiry
        },
        paymentDelegation: {
          isActive: false, // Now requires activation like meetings
          sharedPercentage: 0,
          delegateAmount: 0
        }
      };

      user.delegates.push(newDelegate);
      await user.save();

      // Envoyer l'email d'invitation
      try {
        await sendDelegateInvitationEmail({
          delegateEmail,
          delegatorName: `${user.firstName} ${user.lastName}`,
          delegationType,
          activationToken,
          buildings: userBuildings.map(b => b.name).join(', ')
        });
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
      }

      res.status(201).json({ 
        message: 'Delegate invitation sent successfully',
        delegate: newDelegate
      });
    } else {
      // Si le délégué existe, vérifier qu'il est dans le même bâtiment
      if (delegate.role !== 'SyndicateCoowner') {
        return res.status(400).json({ message: 'Only SyndicateCoowner can be assigned as delegate' });
      }

      // Vérifier s'ils partagent au moins un bâtiment
      const delegateBuildings = await Building.find({
        coOwners: delegate._id
      });

      const sharedBuildings = userBuildings.some(userBuilding => 
        delegateBuildings.some(delegateBuilding => 
          delegateBuilding._id.equals(userBuilding._id)
        )
      );

      if (!sharedBuildings) {
        return res.status(403).json({ message: 'User and delegate must belong to the same building' });
      }

      // Vérifier si le délégué est déjà assigné
      const existingDelegate = user.delegates.find(d => 
        (d.user && d.user.equals(delegate._id)) || d.email === delegateEmail
      );
      if (existingDelegate) {
        return res.status(400).json({ message: 'Delegate already assigned' });
      }

      // Générer un token d'activation pour les réunions
      const activationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

      // Assigner le délégué
      const newDelegate = {
        user: delegate._id,
        email: delegateEmail,
        type: delegationType,
        meetingDelegation: {
          isActive: false,
          activationToken,
          tokenExpiry
        },
        paymentDelegation: {
          isActive: false, // Now requires activation like meetings
          sharedPercentage: 0,
          delegateAmount: 0
        }
      };

      user.delegates.push(newDelegate);
      await user.save();

      // Envoyer l'email d'invitation
      try {
        await sendDelegateInvitationEmail({
          delegateEmail,
          delegatorName: `${user.firstName} ${user.lastName}`,
          delegateName: `${delegate.firstName} ${delegate.lastName}`,
          delegationType,
          activationToken,
          buildings: userBuildings.map(b => b.name).join(', ')
        });
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
      }

      // Créer une notification pour le délégué
      try {
        await NotificationController.createNotification({
          recipient: delegate._id,
          type: 'alert',
          title: 'Delegation Assignment',
          content: `${user.firstName} ${user.lastName} has assigned you as their delegate for ${delegationType}.`,
          relatedTo: user._id,
          onModel: 'User',
          senderName: `${user.firstName} ${user.lastName}`,
          senderAvatar: user.avatar
        });
      } catch (notifError) {
        console.error('Error creating delegation notification:', notifError);
      }

      res.status(201).json({ 
        message: 'Delegate assigned successfully',
        delegate: {
          ...newDelegate,
          user: delegate
        }
      });
    }
  } catch (error) {
    console.error('Error assigning delegate:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Activate delegation (when delegate clicks the activation link)
const activateDelegation = async (req, res) => {
  const { token } = req.params;

  try {
    // Trouver l'utilisateur avec ce token d'activation
    const user = await User.findOne({
      'delegates.meetingDelegation.activationToken': token,
      'delegates.meetingDelegation.tokenExpiry': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired activation token' });
    }

    // Trouver le délégué spécifique
    const delegateIndex = user.delegates.findIndex(d => 
      d.meetingDelegation.activationToken === token
    );

    if (delegateIndex === -1) {
      return res.status(400).json({ message: 'Delegate not found' });
    }

    // Activer la délégation (both meeting and payment)
    user.delegates[delegateIndex].meetingDelegation.isActive = true;
    user.delegates[delegateIndex].meetingDelegation.activatedAt = new Date();
    user.delegates[delegateIndex].meetingDelegation.activationToken = undefined;
    user.delegates[delegateIndex].meetingDelegation.tokenExpiry = undefined;
    
    // Activate payment delegation as well when accepting
    user.delegates[delegateIndex].paymentDelegation.isActive = true;

    await user.save();

    // Envoyer notification au propriétaire
    try {
      const delegateEmail = user.delegates[delegateIndex].email;
      await sendDelegateActivationNotificationEmail({
        ownerEmail: user.email,
        ownerName: `${user.firstName} ${user.lastName}`,
        delegateEmail: delegateEmail
      });

      // Créer une notification dans l'app
      await NotificationController.createNotification({
        recipient: user._id,
        type: 'alert',
        title: 'Delegation Activated',
        content: `Your delegate ${delegateEmail} has confirmed their participation and is now active.`,
        relatedTo: user.delegates[delegateIndex]._id,
        onModel: 'User'
      });
    } catch (emailError) {
      console.error('Error sending activation notification:', emailError);
    }

    res.status(200).json({ 
      message: 'Delegation activated successfully',
      delegate: user.delegates[delegateIndex]
    });
  } catch (error) {
    console.error('Error activating delegation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get delegate information for meeting invitations
const getDelegateForEvent = async (userId, eventId) => {
  try {
    const user = await User.findById(userId).populate('delegates.user');
    
    if (!user) return null;

    // Trouver un délégué actif pour les réunions
    const activeDelegate = user.delegates.find(d => 
      (d.type === 'meeting' || d.type === 'both') && 
      d.meetingDelegation.isActive
    );

    return activeDelegate || null;
  } catch (error) {
    console.error('Error getting delegate for event:', error);
    return null;
  }
};

// Update delegate payment information
const updateDelegatePayment = async (req, res) => {
  if (!req.user || (!req.user.id && !req.user._id)) {
    return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
  }
  
  const userId = req.user.id || req.user._id;
  const { delegateId, sharedPercentage, delegateAmount } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const delegateIndex = user.delegates.findIndex(d => 
      d._id.toString() === delegateId
    );

    if (delegateIndex === -1) {
      return res.status(404).json({ message: 'Delegate not found' });
    }

    // Mettre à jour les informations de paiement
    if (sharedPercentage !== undefined) {
      user.delegates[delegateIndex].paymentDelegation.sharedPercentage = sharedPercentage;
    }
    if (delegateAmount !== undefined) {
      user.delegates[delegateIndex].paymentDelegation.delegateAmount = delegateAmount;
    }

    await user.save();

    res.status(200).json({ 
      message: 'Delegate payment information updated successfully',
      delegate: user.delegates[delegateIndex]
    });
  } catch (error) {
    console.error('Error updating delegate payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
const getCoownersInBuilding = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find buildings where user is either owner or co-owner
    const buildings = await Building.find({
      $or: [
        { user: userId },
        { coOwners: userId }
      ]
    });

    if (buildings.length === 0) {
      return res.status(400).json({ message: 'User does not belong to any building' });
    }

    // Get all co-owners from these buildings (excluding current user and only SyndicateCoowners)
    const coowners = await User.find({
      _id: { $ne: userId },
      role: 'SyndicateCoowner',
      $or: [
        { _id: { $in: buildings.flatMap(b => b.coOwners) } },
        { _id: { $in: buildings.map(b => b.user) } }
      ]
    }).select('firstName lastName email role');

    res.status(200).json(coowners);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove a delegate from a user
const removeDelegate = async (req, res) => {
  const { delegateId } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove the delegate from the user's delegates list
    const originalLength = user.delegates.length;
    user.delegates = user.delegates.filter(d => !d._id.equals(delegateId));
    
    if (user.delegates.length === originalLength) {
      return res.status(404).json({ message: 'Delegate not found' });
    }

    await user.save();

    res.status(200).json({ message: 'Delegate removed successfully' });
  } catch (error) {
    console.error('Error removing delegate:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all delegates for a user
const getUserDelegates = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate('delegates.user', 'firstName lastName email role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format the delegates with additional information
    const formattedDelegates = user.delegates.map(delegate => ({
      _id: delegate._id,
      email: delegate.email,
      type: delegate.type,
      user: delegate.user,
      meetingDelegation: {
        isActive: delegate.meetingDelegation.isActive,
        activatedAt: delegate.meetingDelegation.activatedAt
      },
      paymentDelegation: {
        isActive: delegate.paymentDelegation.isActive,
        sharedPercentage: delegate.paymentDelegation.sharedPercentage,
        delegateAmount: delegate.paymentDelegation.delegateAmount
      },
      createdAt: delegate.createdAt
    }));

    res.status(200).json(formattedDelegates);
  } catch (error) {
    console.error('Error getting user delegates:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get delegations where current user is the delegate
const getDelegationsForUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Trouver tous les utilisateurs qui ont assigné cet utilisateur comme délégué
    const users = await User.find({
      'delegates.user': userId
    }).populate('delegates.user', 'firstName lastName email role');

    if (!users) {
      return res.status(200).json([]);
    }

    // Filtrer pour obtenir seulement les délégations concernant cet utilisateur
    const delegationsForUser = [];
    
    users.forEach(user => {
      user.delegates.forEach(delegate => {
        if (delegate.user && delegate.user._id.toString() === userId) {
          delegationsForUser.push({
            _id: delegate._id,
            delegator: {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            },
            email: delegate.email,
            type: delegate.type,
            meetingDelegation: {
              isActive: delegate.meetingDelegation.isActive,
              activatedAt: delegate.meetingDelegation.activatedAt,
              activationToken: delegate.meetingDelegation.activationToken,
              tokenExpiry: delegate.meetingDelegation.tokenExpiry
            },
            paymentDelegation: {
              isActive: delegate.paymentDelegation.isActive,
              sharedPercentage: delegate.paymentDelegation.sharedPercentage,
              delegateAmount: delegate.paymentDelegation.delegateAmount
            },
            createdAt: delegate.createdAt
          });
        }
      });
    });

    res.status(200).json(delegationsForUser);
  } catch (error) {
    console.error('Error getting delegations for user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Accept delegation (from the app interface, not email)
const acceptDelegation = async (req, res) => {
  const { delegationId, delegatorId } = req.body;
  const userId = req.user._id;

  try {
    // Trouver le propriétaire de la délégation
    const delegator = await User.findById(delegatorId);
    if (!delegator) {
      return res.status(404).json({ message: 'Delegator not found' });
    }

    // Trouver la délégation spécifique
    const delegateIndex = delegator.delegates.findIndex(d => 
      d._id.toString() === delegationId && 
      d.user && d.user.toString() === userId.toString()
    );

    if (delegateIndex === -1) {
      return res.status(404).json({ message: 'Delegation not found' });
    }

    // Vérifier si la délégation est déjà activée
    if (delegator.delegates[delegateIndex].meetingDelegation.isActive) {
      return res.status(400).json({ message: 'Delegation already activated' });
    }

    // Activer la délégation (both meeting and payment)
    delegator.delegates[delegateIndex].meetingDelegation.isActive = true;
    delegator.delegates[delegateIndex].meetingDelegation.activatedAt = new Date();
    delegator.delegates[delegateIndex].meetingDelegation.activationToken = undefined;
    delegator.delegates[delegateIndex].meetingDelegation.tokenExpiry = undefined;
    
    // Activate payment delegation as well when accepting
    delegator.delegates[delegateIndex].paymentDelegation.isActive = true;

    await delegator.save();

    // Envoyer notification au propriétaire
    try {
      const delegate = await User.findById(userId);
      await sendDelegateActivationNotificationEmail({
        ownerEmail: delegator.email,
        ownerName: `${delegator.firstName} ${delegator.lastName}`,
        delegateEmail: delegate.email
      });

      // Créer une notification dans l'app
      await NotificationController.createNotification({
        recipient: delegator._id,
        type: 'alert',
        title: 'Delegation Activated',
        content: `${delegate.firstName} ${delegate.lastName} has accepted your delegation request.`,
        relatedTo: delegator.delegates[delegateIndex]._id,
        onModel: 'User'
      });
    } catch (emailError) {
      console.error('Error sending activation notification:', emailError);
    }

    res.status(200).json({ 
      message: 'Delegation accepted successfully',
      delegate: delegator.delegates[delegateIndex]
    });
  } catch (error) {
    console.error('Error accepting delegation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Decline delegation
const declineDelegation = async (req, res) => {
  const { delegationId, delegatorId } = req.body;
  const userId = req.user._id;

  try {
    // Trouver le propriétaire de la délégation
    const delegator = await User.findById(delegatorId);
    if (!delegator) {
      return res.status(404).json({ message: 'Delegator not found' });
    }

    // Supprimer la délégation
    const originalLength = delegator.delegates.length;
    delegator.delegates = delegator.delegates.filter(d => 
      !(d._id.toString() === delegationId && d.user && d.user.toString() === userId.toString())
    );

    if (delegator.delegates.length === originalLength) {
      return res.status(404).json({ message: 'Delegation not found' });
    }

    await delegator.save();

    // Créer une notification pour le propriétaire
    try {
      const delegate = await User.findById(userId);
      await NotificationController.createNotification({
        recipient: delegator._id,
        type: 'alert',
        title: 'Delegation Declined',
        content: `${delegate.firstName} ${delegate.lastName} has declined your delegation request.`,
        relatedTo: delegator._id,
        onModel: 'User'
      });
    } catch (notifError) {
      console.error('Error creating decline notification:', notifError);
    }

    res.status(200).json({ message: 'Delegation declined successfully' });
  } catch (error) {
    console.error('Error declining delegation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  assignDelegate,
  removeDelegate,
  getUserDelegates,
  getCoownersInBuilding,
  activateDelegation,
  getDelegateForEvent,
  updateDelegatePayment,
  getDelegationsForUser,
  acceptDelegation,
  declineDelegation,
};