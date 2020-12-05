/**
 * BloodBank.js
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
    contacts: {
      type: 'json', 
      columnType: 'array'
    },
    hereId: {
      type: 'string',
    },
    type: {
      type: 'string',
      isIn: ['here', 'bmatch'],
      defaultsTo: 'bmatch'
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false,
    },

  },
};

