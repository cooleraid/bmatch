/**
 * BloodDrive.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */


module.exports = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    location: {
      type: 'string',
    },
    locationCoordinates: {
      type: 'json',
    },
    contactNumber: {
      type: 'string',
    },
    operatingTime: {
      type: 'string',
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false,
    },

  },
};

