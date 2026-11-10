const admin = require("firebase-admin");
// const serviceAccount = require("../../texidispetchsystem-firebase-adminsdk-fbsvc-fbaa57a6e4.json");
const serviceAccount = require("../../nexus-texh-group-ltd-firebase-adminsdk-fbsvc-abc57cbde5.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
