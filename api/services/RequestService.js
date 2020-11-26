const rp = require('request-promise');
const facebookToken = sails.config.settings.facebook.token;
const telegramToken = sails.config.settings.telegram.token;
const witAiToken = sails.config.settings.witAi.token;
const hereApiKey = sails.config.settings.here.apiKey;
/**
 * RequestService.js
 */
module.exports = {

  async telegramCallbackRequest(userData) {
    const uri = `https://api.telegram.org/bot${telegramToken}/answerCallbackQuery?callback_query_id=${userData['callbackId']}&text=%00&show_alert=false`;
    const options = {
      method: 'GET',
      uri,
      body: {},
      json: true,
      headers: {},
    };
    return await rp(options).catch((error) => {
      sails.log.error('Error occurred while querying telegram');
      sails.log.error(error);
    });
  },

  async fetchFacebookUserDetails(chatId) {
    const uri = `https://graph.facebook.com/${chatId}?fields=first_name,last_name&access_token=${facebookToken}`;
    const options = {
      method: 'GET',
      uri,
      body: {},
      json: true,
      headers: {},
    };
    return await rp(options).catch((error) => {
      sails.log.error('Error occurred while querying facebook');
      sails.log.error(error);
    });
  },

  async queryWitAi(userData) {
    const query = userData['message'];
    const uri = `https://api.wit.ai/message?v=20201030&q=${encodeURIComponent(query)}`;
    const options = {
      method: 'GET',
      uri,
      body: {},
      json: true,
      headers: { Authorization: `Bearer ${witAiToken}` },
    };
    return await rp(options).catch((error) => {
      sails.log.error('Error occurred while querying wit ai');
      sails.log.error(error);
    });
  },

  async queryHere(userData, method = null) {
    let uri
    if (userData['hereQueryType'] == 'discover') {
      uri = `https://discover.search.hereapi.com/v1/discover`;
    } else if (userData['hereQueryType'] == 'routes') {
      uri = `https://router.hereapi.com/v8/routes`;
    }
    uri = `${uri}?apiKey=${hereApiKey}${userData['hereQuery']}`;
    const options = {
      method,
      uri,
      headers: {},
      body: {
      },
      json: true
    };

    return await rp(options).catch((error) => {
      sails.log.error('Error occurred while querying here');
      sails.log.error(error);
    });
  },

  async notify(userData, data, requestType = "messages") {
    if (userData['channel']) {
      let uri;
      if (userData['channel'] == 'facebook') {
        if (requestType == "messages") {
          uri = `https://graph.facebook.com/v3.3/me/messages?access_token=${facebookToken}`;
        } else if ($request_type == "messenger_profile") {
          uri = `https://graph.facebook.com/v3.3/me/messenger_profile?access_token=${facebookToken}`;
        }
      } else if (userData['channel'] == 'telegram') {
        uri = `https://api.telegram.org/bot${telegramToken}/${data['type']}`;
        data = data['data'];
      }
      const options = {
        method: 'POST',
        uri,
        body: data,
        json: true,
        headers: {},
      };
      return await rp(options).catch((error) => {
        sails.log.error('Error occurred while sending message notification');
        sails.log.error(error);
      });
    }
    return false;
  },
};
