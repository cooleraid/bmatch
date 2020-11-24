
/**
 * TelegramService.js
 */
const { promisify } = require('util')
module.exports = {

    async telegram(userData, responseData) {
        if (userData['payload']) {
            await RequestService.telegramCallbackRequest(userData);
        }
        const sleep = promisify(setTimeout)

        if (responseData['messageType'] == 'message') {
            this.senderAction(userData, "typing");
            await sleep(2000)
            return this.message(userData, responseData);
        } else if (responseData['messageType'] == 'audio') {
            this.senderAction(userData, "upload_audio");
            await sleep(2000)
            return this.audio(userData, responseData);
        } else if (responseData['messageType'] == 'image') {
            this.senderAction(userData, "upload_photo");
            await sleep(2000)
            return this.image(userData, responseData);
        } else if (responseData['messageType'] == 'video') {
            this.senderAction(userData, "upload_video");
            await sleep(2000)
            return this.video(userData, responseData);
        } else if (responseData['messageType'] == 'location') {
            this.senderAction(userData, "find_location");
            await sleep(2000)
            return this.location(userData, responseData);
        } else if (responseData['messageType'] == 'contact') {
            this.senderAction(userData, "typing");
            await sleep(2000)
            return this.contact(userData, responseData);
        } else if (responseData['messageType'] == 'inline_keyboard') {
            this.senderAction(userData, "typing");
            await sleep(2000)
            return this.inlineKeyboard(userData, responseData);
        }
    },

    async senderAction(userData, senderAction) {
        const data = {
            chat_id: userData['chatId'],
            action: senderAction
        };
        return await RequestService.notify(userData, { type: 'sendChatAction', data: data });
    },

    async message(userData, responseData) {
        const data = {
            chat_id: userData['chatId'],
            text: responseData['text'],
            parse_mode: 'MarkDown',
            reply_to_message_id: userData['messageId'],
            reply_markup: {}
        };
        return { type: 'sendMessage', data: data };
    },

    async audio(userData, responseData) {
        const data = {
            chat_id: userData['chatId'],
            audio: responseData['text'],
            parse_mode: 'MarkDown',
            reply_to_message_id: null,
            reply_markup: null
        };
        return { type: 'sendAudio', data: data };
    },

    async image(userData, responseData) {
        const data = {
            chat_id: userData['chatId'],
            photo: responseData['text'],
            parse_mode: 'MarkDown',
            reply_to_message_id: null,
            reply_markup: null
        };
        return { type: 'sendPhoto', data: data };
    },

    async video(userData, responseData) {
        const data = {
            chat_id: userData['chatId'],
            video: responseData['text'],
            parse_mode: 'MarkDown',
            reply_to_message_id: null,
            reply_markup: null
        };
        return { type: 'sendVideo', data: data };
    },

    async location(userData, responseData) {
        const keyboard = {
            keyboard: [
                [
                    {
                        text: "Send Location",
                        request_location: true
                    }
                ]
            ],
            one_time_keyboard: true,
            resize_keyboard: true
        };
        const data = {
            chat_id: userData['chatId'],
            text: responseData['text'],
            parse_mode: 'MarkDown',
            reply_to_message_id: null,
            reply_markup: keyboard
        };
        return { type: 'sendMessage', data: data };
    },

    async contact(userData, responseData) {
        const keyboard = {
            keyboard: [
                [
                    {
                        text: "Send Contact",
                        request_contact: true
                    }
                ]
            ],
            one_time_keyboard: true,
            resize_keyboard: true
        };
        const data = {
            chat_id: userData['chatId'],
            text: responseData['text'],
            parse_mode: 'MarkDown',
            reply_to_message_id: null,
            reply_markup: keyboard
        };
        return { type: 'sendMessage', data: data };
    },

    async inlineKeyboard(userData, responseData) {
        const dataArr = [];
        const dataDesc = [];
        for (resData of responseData['data']) {
            dataDesc.push(resData['name']);

            dataArr.push({
                inline_message_id: null,
                text: resData['name'],
                callback_data: resData['id']
            });
        }
        let keyboardData;
        if (dataArr.length > 3) {
            if (Math.max(...(dataDesc.map(el => el.length))) >= 15) {
                keyboardData = _.chunk(dataArr, 1)
            } else {
                keyboardData = _.chunk(dataArr, 3)
            }
        } else {
            keyboardData = [dataArr]
        }
        const keyboard = { "inline_keyboard": keyboardData };

        const data = {
            chat_id: userData['chatId'],
            text: responseData['text'],
            parse_mode: 'MarkDown',
            reply_to_message_id: null,
            reply_markup: keyboard
        };
        return { type: 'sendMessage', data: data };
    },
};