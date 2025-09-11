const mongoose = require('mongoose');
const createSuperAdmin = require('./superAdminCreator');
const initCurrencies = require('./initCurrency');


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB')
    await createSuperAdmin(()=>{
      console.log("Admin account created succefully !!! ")
    });
        

    // await initCurrencies(()=>{

    //   console.log('💰 Currency initialization complete');
    // });

    

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error)
    process.exit(1);
  }
};


module.exports = connectDB;