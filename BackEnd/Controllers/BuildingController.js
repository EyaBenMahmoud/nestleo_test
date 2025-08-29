const Building = require('../Models/Building');
const User = require('../Models/User');
const Bloc = require('../Models/Bloc');
const Apartment = require('../Models/Appartement');
const { default: mongoose } = require('mongoose');
const { socketManager } = require('../Socket/socketManager');
const NotificationController = require('./notificationsController');
const BuildingCoownerAssociation = require('../Models/building-coowner');

// Create a new building
exports.createBuilding = async (req, res) => {
    try {
        const {
            name,
            matricule,
            address_street,
            address_number,
            address_city,
            address_country,
            gps_coordinates,
            blocs = [], // Default to empty array if not provided
        } = req.body;

        // Validate required fields
        if (!name || !matricule || !address_street || !address_number || !address_city || !address_country) {
            return res.status(400).json({
                message: 'Missing required fields: name, matricule, address_street, address_number, address_city, address_country'
            });
        }

        const user = req.user._id;

        // Create the building
        const building = new Building({
            name,
            matricule,
            address_street,
            address_number,
            address_city,
            address_country,
            gps_coordinates,
            user,
            blocs: [] // Initialize empty array
        });

        // Save the building first to get its ID
        await building.save();

        // Process blocs and apartments if provided
        if (blocs && blocs.length > 0) {
            for (const blocData of blocs) {
                if (!blocData.name) {
                    console.warn('Skipping bloc with missing name');
                    continue;
                }

                const bloc = new Bloc({
                    name: blocData.name,
                    building: building._id,
                    apartments: []
                });

                await bloc.save();

                // Process apartments if provided
                if (blocData.apartments && blocData.apartments.length > 0) {
                    for (const apartmentData of blocData.apartments) {
                        if (!apartmentData.number || !apartmentData.floor) {
                            console.warn('Skipping apartment with missing number or floor');
                            continue;
                        }

                        // Create apartment with bedrooms field
                        const apartment = new Apartment({
                            number: apartmentData.number,
                            floor: apartmentData.floor,
                            bedrooms: apartmentData.bedrooms || 1, // Add bedrooms with default value
                            bloc: bloc._id,
                            building: building._id
                        });

                        console.log("Creating apartment with data:", {
                            number: apartmentData.number,
                            floor: apartmentData.floor,
                            bedrooms: apartmentData.bedrooms || 1,
                            bloc: bloc._id.toString(),
                            building: building._id.toString()
                        });

                        await apartment.save();
                        bloc.apartments.push(apartment._id);
                    }
                    await bloc.save();
                }

                building.blocs.push(bloc._id);
            }
            await building.save();
        }

        // Populate the response with the full building data
        const populatedBuilding = await Building.findById(building._id)
            .populate({
                path: 'blocs',
                populate: {
                    path: 'apartments',
                    model: 'Apartment'
                }
            });

        res.status(201).json({
            message: 'Building created successfully',
            building: populatedBuilding
        });

    } catch (error) {
        console.error('Error in createBuilding:', error);
        res.status(500).json({
            message: 'Error creating building',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
// Fetch all buildings for the logged-in syndicate admin
exports.getBuildings = async (req, res) => {
    try {
        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Fetch buildings where user is owner OR co-owner
        const buildings = await Building.find({
            $or: [
                { user: req.user._id },
                { coOwners: req.user._id }
            ]
        })
            .populate({
                path: 'blocs',
                populate: {
                    path: 'apartments',
                    model: 'Apartment'
                }
            })
            .populate({
                path: 'user',
                select: 'firstName lastName email subscription',
                populate: {
                    path: 'subscription.planId',
                    model: 'Subscription'
                }
            })
            .populate('coOwners', 'name email');

        res.status(200).json({ buildings });
    } catch (error) {
        console.error('Error in getBuildings:', error);
        res.status(500).json({
            message: 'Error fetching buildings',
            error: error.message
        });
    }
};
// Approuver/Rejeter une demande d'accès à un immeuble
exports.handleBuildingAccessRequest = async (req, res) => {
    try {
        const { associationId } = req.params;
        const { approved } = req.body;
        const adminId = req.user._id;

        // Trouver l'association
        const association = await BuildingCoownerAssociation.findById(associationId)
            .populate('building')
            .populate('coOwner');

        if (!association) {
            return res.status(404).json({ message: 'Association not found' });
        }

        // Vérifier que l'utilisateur est bien l'administrateur du bâtiment
        if (association.building.user.toString() !== adminId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to manage this building' });
        }

        if (approved) {
            // Approuver la demande
            association.isActive = true;
            association.activatedBy = adminId;
            association.activatedAt = new Date();
            association.lastStatusChange = new Date();
            await association.save();

            // Créer une notification pour informer le copropriétaire
            try {
                const notificationData = {
                    recipient: association.coOwner._id,
                    type: 'alert',
                    title: 'Accès approuvé',
                    content: `Votre accès à l'immeuble ${association.building.name} a été approuvé. Vous pouvez maintenant accéder à toutes les fonctionnalités.`,
                    relatedTo: association.building._id,
                    onModel: 'Building'
                };

                const notification = await NotificationController.createNotification(notificationData);

                // Envoi en temps réel si le copropriétaire est en ligne
                const coOwnerSocketId = socketManager.onlineUsers.get(association.coOwner._id.toString());
                if (coOwnerSocketId && socketManager.io) {
                    console.log('Sending real-time notification to co-owner:', association.coOwner._id);
                    socketManager.io.to(coOwnerSocketId).emit('notification', {
                        ...notification.toObject(),
                        createdAt: new Date()
                    });
                } else {
                    console.log('Co-owner not online or socket not available:', association.coOwner._id);
                }
            } catch (notifError) {
                console.error('Error sending notification:', notifError);
            }

            return res.status(200).json({
                message: 'Access request approved successfully',
                association
            });
        } else {
            // Rejeter la demande - on supprime l'association
            // Retirer l'association des buildingAssociations de l'utilisateur
            await User.findByIdAndUpdate(
                association.coOwner._id,
                { $pull: { buildingAssociations: associationId } }
            );

            // Retirer l'utilisateur des coOwners du bâtiment
            await Building.findByIdAndUpdate(
                association.building._id,
                { $pull: { coOwners: association.coOwner._id } }
            );

            // Créer une notification pour informer le copropriétaire du rejet AVANT de supprimer l'association
            try {
                const notificationData = {
                    recipient: association.coOwner._id,
                    type: 'danger',
                    title: 'Accès refusé',
                    content: `Votre demande d'accès à l'immeuble ${association.building.name} a été refusée.`,
                    relatedTo: association.building._id,
                    onModel: 'Building'
                };

                const notification = await NotificationController.createNotification(notificationData);

                // Envoi en temps réel si le copropriétaire est en ligne
                const coOwnerSocketId = socketManager.onlineUsers.get(association.coOwner._id.toString());
                if (coOwnerSocketId && socketManager.io) {
                    console.log('Sending rejection notification to co-owner:', association.coOwner._id);
                    socketManager.io.to(coOwnerSocketId).emit('notification', {
                        ...notification.toObject(),
                        createdAt: new Date()
                    });
                } else {
                    console.log('Co-owner not online or socket not available:', association.coOwner._id);
                }
            } catch (notifError) {
                console.error('Error sending rejection notification:', notifError);
            }

            // AFTER sending notification, delete the association
            await BuildingCoownerAssociation.findByIdAndDelete(associationId);

            return res.status(200).json({
                message: 'Access request rejected successfully'
            });
        }
    } catch (error) {
        console.error('Error handling building access request:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// Désactiver l'accès d'un copropriétaire à un immeuble spécifique
exports.toggleCoOwnerBuildingAccess = async (req, res) => {
    try {
        const { associationId } = req.params;
        const adminId = req.user._id;

        console.log(`Toggling access for association ${associationId} by admin ${adminId}`);

        // Trouver l'association
        const association = await BuildingCoownerAssociation.findById(associationId)
            .populate('building')
            .populate('coOwner');

        if (!association) {
            console.log('Association not found:', associationId);
            return res.status(404).json({ message: 'Association not found' });
        }

        // Log debug info
        console.log('Found association:', {
            id: association._id,
            building: association.building.name,
            coOwner: `${association.coOwner.firstName} ${association.coOwner.lastName}`,
            isActive: association.isActive
        });

        // Vérifier que l'utilisateur est bien l'administrateur du bâtiment
        if (association.building.user.toString() !== adminId.toString()) {
            console.log(`Unauthorized: Admin ${adminId} doesn't match building admin ${association.building.user}`);
            return res.status(403).json({ message: 'You are not authorized to manage this building' });
        }

        // Inverser le statut
        const previousStatus = association.isActive;
        association.isActive = !previousStatus;
        association.lastStatusChange = new Date();

        console.log(`Changing status from ${previousStatus} to ${association.isActive}`);

        // Save the association
        await association.save();
        console.log('Association updated successfully');

        // Créer une notification pour informer le copropriétaire
        const notificationTitle = association.isActive ? 'Accès réactivé' : 'Accès désactivé';
        const notificationContent = association.isActive
            ? `Votre accès à l'immeuble ${association.building.name} a été réactivé.`
            : `Votre accès à l'immeuble ${association.building.name} a été temporairement désactivé. Contactez le syndic pour plus d'informations.`;

        try {
            console.log('Creating notification for co-owner', association.coOwner._id);

            const notificationData = {
                recipient: association.coOwner._id,
                type: "alert",
                title: notificationTitle,
                content: notificationContent,
                relatedTo: association.building._id,
                onModel: 'Building'
            };

            const notification = await NotificationController.createNotification(notificationData);
            console.log('Notification created with ID:', notification._id);

            // Verify socketManager initialization
            if (!socketManager) {
                console.warn('Socket manager is not initialized');
            } else {
                console.log('Socket manager exists, checking for online users');
                console.log('Online users:', socketManager.onlineUsers ? [...socketManager.onlineUsers.entries()] : 'None');
            }

            // Envoi en temps réel si le copropriétaire est en ligne
            if (socketManager && socketManager.onlineUsers) {
                const coOwnerSocketId = socketManager.onlineUsers.get(association.coOwner._id.toString());
                console.log('Co-owner socket ID:', coOwnerSocketId);

                if (coOwnerSocketId && socketManager.io) {
                    console.log(`Sending real-time notification to socket ${coOwnerSocketId}`);

                    // Send notification with full notification object
                    socketManager.io.to(coOwnerSocketId).emit('notification', {
                        ...notification.toObject(), // Use the created notification object
                        createdAt: new Date()
                    });

                    console.log('Notification sent successfully');
                } else {
                    console.log('Co-owner not online or socketManager.io not available - notification saved to DB only');
                }
            } else {
                console.warn('socketManager or onlineUsers map not available');
            }
        } catch (notifError) {
            console.error('Error creating/sending notification:', notifError);
        }

        return res.status(200).json({
            success: true,
            message: `Co-owner access ${association.isActive ? 'activated' : 'deactivated'} successfully`,
            association
        });
    } catch (error) {
        console.error('Error toggling co-owner building access:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};



//coowner join a building using matricule 
exports.joinBuilding = async (req, res) => {
    try {
        const { matricule } = req.body;
        const userId = req.user._id;

        // Step 1: Find the building using the matricule
        const building = await Building.findOne({ matricule });

        if (!building) {
            return res.status(404).json({ message: 'Building not found with this matricule' });
        }

        // Step 2: Check if the association already exists
        const existingAssociation = await BuildingCoownerAssociation.findOne({
            building: building._id,
            coOwner: userId
        });

        if (existingAssociation) {
            return res.status(400).json({
                message: 'You have already joined this building',
                isActive: existingAssociation.isActive
            });
        }

        // Step 3: Create a new association (INACTIVE by default)
        const newAssociation = await BuildingCoownerAssociation.create({
            building: building._id,
            coOwner: userId,
            isActive: false, // Important: default to inactive
            joinedAt: new Date()
        });

        // Step 4: Update User's buildingAssociations
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { buildingAssociations: newAssociation._id } }
        );

        // Step 5: Update Building's coOwners if not already present
        if (!building.coOwners.includes(userId)) {
            building.coOwners.push(userId);
            await building.save();
        }

        // Step 6: Create notification for building admin
        try {
            const buildingAdmin = await User.findById(building.user);
            const coOwner = req.user;

            // Créer une notification pour informer le syndic
            const notificationData = {
                recipient: building.user,
                type: 'alert',
                title: 'Nouvelle demande d\'accès immeuble',
                content: `${coOwner.firstName} ${coOwner.lastName} a demandé à rejoindre l'immeuble ${building.name}. Veuillez approuver ou rejeter cette demande.`,
                relatedTo: building._id,
                onModel: 'coowner',
                senderName: `${coOwner.firstName} ${coOwner.lastName}`,
                associationId: newAssociation._id // Ajouter l'ID de l'association pour faciliter l'approbation
            };

            await NotificationController.createNotification(notificationData);

            // Envoi en temps réel si le syndic est en ligne
            const adminSocketId = socketManager.onlineUsers.get(building.user.toString());
            if (adminSocketId) {
                socketManager.io.to(adminSocketId).emit('notification', {
                    ...notificationData,
                    createdAt: new Date()
                });
            }
        } catch (notifError) {
            console.error('Error sending notification:', notifError);
            // Non bloquant - continuer même si la notification échoue
        }

        res.status(200).json({
            message: 'Building joining request sent successfully. Waiting for approval from the building administrator.',
            association: newAssociation
        });

    } catch (error) {
        console.error('Error joining building:', error);
        res.status(500).json({ message: 'Error joining building', error: error.message });
    }
};
//coOwner: View Apartments in a Specific Building
exports.getOwnerApartments = async (req, res) => {
    try {
        const { buildingId } = req.params;
        const userId = req.user._id;

        // Validate buildingId
        if (!mongoose.Types.ObjectId.isValid(buildingId)) {
            return res.status(400).json({ message: 'Invalid building ID' });
        }

        // Find the building with blocs
        const building = await Building.findById(buildingId).populate('blocs');

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // Get all bloc IDs
        const blocIds = building.blocs.map(bloc => bloc._id);

        // Find apartments directly
        const apartments = await Apartment.find({
            bloc: { $in: blocIds },
            coOwner: userId
        }).populate('bloc')
            .populate('coOwner');

        res.status(200).json({ apartments });
    } catch (error) {
        console.error('Error in getOwnerApartments:', error);
        res.status(500).json({
            message: 'Error fetching apartments',
            error: error.message
        });
    }
};
// Fetch a single building by ID
exports.getBuildingById = async (req, res) => {
    try {
        const building = await Building.findById(req.params.id)
            .populate({
                path: 'blocs',
                populate: {
                    path: 'apartments',
                    model: 'Apartment',
                },
            })
            .populate('coOwners', 'firstName lastName  email'); // Populate coOwners with name and email

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // Ensure the building belongs to the logged-in syndicate manager
        if (building.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        res.status(200).json({ building });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching building', error: error.message });
    }
};

exports.updateBuilding = async (req, res) => {
    try {
        const buildingId = req.params.id;
        const buildingData = req.body;

        console.log('Building update request received:', buildingId);
        console.log('Update data:', JSON.stringify(buildingData));

        // Step 1: Fetch the existing building with all its blocs and apartments
        const existingBuilding = await Building.findById(buildingId).populate({
            path: 'blocs',
            populate: { path: 'apartments' }
        });

        if (!existingBuilding) {
            return res.status(404).json({ error: 'Building not found' });
        }

        // Step 2: Update basic building fields
        existingBuilding.name = buildingData.name;
        existingBuilding.matricule = buildingData.matricule;
        existingBuilding.address_street = buildingData.address_street;
        existingBuilding.address_number = buildingData.address_number;
        existingBuilding.address_city = buildingData.address_city;
        existingBuilding.address_country = buildingData.address_country;
        await existingBuilding.save();

        // Step 3: Process blocs and apartments
        // Create a map of existing blocs for fast lookup
        const existingBlocsMap = new Map();
        existingBuilding.blocs.forEach(bloc => {
            existingBlocsMap.set(bloc._id.toString(), {
                bloc,
                apartmentIds: bloc.apartments.map(apt => apt._id.toString())
            });
        });

        // Track which blocs and apartments are in the update request
        const updateBlocIds = new Set();
        const updateApartmentIds = new Map(); // Map of bloc ID to set of apartment IDs

        // Process each bloc in the update
        for (const blocData of buildingData.blocs) {
            if (blocData._id) {
                // Existing bloc
                updateBlocIds.add(blocData._id.toString());

                // Update bloc name
                await Bloc.findByIdAndUpdate(blocData._id, { name: blocData.name });

                // Track which apartments are in this bloc's update
                const apartmentIdsInUpdate = new Set();
                updateApartmentIds.set(blocData._id.toString(), apartmentIdsInUpdate);

                // Process each apartment in this bloc
                for (const aptData of blocData.apartments) {
                    if (aptData._id) {
                        // Existing apartment
                        apartmentIdsInUpdate.add(aptData._id.toString());

                        // Update apartment data
                        await Apartment.findByIdAndUpdate(aptData._id, {
                            number: aptData.number,
                            floor: aptData.floor
                        });
                    } else {
                        // New apartment
                        const newApartment = new Apartment({
                            number: aptData.number,
                            floor: aptData.floor,
                            bloc: blocData._id,
                            building: buildingId
                        });
                        await newApartment.save();

                        // Add to bloc's apartments
                        const bloc = await Bloc.findById(blocData._id);
                        bloc.apartments.push(newApartment._id);
                        await bloc.save();
                    }
                }
            } else {
                // New bloc
                const newBloc = new Bloc({
                    name: blocData.name,
                    building: buildingId
                });
                await newBloc.save();

                // Add bloc to building
                existingBuilding.blocs.push(newBloc._id);

                // Create apartments for this new bloc
                for (const aptData of blocData.apartments) {
                    const newApartment = new Apartment({
                        number: aptData.number,
                        floor: aptData.floor,
                        bloc: newBloc._id,
                        building: buildingId
                    });
                    await newApartment.save();

                    // Add to bloc's apartments
                    newBloc.apartments.push(newApartment._id);
                }

                await newBloc.save();
            }
        }

        // Step 4: Delete apartments and blocs that are no longer in the update

        // Delete apartments that are no longer in their blocs
        for (const [blocId, { apartmentIds }] of existingBlocsMap.entries()) {
            if (updateBlocIds.has(blocId)) {
                // Bloc still exists, check for removed apartments
                const updatedApartmentIds = updateApartmentIds.get(blocId) || new Set();

                for (const aptId of apartmentIds) {
                    if (!updatedApartmentIds.has(aptId)) {
                        // This apartment was removed, delete it
                        console.log(`Deleting removed apartment: ${aptId} from bloc ${blocId}`);
                        await Apartment.findByIdAndDelete(aptId);
                    }
                }
            }
        }

        // Delete blocs that are no longer in the building
        for (const [blocId, blocData] of existingBlocsMap.entries()) {
            if (!updateBlocIds.has(blocId)) {
                // This bloc was removed, delete all its apartments and then the bloc
                console.log(`Deleting removed bloc: ${blocId}`);

                // Delete all apartments in this bloc
                for (const aptId of blocData.apartmentIds) {
                    await Apartment.findByIdAndDelete(aptId);
                }

                // Delete the bloc
                await Bloc.findByIdAndDelete(blocId);

                // Remove from building's blocs array
                existingBuilding.blocs = existingBuilding.blocs.filter(
                    id => id.toString() !== blocId
                );
            }
        }

        await existingBuilding.save();

        // Step 5: Fetch the updated building with all relations and return
        const updatedBuilding = await Building.findById(buildingId)
            .populate({
                path: 'blocs',
                populate: { path: 'apartments' }
            })
            .populate('user', 'email name')
            .populate('coOwners');

        res.status(200).json({
            message: 'Building updated successfully',
            building: updatedBuilding
        });
    } catch (error) {
        console.error('Error updating building:', error);
        res.status(500).json({ error: error.message });
    }
};


exports.deleteBuilding = async (req, res) => {
    try {
        const building = await Building.findByIdAndDelete(req.params.id);
        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // Delete all associated blocs
        const blocs = await Bloc.find({ building: req.params.id });
        for (const bloc of blocs) {
            // Delete all apartments in the bloc
            await Apartment.deleteMany({ bloc: bloc._id });
        }

        // Delete all blocs in the building
        await Bloc.deleteMany({ building: req.params.id });

        res.status(200).json({ message: 'Building deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting building', error: error.message });
    }
};
//Method to Fetch Co-Owners of a Building
exports.getCoOwners = async (req, res) => {
    try {
        const { buildingId } = req.params;
        const building = await Building.findById(buildingId)
            .populate({
                path: 'coOwners',
                populate: {
                    path: 'apartments',
                    populate: { path: 'building' }
                }
            });

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // Return direct array instead of object
        res.status(200).json(building.coOwners); // Changed from { coOwners: building.coOwners }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching co-owners', error: error.message });
    }
};


exports.getBuildingByMatricule = async (req, res) => {
    try {
        const building = await Building.findOne({ matricule: req.params.matricule });
        if (!building) return res.status(404).json({ message: "Building not found" });
        res.status(200).json(building);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



exports.getappartementforabloc = async (req, res) => {
    try {
        const apartments = await Apartment.find({
            bloc: req.params.blocId,
            coOwner: { $exists: false } // Only show unassigned apartments
        });
        res.json(apartments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}



exports.getblocperBuilding = async (req, res) => {
    try {
        const blocs = await Bloc.find({ building: req.params.buildingId }).populate('apartments')
            .populate('building'); // Populate building field
        res.json(blocs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


exports.getallapartmentperBuilding = async (req, res) => {
    try {
        const apartments = await Apartment.find({ building: req.params.buildingId })
            .populate('bloc')
            .populate({
                path: 'building',
                populate: {
                    path: 'blocs',
                }
            })
            .populate('coOwner');
        res.json(apartments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}



exports.getallapartment = async (req, res) => {
    try {
        // Find buildings for the current user
        const buildings = await Building.find({ user: req.user._id }).populate('blocs');
        const buildingIds = buildings.map(b => b._id);

        // Now, find apartments for those buildings
        const apartments = await Apartment.find({ building: { $in: buildingIds } }).populate('bloc')
            .populate('coOwner'); // Populate coOwner field
        res.json(apartments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching apartments", error: error.message });
    }
};

exports.fetchallBlocs = async (req, res) => {
    try {
        // Find buildings for the current user
        const buildings = await Building.find({ user: req.user._id });
        const buildingIds = buildings.map(b => b._id);

        // Now, find blocs for those buildings
        const blocs = await Bloc.find({ building: { $in: buildingIds } }).populate('apartments')
            .populate('building'); // Populate building field
        res.json(blocs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching blocs", error: error.message });
    }
};




exports.deleteCoOwnerFromAbuilding = async (req, res) => {
    try {
        const { buildingId } = req.params;
        const { userId } = req.body;

        // First, find the building to ensure it exists
        const building = await Building.findById(buildingId);
        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // Find all apartments in this building that belong to the co-owner
        const apartments = await Apartment.find({
            building: buildingId,
            coOwner: userId
        });

        // Update each apartment to remove the co-owner
        for (const apartment of apartments) {
            apartment.coOwner = undefined;  // Set to undefined instead of null for MongoDB
            await apartment.save();
        }

        // Remove building from co-owner's buildings list
        await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    buildings: buildingId,
                    apartments: { $in: apartments.map(apt => apt._id) }
                }
            }
        );

        // Remove co-owner from building's co-owners list
        const updatedBuilding = await Building.findByIdAndUpdate(
            buildingId,
            { $pull: { coOwners: userId } },
            { new: true }
        ).populate('blocs').populate('coOwners');

        // Get current user for notification
        const currentUser = await User.findById(req.user._id).select('firstName lastName');
        const coOwner = await User.findById(userId);

        // Create notification for the co-owner
        if (coOwner) {
            try {
                const notification = await NotificationController.createNotification({
                    recipient: userId,
                    type: 'alert',
                    title: 'Building Access Removed',
                    content: `Your access to the building "${building.name}" has been revoked`,
                    relatedTo: buildingId,
                    onModel: 'Building',
                    senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                    senderAvatar: req.user._id
                });

                // Send real-time notification if user is online
                const coOwnerSocketId = socketManager.onlineUsers.get(userId.toString());
                if (coOwnerSocketId) {
                    socketManager.io.to(coOwnerSocketId).emit('notification', {
                        ...notification.toObject(),
                        buildingId
                    });
                }
            } catch (notifError) {
                console.error('Error creating notification for co-owner:', notifError);
            }
        }

        res.status(200).json({
            message: 'Co-owner removed successfully from building and associated apartments',
            building: updatedBuilding,
            apartmentsUpdated: apartments.length
        });
    } catch (error) {
        console.error('Error in deleteCoOwnerFromAbuilding:', error);
        res.status(500).json({ message: 'Error removing co-owner', error: error.message });
    }
}



// BuildingController.js
exports.getBuildingDetails = async (req, res) => {
    try {
        const building = await Building.findById(req.params.id)
            .populate('blocs')
            .populate('coOwners')
            .lean();

        const blocs = await Bloc.find({ building: req.params.id });
        const apartments = await Apartment.find({ building: req.params.id });

        res.json({ ...building, blocs, apartments });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching building details' });
    }
};



exports.getAllCoownersInAllBuildingsPerUser = async (req, res) => {
    try {
        // Verify the current user is a SyndicateAdmin
        if (req.user.role !== 'SyndicateAdmin') {
            return res.status(403).json({ message: 'Only SyndicateAdmin can access this resource' });
        }

        // Find all buildings where the current user is the admin (creator)
        const buildings = await Building.find({ user: req.user._id })
            .populate({
                path: 'coOwners',
                select: '-password', // Exclude password field
                populate: [{
                    path: 'apartments',
                    model: 'Apartment'
                }]
            });

        // Extract and merge all coOwners from all buildings
        const allCoOwners = buildings.reduce((acc, building) => {
            if (building.coOwners && building.coOwners.length > 0) {
                // Filter out duplicates by checking if the coOwner is already in the accumulator
                const newCoOwners = building.coOwners.filter(coOwner =>
                    !acc.some(existing => existing._id.equals(coOwner._id))
                );
                return [...acc, ...newCoOwners];
            }
            return acc;
        }, []);

        res.status(200).json(allCoOwners);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};



exports.deleteApartment = async (req, res) => {
    try {
        const { id } = req.params;

        // Find apartment to get references
        const apartment = await Apartment.findById(id);
        if (!apartment) {
            return res.status(404).json({ error: 'Apartment not found' });
        }

        // Remove apartment reference from bloc if it belongs to one
        if (apartment.bloc) {
            await Bloc.findByIdAndUpdate(
                apartment.bloc,
                { $pull: { apartments: id } }
            );
        }

        // Remove apartment reference from building
        await Building.findByIdAndUpdate(
            apartment.building,
            { $pull: { apartments: id } }
        );

        // If apartment has a co-owner, update the co-owner's records
        if (apartment.coOwner) {
            await User.findByIdAndUpdate(
                apartment.coOwner,
                { $pull: { apartments: id } }
            );

            // Check if the co-owner has other apartments in this building
            const otherApartments = await Apartment.countDocuments({
                building: apartment.building,
                coOwner: apartment.coOwner,
                _id: { $ne: id } // Exclude the apartment being deleted
            });

            // If no other apartments, remove building from co-owner's buildings list
            if (otherApartments === 0) {
                await User.findByIdAndUpdate(
                    apartment.coOwner,
                    { $pull: { buildings: apartment.building } }
                );

                // Remove co-owner from building's co-owners list
                await Building.findByIdAndUpdate(
                    apartment.building,
                    { $pull: { coOwners: apartment.coOwner } }
                );
            }
        }

        // Delete the apartment
        await Apartment.findByIdAndDelete(id);

        res.json({ message: 'Apartment deleted successfully' });
    } catch (error) {
        console.error('Error deleting apartment:', error);
        res.status(500).json({ error: 'Server error while deleting apartment' });
    }
};


exports.createApartment = async (req, res) => {
    try {
        const { number, floor, type, bloc, bedrooms, building } = req.body;

        // Basic validation
        if (!number || !floor || !bedrooms || !building) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if building exists
        const buildingExists = await Building.findById(building);
        if (!buildingExists) {
            return res.status(404).json({ error: 'Building not found' });
        }

        // Check if bloc exists if provided
        if (bloc) {
            const blocExists = await Bloc.findById(bloc);
            if (!blocExists) {
                return res.status(404).json({ error: 'Bloc not found' });
            }

            // Verify bloc belongs to the specified building
            if (blocExists.building.toString() !== building) {
                return res.status(400).json({ error: 'Bloc does not belong to the specified building' });
            }
        }

        // Create new apartment
        const apartment = new Apartment({
            number,
            floor,
            type,
            bedrooms,
            bloc: bloc || null,
            building
        });

        // Save the apartment
        const savedApartment = await apartment.save();

        // Update the bloc if provided
        if (bloc) {
            await Bloc.findByIdAndUpdate(
                bloc,
                { $addToSet: { apartments: savedApartment._id } }
            );
        }

        // Update the building
        await Building.findByIdAndUpdate(
            building,
            { $addToSet: { apartments: savedApartment._id } }
        );

        // Return the saved apartment with populated references
        const populatedApartment = await Apartment.findById(savedApartment._id)
            .populate('building')
            .populate('bloc');

        res.status(201).json(populatedApartment);

    } catch (error) {
        console.error('Error creating apartment:', error);
        res.status(500).json({ error: 'Server error while creating apartment' });
    }
};


exports.updateApartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { number, floor, type, bloc, building, bedrooms } = req.body;

        // Basic validation
        if (!number || !floor || !bedrooms || !building) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get the existing apartment
        const existingApartment = await Apartment.findById(id);
        if (!existingApartment) {
            return res.status(404).json({ error: 'Apartment not found' });
        }

        // Check if building exists
        const buildingExists = await Building.findById(building);
        if (!buildingExists) {
            return res.status(404).json({ error: 'Building not found' });
        }
        if (bloc) {
            const blocExists = await Bloc.findById(bloc);
            if (!blocExists) {
                return res.status(404).json({ error: 'Bloc not found' });
            }

            // FIX HERE: Convert both to strings before comparing
            const blocBuildingStr = blocExists.building.toString();
            const selectedBuildingStr = building.toString();

            // Debug log to verify they match
            console.log('Bloc building ID:', blocBuildingStr);
            console.log('Selected building ID:', selectedBuildingStr);
            console.log('Are they equal?', blocBuildingStr === selectedBuildingStr);

            // Verify bloc belongs to the specified building
            if (blocBuildingStr !== selectedBuildingStr) {
                return res.status(400).json({
                    error: 'Bloc does not belong to the specified building',
                    blocBuilding: blocBuildingStr,
                    selectedBuilding: building
                });
            }
        }

        // If building changed, update references
        if (building !== existingApartment.building.toString()) {
            // Remove from old building
            await Building.findByIdAndUpdate(
                existingApartment.building,
                { $pull: { apartments: id } }
            );

            // Add to new building
            await Building.findByIdAndUpdate(
                building,
                { $addToSet: { apartments: id } }
            );
        }

        // If bloc changed, update references
        if (bloc !== (existingApartment.bloc ? existingApartment.bloc.toString() : null)) {
            // Remove from old bloc if it existed
            if (existingApartment.bloc) {
                await Bloc.findByIdAndUpdate(
                    existingApartment.bloc,
                    { $pull: { apartments: id } }
                );
            }

            // Add to new bloc if provided
            if (bloc) {
                await Bloc.findByIdAndUpdate(
                    bloc,
                    { $addToSet: { apartments: id } }
                );
            }
        }

        // Update the apartment
        const updatedApartment = await Apartment.findByIdAndUpdate(
            id,
            {
                number,
                floor,
                bedrooms,
                bloc: bloc || null,
                building,
                type
            },
            { new: true }
        ).populate('bloc').populate('building');

        res.json(updatedApartment);

    } catch (error) {
        console.error('Error updating apartment:', error);
        res.status(500).json({ error: 'Server error while updating apartment' });
    }
};


exports.assignCoOwnerToBuilding = async (req, res) => {
    try {
        const { coOwnerId } = req.body;
        const apartment = await Apartment.findById(req.params.id)
            .populate('building')
            .populate({
                path: 'building',
                populate: { path: 'user', select: 'firstName lastName' }  // Get building admin details
            });

        if (!apartment) {
            return res.status(404).json({ error: 'Apartment not found' });
        }

        // Get the coOwner user and current user details for the notification
        const coOwnerUser = await User.findById(coOwnerId);
        const currentUser = await User.findById(req.user._id).select('firstName lastName');

        if (!coOwnerUser) {
            return res.status(404).json({ error: 'CoOwner user not found' });
        }



        // First, remove from previous coOwner if exists
        if (apartment.coOwner && apartment.coOwner.toString() !== coOwnerId) {
            // Get previous coOwner details
            const prevCoOwner = await User.findById(apartment.coOwner);

            await User.findByIdAndUpdate(
                apartment.coOwner,
                {
                    $pull: {
                        apartments: apartment._id,
                        buildings: apartment.building._id
                    }
                }
            );

            // Check if previous coOwner has no other apartments in this building
            const otherApartments = await Apartment.countDocuments({
                building: apartment.building._id,
                coOwner: apartment.coOwner
            });

            if (otherApartments === 0) {
                await Building.findByIdAndUpdate(
                    apartment.building._id,
                    { $pull: { coOwners: apartment.coOwner } }
                );
            }

            // Create notification for the previous coOwner about removal
            if (prevCoOwner) {
                try {
                    const notification = await NotificationController.createNotification({
                        recipient: prevCoOwner._id,
                        type: 'alert',
                        title: 'Apartment Reassigned',
                        content: `Your apartment ${apartment.number} in building "${apartment.building.name}" has been reassigned to another co-owner`,
                        relatedTo: apartment.building._id,
                        onModel: 'Building',
                        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                        senderAvatar: req.user._id
                    });

                    // Send real-time notification if previous coOwner is online
                    const prevCoOwnerSocketId = socketManager.onlineUsers.get(prevCoOwner._id.toString());
                    if (prevCoOwnerSocketId) {
                        socketManager.io.to(prevCoOwnerSocketId).emit('notification', {
                            ...notification.toObject(),
                            buildingId: apartment.building._id,
                            apartmentId: apartment._id,
                            apartmentNumber: apartment.number
                        });
                    }
                } catch (notifError) {
                    console.error('Error creating notification for previous coOwner:', notifError);
                }
            }
        }

        // Update apartment's coOwner
        apartment.coOwner = coOwnerId;
        await apartment.save();

        // Update new coOwner's record and activate if inactive
        await User.findByIdAndUpdate(
            coOwnerId,
            {
                $addToSet: {
                    buildings: apartment.building._id,
                    apartments: apartment._id
                },
                isActive: true // Automatically activate the co-owner when assigned to an apartment
            }
        );

        // Add to building's coOwners list
        await Building.findByIdAndUpdate(
            apartment.building._id,
            { $addToSet: { coOwners: coOwnerId } }
        );

        // Create notification for the new coOwner
        try {
            const notification = await NotificationController.createNotification({
                recipient: coOwnerId,
                type: 'alert',
                title: 'New Apartment Assigned',
                content: `You have been assigned to apartment ${apartment.number} in building "${apartment.building.name}"`,
                relatedTo: apartment.building._id,
                onModel: 'Building',
                senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                senderAvatar: req.user._id
            });

            // Send real-time notification if new coOwner is online
            const newCoOwnerSocketId = socketManager.onlineUsers.get(coOwnerId.toString());
            if (newCoOwnerSocketId) {
                socketManager.io.to(newCoOwnerSocketId).emit('notification', {
                    ...notification.toObject(),
                    buildingId: apartment.building._id,
                    apartmentId: apartment._id,
                    apartmentNumber: apartment.number
                });
            }
        } catch (notifError) {
            console.error('Error creating notification for new coOwner:', notifError);
        }

        const updatedApartment = await Apartment.findById(apartment._id)
            .populate('coOwner')
            .populate('building');

        res.json(updatedApartment);
    } catch (error) {
        console.error('Error in assign-coowner:', error);
        res.status(500).json({ error: error.message });
    }
}


exports.removeCoOwnerFromApartment = async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.apartmentId)
            .populate('building')
            .populate('coOwner');

        if (!apartment) {
            return res.status(404).json({ error: 'Apartment not found' });
        }

        if (!apartment.coOwner) {
            return res.status(400).json({ error: 'No co-owner assigned' });
        }

        const coOwnerId = apartment.coOwner._id;
        const buildingId = apartment.building._id;

        // Get the current user details for the notification
        const currentUser = await User.findById(req.user._id).select('firstName lastName');



        // Create notification before removing the co-owner
        try {
            const notification = await NotificationController.createNotification({
                recipient: coOwnerId,
                type: 'alert',
                title: 'Apartment Assignment Removed',
                content: `Your assignment to apartment ${apartment.number} in building "${apartment.building.name}" has been removed`,
                relatedTo: apartment.building._id,
                onModel: 'Building',
                senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                senderAvatar: req.user._id
            });

            // Send real-time notification if coOwner is online
            const coOwnerSocketId = socketManager.onlineUsers.get(coOwnerId.toString());
            if (coOwnerSocketId) {
                socketManager.io.to(coOwnerSocketId).emit('notification', {
                    ...notification.toObject(),
                    buildingId: buildingId,
                    apartmentId: apartment._id,
                    apartmentNumber: apartment.number
                });
            }
        } catch (notifError) {
            console.error('Error creating notification for coOwner removal:', notifError);
        }

        // Remove coOwner from apartment
        apartment.coOwner = undefined;
        await apartment.save();

        // Remove apartment from user's apartments list
        await User.findByIdAndUpdate(
            coOwnerId,
            { $pull: { apartments: apartment._id } }
        );

        // Check if user has no other apartments in this building
        const otherApartments = await Apartment.countDocuments({
            building: buildingId,
            coOwner: coOwnerId
        });



        res.json({ success: true });
    } catch (error) {
        console.error('Error removing co-owner:', error);
        res.status(500).json({ error: error.message });
    }
}


exports.getAllOwnerApartments = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all apartments where the user is a co-owner
        const apartments = await Apartment.find({
            coOwner: userId
        })
            .populate({
                path: 'building',
                select: 'name matricule address_street address_number address_city address_country'
            })
            .populate('bloc')
            .sort({ 'building.name': 1, number: 1 }); // Sort by building name then apartment number

        if (!apartments || apartments.length === 0) {
            return res.status(200).json({
                message: 'No apartments found for this user',
                apartments: []
            });
        }

        res.status(200).json({
            count: apartments.length,
            apartments
        });
    } catch (error) {
        console.error('Error in getAllOwnerApartments:', error);
        res.status(500).json({
            message: 'Error fetching apartments',
            error: error.message
        });
    }
};



// Create a new bloc
exports.createBloc = async (req, res) => {
    try {
        const { name, building } = req.body;

        // Validate required fields
        if (!name || !building) {
            return res.status(400).json({ error: 'Missing required fields: name and building are required' });
        }

        // Check if building exists
        const buildingExists = await Building.findById(building);
        if (!buildingExists) {
            return res.status(404).json({ error: 'Building not found' });
        }

        // Create the bloc
        const bloc = new Bloc({
            name,
            building,
            apartments: [] // Start with empty apartments array
        });

        // Save the bloc
        const savedBloc = await bloc.save();

        // Update the building with the new bloc reference
        await Building.findByIdAndUpdate(
            building,
            { $addToSet: { blocs: savedBloc._id } }
        );

        // Return the saved bloc with populated building
        const populatedBloc = await Bloc.findById(savedBloc._id).populate('building');

        res.status(201).json(populatedBloc);
    } catch (error) {
        console.error('Error creating bloc:', error);
        res.status(500).json({ error: 'Server error while creating bloc' });
    }
};

// Update a bloc
exports.updateBloc = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, building } = req.body;

        // Validate required fields
        if (!name || !building) {
            return res.status(400).json({ error: 'Missing required fields: name and building are required' });
        }

        // Find the existing bloc
        const existingBloc = await Bloc.findById(id);
        if (!existingBloc) {
            return res.status(404).json({ error: 'Bloc not found' });
        }

        // Check if building exists
        const buildingExists = await Building.findById(building);
        if (!buildingExists) {
            return res.status(404).json({ error: 'Building not found' });
        }

        // If building changed, update references
        if (building !== existingBloc.building.toString()) {
            // Remove bloc reference from old building
            await Building.findByIdAndUpdate(
                existingBloc.building,
                { $pull: { blocs: id } }
            );

            // Add bloc reference to new building
            await Building.findByIdAndUpdate(
                building,
                { $addToSet: { blocs: id } }
            );

            // For each apartment in this bloc, update their building reference
            const apartments = await Apartment.find({ bloc: id });
            for (const apartment of apartments) {
                await Apartment.findByIdAndUpdate(
                    apartment._id,
                    { building: building }
                );

                // Update building's apartments array
                await Building.findByIdAndUpdate(
                    existingBloc.building,
                    { $pull: { apartments: apartment._id } }
                );

                await Building.findByIdAndUpdate(
                    building,
                    { $addToSet: { apartments: apartment._id } }
                );
            }
        }

        // Update the bloc
        const updatedBloc = await Bloc.findByIdAndUpdate(
            id,
            { name, building },
            { new: true }
        ).populate('building').populate('apartments');

        res.json(updatedBloc);
    } catch (error) {
        console.error('Error updating bloc:', error);
        res.status(500).json({ error: 'Server error while updating bloc' });
    }
};

exports.deleteBloc = async (req, res) => {
    try {
        const { id } = req.params;

        // Get apartments in this bloc
        const apartments = await Apartment.find({ bloc: id });

        // Delete or update all apartments in this bloc
        if (apartments.length > 0) {
            // Option 1: Delete apartments
            await Apartment.deleteMany({ bloc: id });

            // Option 2: Or update them to remove bloc reference
            // await Apartment.updateMany({ bloc: id }, { $set: { bloc: null } });
        }

        // Remove bloc reference from the building
        const bloc = await Bloc.findById(id);
        if (bloc && bloc.building) {
            await Building.findByIdAndUpdate(
                bloc.building,
                { $pull: { blocs: id } }
            );
        }

        // Delete the bloc
        await Bloc.findByIdAndDelete(id);

        res.json({ message: 'Bloc deleted successfully', affectedApartments: apartments.length });
    } catch (error) {
        console.error('Error deleting bloc:', error);
        res.status(500).json({ error: 'Failed to delete bloc' });
    }
};

// Get all apartments in a bloc
exports.getApartmentsByBloc = async (req, res) => {
    try {
        const { blocId } = req.params;

        // Validate bloc ID
        if (!mongoose.Types.ObjectId.isValid(blocId)) {
            return res.status(400).json({ error: 'Invalid bloc ID' });
        }

        // Check if bloc exists
        const blocExists = await Bloc.findById(blocId);
        if (!blocExists) {
            return res.status(404).json({ error: 'Bloc not found' });
        }

        // Find apartments in this bloc
        const apartments = await Apartment.find({ bloc: blocId })
            .populate('coOwner', 'firstName lastName email phoneNumber')
            .sort({ number: 1 }); // Sort by apartment number

        res.json(apartments);
    } catch (error) {
        console.error('Error getting apartments by bloc:', error);
        res.status(500).json({ error: 'Server error while fetching apartments' });
    }
};



/**
 * Middleware to check if gamification is enabled for a building
 * This simply checks if the building has gamification enabled
 */
exports.checkBuildingGamification = async (req, res, next) => {
    try {
        const { buildingId } = req.params;
        if (!buildingId) {
            return res.status(400).json({
                success: false,
                message: 'Building ID is required'
            });
        }

        // Get the building
        const building = await Building.findById(buildingId);
        if (!building) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Check if building has gamification enabled - this is all we need!
        if (!building.gamificationEnabled) {
            return res.status(403).json({
                success: false,
                message: 'Gamification is not enabled for this building'
            });
        }

        // Add building to request for downstream use
        req.building = building;

        next();
    } catch (error) {
        console.error('Error checking building gamification:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while checking gamification'
        });
    }
};

/**
 * Middleware to check if user is a coOwner in the specified building
 */
exports.checkBuildingCoOwner = async (req, res, next) => {
    try {
        const { buildingId } = req.params;
        const userId = req.user.id;

        const building = req.building || await Building.findById(buildingId);

        if (!building) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Check if user is a coOwner in this building
        const isCoOwner = building.coOwners.some(coowner =>
            coowner.toString() === userId.toString()
        );

        if (!isCoOwner) {
            return res.status(403).json({
                success: false,
                message: 'User is not a coowner in this building'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking building coowner:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
