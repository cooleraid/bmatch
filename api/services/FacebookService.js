
/**
 * FacebookService.js
 */
const { promisify } = require('util')
module.exports = {

  async facebook(userData, responseData) {
    this.senderAction(userData, "mark_seen");
    this.senderAction(userData, "typing_on");
    const sleep = promisify(setTimeout)
    await sleep(2000)
    if (responseData['messageType'] == 'message') {
      return this.message(userData, responseData);
    } else if (responseData['messageType'] == 'audio') {
      return this.audio(userData, responseData);
    } else if (responseData['messageType'] == 'image') {
      return this.image(userData, responseData);
    } else if (responseData['messageType'] == 'video') {
      return this.video(userData, responseData);
    } else if (responseData['messageType'] == 'quick_reply') {
      return this.quickReply(userData, responseData);
    } else if (responseData['messageType'] == 'location') {
      return this.location(userData, responseData);
    } else if (responseData['messageType'] == 'contact') {
      return this.contact(userData, responseData);
    } else if (responseData['messageType'] == 'generic_template') {
      return this.genericTemplate(userData, responseData);
    } else if (responseData['messageType'] == 'button_template') {
      return this.buttonTemplate(userData, responseData);
    }
  },

  async senderAction(userData, senderAction) {
    const data = {
      recipient: {
        id: userData['chatId']
      },
      sender_action: senderAction
    };
    return await RequestService.notify(userData, data);
  },

  async message(userData, responseData) {
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        text: responseData['text']
      }
    };
    return data;
  },

  async audio(userData, responseData) {
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        attachment: {
          type: 'audio',
          payload: {
            url: responseData['text']
          }
        }
      }
    };
    return data;
  },

  async image(userData, responseData) {
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        attachment: {
          type: 'image',
          payload: {
            url: responseData['text']
          }
        }
      }
    };
    return data;
  },

  async video(userData, responseData) {
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        attachment: {
          type: 'video',
          payload: {
            url: responseData['text']
          }
        }
      }
    };
    return data;
  },


  async quickReply(userData, responseData) {
    const dataArr = [];
    for (const resData of responseData['data']) {
      dataArr.push({
        content_type: 'text', title: resData['name'], payload: resData['id']
      });
    }
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        text: responseData['text'],
        quick_replies: dataArr
      }
    };
    return data;
  },

  async location(userData, responseData) {
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        text: responseData['text'],
        quick_replies: [{ content_type: 'location' }]
      }
    };
    return data;

  },

  async contact(userData, responseData) {
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        text: responseData['text'],
        quick_replies: [{ "content_type": "user_phone_number" }]
      }
    };
    return data;
  },

  async genericTemplate(userData, responseData) {
    const dataArr = [];
    for (resData of responseData['data']) {
      if (resData['id'] == 'web_url') {
        dataArr.push({
          title: resData['name'],
          image_url: resData['image'],
          subtitle: resData['description']
        });
      } else {
        dataArr.push({
          "title": resData['name'],
          "image_url": resData['image'],
          "subtitle": resData['description']
        });
      }
    }

    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: dataArr
          },
        },
      },
    };
    return data;
  },

  async buttonTemplate(userData, responseData) {
    const dataArr = [];
    for (resData of responseData['data']) {
      dataArr.push({
        type: 'postback',
        title: resData['name'],
        payload: resData['id']
      });
    }
    const data = {
      recipient: {
        id: userData['chatId']
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: responseData['text'],
            buttons: dataArr
          },
        },
      },
    };
    return data;
  },
};
