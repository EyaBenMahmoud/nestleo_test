const Apartment = require('../Models/Appartement');
const Building = require('../Models/Building'); 


const createApartment = async (req, res) => {
    try {
        const { unitNumber, typeApartment, buildingId } = req.body;
        const building = await Building.findById(buildingId);
        if (!building) return res.status(404).json({ message: "Building not found" });
        const apartment = new Apartment({
            unitNumber, 
            typeApartment, 
            Building: buildingId
        });
        await apartment.save();
        building.apartments.push(apartment._id);
        await building.save();

        res.status(201).json(apartment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAllApartments = async (req, res) => {
    try {
        const apartments = await Apartment.find().populate('Building');
        res.status(200).json(apartments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get one apartment (extended with more details)
const getApartmentById = async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.id)
            .populate('building')
            .populate('bloc')
            .populate({
                path: 'coOwner',
                select: 'firstName lastName email phone' // Include only necessary fields
            });
            
        if (!apartment) return res.status(404).json({ message: "Apartment not found" });
        
        // Get payment status if there's a coOwner
        if (apartment.coOwner) {
            // Example logic to calculate payment status (implement based on your system)
            // This is just a placeholder - replace with your actual payment status logic
            const currentDate = new Date();
            const paymentStatusInfo = await PaymentModel.findOne({ 
                apartment: apartment._id,
                dueDate: { $gte: currentDate }
            }).sort({ dueDate: 1 });
            
            if (paymentStatusInfo) {
                apartment.paymentStatus = paymentStatusInfo.status;
            }
        }
        
        res.status(200).json(apartment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateApartment = async (req, res) => {
    try {
        const updatedApartment = await Apartment.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('Building');  // Use 'Building' instead of 'building'
        if (!updatedApartment) return res.status(404).json({ message: "Apartment not found" });
        res.status(200).json(updatedApartment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const deleteApartment = async (req, res) => {
    try {
        const deletedApartment = await Apartment.findByIdAndDelete(req.params.id);
        if (!deletedApartment) return res.status(404).json({ message: "Apartment not found" });
        res.status(200).json({ message: "Apartment deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createApartment,
    getAllApartments,
    getApartmentById,
    updateApartment,
    deleteApartment
};
