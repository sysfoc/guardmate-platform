const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardmate-platform');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const users = await User.find({ role: 'MATE' }).limit(1);
  if (!users.length) {
    console.log("No mate user found");
    return;
  }
  const user = users[0];
  console.log("User:", {
    address: user.address,
    postalCode: user.postalCode,
    idExpiry: user.idExpiry,
    city: user.city,
    country: user.country
  });

  const updateRes = await User.updateOne(
    { _id: user._id },
    { $set: { address: 'Test 123', postalCode: 'ABC 123', idExpiry: new Date() } }
  );
  console.log("Update res:", updateRes);

  const after = await User.findById(user._id);
  console.log("After update:", {
    address: after.address,
    postalCode: after.postalCode,
    idExpiry: after.idExpiry
  });
  
  process.exit(0);
}
test().catch(console.error);
