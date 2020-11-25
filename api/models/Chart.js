/**
 * Chart.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */


module.exports = {
  attributes: {
    bloodGroup: {
      type: 'string',
      required: true,
    },
    match: {
      type: 'string',
      required: true,
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false,
    },

  },
};

