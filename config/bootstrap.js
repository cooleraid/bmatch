/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

module.exports.bootstrap = async function() {

  const dbUser = User.getDatastore().manager;
  const collectionUser = dbUser.collection(User.tableName);
  collectionUser.ensureIndex({ locationCoordinates: "2dsphere" });

  const dbBloodBank = BloodBank.getDatastore().manager;
  const collectionBloodBank = dbBloodBank.collection(BloodBank.tableName);
  collectionBloodBank.ensureIndex({ locationCoordinates: "2dsphere" });

  const dbBloodDrive = BloodDrive.getDatastore().manager;
  const collectionBloodDrive = dbBloodDrive.collection(BloodDrive.tableName);
  collectionBloodDrive.ensureIndex({ locationCoordinates: "2dsphere" });

};
