/**
 * Requests.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
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
    chatId: {
      type: 'string',
    },
    channel: {
      type: 'string',
      isIn: ['facebook', 'telegram'],
      required: true,
    },
    reason: {
      type: 'string',
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false,
    },

  },

};

