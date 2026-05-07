// import mongoose from "mongoose";

// const uri = "mongodb+srv://zwghijihed_db_user:Us5x7kPyJLlN3iYU@cluster0.mk8jemw.mongodb.net/?appName=Cluster0";
// const uri = "mongodb://localhost:27017/pool-championship";
/* const uri =  "mongodb+srv://zwghijihed_db_user:Us5x7kPyJLlN3iYU@cluster0.mk8jemw.mongodb.net/test";

mongoose.connect(uri)
  .then(() => console.log("✅ Connected"))
  .catch(err => console.error("❌ Error:", err)); */


// import mongoose from "mongoose";

// 🔹 URI (mets ton vrai password)
const uri = "mongodb+srv://zwghijihed_db_user:Us5x7kPyJLlN3iYU@cluster0.mk8jemw.mongodb.net/test?retryWrites=true&w=majority";

// 🔹 Connexion
/* async function run() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // 🔹 Définir un schema (structure souple)
    const registrationSchema = new mongoose.Schema({}, { strict: false });

    // 🔹 Lier à la collection "registrations"
    const Registration = mongoose.model("Registration", registrationSchema, "registrations");

    // 🔹 Lire tous les documents
    const registrations = await Registration.find();

    console.log("🎯 Registrations:");
    console.log(registrations);

    // 🔹 Exemple filtre
    // const registrations = await Registration.find({ score: { $gt: 50 } });

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.connection.close();
  }
}

run(); */


import mongoose from "mongoose";

// const uri = "mongodb+srv://zwghijihed_db_user:YOUR_PASSWORD@cluster0.mk8jemw.mongodb.net/test?retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    const registrationSchema = new mongoose.Schema({}, { strict: false });
    const Registration = mongoose.model("Registration", registrationSchema, "registrations");

    // 🔥 BULK UPDATE (no memory load)
    const result = await Registration.updateMany(
      {}, // all documents
      { $set: { photoUrl: "" } }
    );

    console.log("🎯 Update result:", result);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.connection.close();
  }
}

run();