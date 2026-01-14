const admin = require("firebase-admin");
const serviceAccount = require("../../texidispetchsystem-firebase-adminsdk-fbsvc-fbaa57a6e4.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
