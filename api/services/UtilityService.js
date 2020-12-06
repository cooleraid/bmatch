
/**
 * UtilityService.js
 */
const asyncRedis = require('async-redis');
const redisConfig = sails.config.redis;
const redisClient = asyncRedis.createClient(redisConfig);
module.exports = {

  async send(userData, response, data, messageType) {
    let responseData;
    if (userData['channel'] == 'facebook') {
      responseData = { text: response, data, messageType: messageType['facebook'] };
    } else if (userData['channel'] == 'telegram') {
      responseData = { text: response, data, messageType: messageType['telegram'] };
    }
    await UtilityService.channel(userData, responseData);
  },

  async channel(userData, responseData) {
    let data
    if (userData['channel'] == 'facebook') {
      data = await FacebookService.facebook(userData, responseData);
    } else if (userData['channel'] == 'telegram') {
      data = await TelegramService.telegram(userData, responseData);
    }
    await RequestService.notify(userData, data);
  },
  async insertUserDetails(userData) {
    if (userData['message'] == '/start' || userData['payload'] == '/start') {
      userData['nextSession'] = 'start';
    }
    const user = await User.update({ chatId: userData['chatId'], channel: userData['channel'], isDeleted: false }).set({ nextSession: userData['nextSession'] }).fetch();
    if (!user.length) {
      userData['nextSession'] = 'start';
      await User.create(userData);
    }
  },

  async updateNextSession(userData) {
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ nextSession: userData['nextSession'] });
  },

  async updatePhoneNumber(userData) {
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ phoneNumber: userData['phoneNumber'] });
  },

  async genderList() {
    return [{ name: "Male", id: "male" }, { name: "Female", id: "female" }, { name: "Others", id: "others" }]
  },

  async updateGender(userData) {
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ gender: userData['gender'] });
  },

  async updateAge(userData) {
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ age: userData['age'] });
  },

  async bloodGroupList() {
    return [{ name: "A+", id: "A+" }, { name: "B+", id: "B+" }, { name: "AB+", id: "AB+" }, { name: "O+", id: "O+" }, { name: "A-", id: "A-" }, { name: "B-", id: "B-" }, { name: "AB-", id: "AB-" }, { name: "O-", id: "O-" }]
  },

  async updateBloodGroup(userData) {
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ bloodGroup: userData['bloodGroup'] });
  },

  async updateCountry(userData) {
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ country: userData['country']['name'], countryCoordinates: userData['country']['coords'] });
  },

  async updateLocation(userData) {
    const locationData = await redisClient.get(`${userData['chatId']}-locationData-${userData['payload']}`);
    const location = JSON.parse(locationData);
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ location: location['location'], locationCoordinates: [location['coords']['long'], location['coords']['lat']] });
  },

  async queryLocation(userData) {
    const result = await UtilityService.queryLocationInput(userData);
    if (result == false) {
      botResponse = `No results found.`;
      await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' });

      userData['nextSession'] = 'locationQuery';
      await UtilityService.updateNextSession(userData);

      botResponse = `What's your current location? (Input a word or phrase)`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
  },

  async findMatch(userData) {
    const requestId = await redisClient.get(`${userData['chatId']}-requestId`);
    const request = await Requests.findOne({ id: requestId, isDeleted: false });
    if (!request) {
      userData['nextSession'] = 'action';
      await UtilityService.updateNextSession(userData);

      botResponse = `An error was encountered. Kindly make the request again`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
    let bloodGroup = await Chart.find({ select: ['match'], where: { bloodGroup: request['bloodGroup'] } });
    bloodGroup = _.map(bloodGroup, 'match')

    userData['nextSession'] = 'action';
    await UtilityService.updateNextSession(userData);
    const bloodMatch = await new Promise(function (resolve, reject) {
      User.native(function (err, collection) {
        if (err) {
          return reject(err);
        }
        var pipeline = []; //some pipeline
        collection.aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [request['locationCoordinates']['long'], request['locationCoordinates']['lat']] },
              distanceField: "dist.calculated",
              maxDistance: 10 * 1000.0,
              query: {
                donor: true,
                chatId: { $ne: userData['chatId'] },
                phoneNumber: { $ne: userData['phoneNumber'] },
                bloodGroup: { $in: bloodGroup }
              },
              distanceMultiplier: 0.001,
              includeLocs: "dist.location",
              spherical: true
            }
          }]).toArray(function (err, itemList) {
            if (err) {
              return reject(err);
            }
            var unserializedValues = [];
            itemList.forEach(function (value) {
              value = User._transformer.unserialize(value);
              unserializedValues.push(value);
            });

            return resolve(unserializedValues);
          })
      })
    });
    userData['destination'] = `${request['locationCoordinates']['lat']},${request['locationCoordinates']['long']}`;
    if (bloodMatch.length > 0) {
      botResponse = `Donor request sent to ${bloodMatch.length} matching recipient. Your contact details have been sent and you'd be contacted by the donor if your request is accepted.`;
      await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
      for (const match of bloodMatch) {
        userData['origin'] = `${match['locationCoordinates'][1]},${match['locationCoordinates'][0]}`;
        const fetchDurationLength = await UtilityService.fetchDurationLength(userData);
        botResponse = `New Blood Donor Request.\n
        \nRecipient Name: "*${userData['firstName']} ${userData['lastName']}*" with blood type: "*${request['bloodGroup']}*" is in need of blood, reason: "*${request['reason']}*".
        \nGender: ${userData['gender']}
        \nRecipient Contact: ${userData['phoneNumber']}\nRecipient Location: ${request['location']}.
        \nTravel Mode: Car;
        \nDistance: ${fetchDurationLength ? `${(fetchDurationLength['length'] / 1000).toFixed(2)}km` : 'NA'}.
        \nEstimated Arrival Time: ${fetchDurationLength ? `${(fetchDurationLength['duration'] / 60).toFixed(2)}min` : 'NA'}
        \n*Note: We recommend you meet with the recipient in a known hospital/clinic/health center.*`;
        await UtilityService.send(match, botResponse, null, { facebook: 'message', telegram: 'message' })
      }
    } else {
      botResponse = `Match Not Found.`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
  },

  async findBloodBank(userData) {
    const locationData = await redisClient.get(`${userData['chatId']}-locationData-${userData['payload']}`);
    if (!locationData) {
      userData['nextSession'] = 'action';
      await UtilityService.updateNextSession(userData);

      botResponse = `An error was encountered. Kindly search again`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }

    userData['nextSession'] = 'action';
    await UtilityService.updateNextSession(userData);

    const location = JSON.parse(locationData);
    const bloodBank = await new Promise(function (resolve, reject) {
      BloodBank.native(function (err, collection) {
        if (err) {
          return reject(err);
        }
        collection.aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [location['coords']['long'], location['coords']['lat']] },
              distanceField: "dist.calculated",
              maxDistance: 10 * 1000.0,
              query: {},
              distanceMultiplier: 0.001,
              includeLocs: "dist.location",
              spherical: true
            }
          }]).toArray(function (err, itemList) {
            if (err) {
              return reject(err);
            }
            var unserializedValues = [];
            itemList.forEach(function (value) {
              value = BloodBank._transformer.unserialize(value);
              unserializedValues.push(value);
            });

            return resolve(unserializedValues);
          })
      })
    });
    userData['origin'] = `${location['coords']['lat']},${location['coords']['long']}`;
    const queryHereBloodBanks = await UtilityService.queryHereBloodBanks(userData);
    if (bloodBank.length > 0 || queryHereBloodBanks.length > 0) {
      const bloodBankCount = bloodBank.length > 0 ? bloodBank.length : 0;
      const queryHereBloodBanksCount = queryHereBloodBanks.length > 0 ? queryHereBloodBanks.length : 0;
      const count = bloodBankCount + queryHereBloodBanksCount;
      botResponse = `${count} blood bank${count > 1 ? 's' : ''} found around ${location['location']}.\n\nBlood Bank Result:`;
      await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
      if (bloodBank.length > 0) {
        for (const bank of bloodBank) {
          let contact = "";
          if (bank?.contacts?.length > 0) {
            contact = `\nContacts:\n`;
            for (const cont of bank.contacts) {
              contact += `\n-${cont.contactType}: ${cont.value}\n`;
            }
          }
          userData['destination'] = `${bank['locationCoordinates'][1]},${bank['locationCoordinates'][0]}`;
          const fetchDurationLength = await UtilityService.fetchDurationLength(userData);
          botResponse = `${bank['type'] == 'bmatch' ? `_(Bmatch Partner)_\n` : ''}Name: ${bank['name']}.\n
          \nAddress: ${bank['location']}.${contact}
          \nTravel Mode: Car;
          \nDistance: ${fetchDurationLength ? `${(fetchDurationLength['length'] / 1000).toFixed(2)}km` : 'NA'}.
          \nEstimated Arrival Time: ${fetchDurationLength ? `${(fetchDurationLength['duration'] / 60).toFixed(2)}min` : 'NA'}`;
          await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
        }
      }
      if (queryHereBloodBanks.length > 0) {
        for (const hereBank of queryHereBloodBanks) {
          let contact = "";
          if (hereBank?.contacts?.length > 0) {
            contact = `\nContacts:\n`;
            if (hereBank.contacts[0].email){
              contact += `\n-EMAIL: ${hereBank.contacts[0].email[0].value}\n`;
            }
            if (hereBank.contacts[0].phone){
              contact += `\n-PHONE: ${hereBank.contacts[0].phone[0].value}\n`;
            }
          }
          userData['destination'] = `${hereBank['position']['lat']},${hereBank['position']['lng']}`;
          const fetchDurationLength = await UtilityService.fetchDurationLength(userData);
          botResponse = `Name: ${hereBank['title'] ? hereBank['title'] : hereBank['address']['label']}.\n
          \nAddress: ${hereBank['address']['label'] ? hereBank['address']['label'] : hereBank['title']}.${contact}
          \nTravel Mode: Car;
          \nDistance: ${fetchDurationLength ? `${(fetchDurationLength['length'] / 1000).toFixed(2)}km` : 'NA'}.
          \nEstimated Arrival Time: ${fetchDurationLength ? `${(fetchDurationLength['duration'] / 60).toFixed(2)}min` : 'NA'}`;
          await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
        }
      }
    } else {
      botResponse = `Blood Bank Not Found.`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
  },

  async findBloodDrive(userData) {
    const locationData = await redisClient.get(`${userData['chatId']}-locationData-${userData['payload']}`);
    if (!locationData) {
      userData['nextSession'] = 'action';
      await UtilityService.updateNextSession(userData);

      botResponse = `An error was encountered. Kindly search again`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }

    userData['nextSession'] = 'action';
    await UtilityService.updateNextSession(userData);

    const location = JSON.parse(locationData);
    const bloodDrive = await new Promise(function (resolve, reject) {
      BloodDrive.native(function (err, collection) {
        if (err) {
          return reject(err);
        }
        collection.aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [location['coords']['long'], location['coords']['lat']] },
              distanceField: "dist.calculated",
              maxDistance: 10 * 1000.0,
              query: {},
              distanceMultiplier: 0.001,
              includeLocs: "dist.location",
              spherical: true
            }
          }]).toArray(function (err, itemList) {
            if (err) {
              return reject(err);
            }
            var unserializedValues = [];
            itemList.forEach(function (value) {
              value = BloodDrive._transformer.unserialize(value);
              unserializedValues.push(value);
            });

            return resolve(unserializedValues);
          })
      })
    });
    userData['origin'] = `${location['coords']['lat']},${location['coords']['long']}`;
    if (bloodDrive.length > 0) {
      botResponse = `${bloodDrive.length} blood drive${bloodDrive.length > 1 ? 's' : ''} found around ${location['location']}.\n\nBlood Drive Result:`;
      await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
      for (const drive of bloodDrive) {
        userData['destination'] = `${drive['locationCoordinates'][1]},${drive['locationCoordinates'][0]}`;
        const fetchDurationLength = await UtilityService.fetchDurationLength(userData);
        botResponse = `Name: ${drive['name']}.\n
        \nAddress: ${drive['location']}.${drive['contactNumber'] ? `
        \nContact: ${drive['contactNumber']}.` : ''}${drive['operatingTime'] ? `
        \nOperating Time: ${drive['operatingTime']}.` : ''}
        \nTravel Mode: Car;
        \nDistance: ${fetchDurationLength ? `${(fetchDurationLength['length'] / 1000).toFixed(2)}km` : 'NA'}.
        \nEstimated Arrival Time: ${fetchDurationLength ? `${(fetchDurationLength['duration'] / 60).toFixed(2)}min` : 'NA'}`;
        await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
      }
    } else {
      botResponse = `Blood Drive Not Found.`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
  },

  async queryHereBloodBanks(userData) {
    userData['hereQueryType'] = 'browse';
    userData['hereQuery'] = `&at=${userData['origin']}&limit=6&categories=800-8000-0367&in=circle:${userData['origin']};r=10000`;
    const result = await RequestService.queryHere(userData, 'GET');
    if (result['items']) {
      if (result['items'].length > 0) {
        return result['items'];
      } else {
        return false;
      }
    } else {
      return false;
    }
  },

  async fetchDurationLength(userData) {
    userData['hereQueryType'] = 'routes';
    userData['hereQuery'] = `&transportMode=car&origin=${userData['origin']}&destination=${userData['destination']}&return=summary`

    const result = await RequestService.queryHere(userData, 'GET');
    if (result['routes']) {
      if (result['routes'].length > 0) {
        if (result['routes'][0]['sections']) {
          if (result['routes'][0]['sections'].length > 0) {
            if (result['routes'][0]['sections'][0]['summary']) {
              return result['routes'][0]['sections'][0]['summary'];
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  },

  async queryDonorRequestLocation(userData) {
    let requestIdCountryCoordinates = await redisClient.get(`${userData['chatId']}-requestIdCountryCoordinates`);
    requestIdCountryCoordinates = JSON.parse(requestIdCountryCoordinates);
    userData['countryCoordinates'] = requestIdCountryCoordinates['countryCoordinates']
    const result = await UtilityService.queryLocationInput(userData);
    if (result == false) {
      botResponse = `No results found.`;
      await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' });

      userData['nextSession'] = 'donorRequestLocationQuery';
      await UtilityService.updateNextSession(userData);

      botResponse = `What's your current location/hospital? (Input a word or phrase)`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
  },

  async queryBloodDriveLocation(userData) {
    const result = await UtilityService.queryLocationInput(userData);
    if (result == false) {
      botResponse = `No results found.`;
      await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' });

      userData['nextSession'] = 'bloodDriveLocationQuery';
      await UtilityService.updateNextSession(userData);

      botResponse = `What's your current location? (Input a word or phrase)`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
  },

  async queryBloodBankLocation(userData) {
    const result = await UtilityService.queryLocationInput(userData);
    if (result == false) {
      botResponse = `No results found.`;
      await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' });

      userData['nextSession'] = 'bloodBankLocationQuery';
      await UtilityService.updateNextSession(userData);

      botResponse = `What's your current location? (Input a word or phrase)`;
      return await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' })
    }
  },

  async queryLocationInput(userData) {
    userData['hereQueryType'] = 'discover';
    userData['hereQuery'] = `&q=${encodeURIComponent(userData['message'])}&limit=6`
    if (userData['countryCoordinates']) {
      userData['hereQuery'] = `${userData['hereQuery']}&at=${userData['countryCoordinates']['lat']},${userData['countryCoordinates']['long']}`
    }
    const result = await RequestService.queryHere(userData, 'GET');
    if (result['items']) {
      if (result['items'].length > 0) {
        botResponse = `Search Result for ${userData['message']}:`;
        await UtilityService.send(userData, botResponse, null, { facebook: 'message', telegram: 'message' });
        let count = 1;
        for (const res of result['items']) {
          botResponse = `${res['address']['label'] ? res['address']['label'] : res['title']}`;
          await redisClient.set(`${userData['chatId']}-locationData-${count}`, JSON.stringify({ location: botResponse, coords: { lat: res['position']['lat'], long: res['position']['lng'] } }));
          const data = [{ name: res['title'], id: count }]
          await UtilityService.send(userData, botResponse, data, { facebook: 'button_template', telegram: 'inline_keyboard' });
          count++;
        }
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  },

  async updateDonorRegistration(userData) {
    await User.update({ chatId: userData['chatId'], isDeleted: false }).set({ donor: userData['donor'] });
  },

  async insertDonorRequestReason(userData) {
    const user = await Requests.create({ reason: userData['message'], channel: userData['channel'], chatId: userData['chatId'] }).fetch();
    await redisClient.set(`${userData['chatId']}-requestId`, user.id);
  },

  async insertDonorRequestBloodGroup(userData) {
    const requestId = await redisClient.get(`${userData['chatId']}-requestId`);
    await Requests.update({ id: requestId, channel: userData['channel'], chatId: userData['chatId'] }).set({ bloodGroup: userData['bloodGroup'] });
  },

  async insertDonorRequestCountry(userData) {
    const requestId = await redisClient.get(`${userData['chatId']}-requestId`);
    const coords = { country: userData['country']['name'], countryCoordinates: userData['country']['coords'] };
    await Requests.update({ id: requestId, channel: userData['channel'], chatId: userData['chatId'] }).set(coords);
    await redisClient.set(`${userData['chatId']}-requestIdCountryCoordinates`, JSON.stringify(coords));
  },

  async insertDonorRequestLocation(userData) {
    const requestId = await redisClient.get(`${userData['chatId']}-requestId`);
    const locationData = await redisClient.get(`${userData['chatId']}-locationData-${userData['payload']}`);

    const location = JSON.parse(locationData);
    await Requests.update({ id: requestId, channel: userData['channel'], chatId: userData['chatId'] }).set({ location: location['location'], locationCoordinates: location['coords'] });
  },

  async answerList() {
    return [{ name: "Yes", id: "yes" }, { name: "No", id: "no" }]
  },

  async menu() {
    return [{ name: "Donor", id: "donor" }, { name: "Blood Drive", id: "bloodDrive" }, { name: "Blood Bank", id: "bloodBank" }]
  },

  async donorMenu(userData) {
    let rName, rId;
    if (userData['donor']) {
      rName = 'Unregister';
      rId = 'unregister';
    } else {
      rName = 'Register';
      rId = 'register';
    }
    return [{ name: rName, id: rId }, { name: "Request", id: "request" }]
  },

  async bloodDriveMenu() {
    return [{ name: "Search", id: "bloodDriveSearch" }, { name: "Organize", id: "bloodDriveOrganize" }]
  },

  async bloodBankMenu() {
    return [{ name: "Search", id: "bloodBankSearch" }, { name: "Partner", id: "bloodBankPartner" }]
  },
};
