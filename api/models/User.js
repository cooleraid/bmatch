/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    firstName: {
      type: 'string',
    },
    lastName: {
      type: 'string',
    },
    username: {
      type: 'string',
    },
    chatId: {
      type: 'string',
    },
    channel: {
      type: 'string',
      isIn: ['facebook', 'telegram'],
      required: true,
    },
    nextSession: {
      type: 'string',
      required: true,
    },
    phoneNumber: {
      type: 'string',
    },
    gender: {
      type: 'string',
    },
    bloodGroup: {
      type: 'string',
    },
    country: {
      type: 'string',
    },
    countryCoordinates: {
      type: 'json',
    },
    location: {
      type: 'string',
    },
    locationCoordinates: {
      type: 'json',
    },
    donor: {
      type: 'boolean',
      defaultsTo: false,
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false,
    },

  },

};

