# Bmatch
Connect voluntary blood donors with recipients. Chatbot built with Here, Telegram, Facebook messenger, Wit ai, and Sails JS

## Requirements
1. [Here](https://developer.here.com/)  Developers Account
2. [Wit AI](https://wit.ai/) Account.
3. [Facebook Messenger](https://developers.facebook.com/docs/messenger-platform/) Account.
4. [Telegram](https://telegram.org/) Account.
5. Mac OS (feel free to use any OS).
6. [Git](https://git-scm.com/).
7. Node (NPM)
8. [Sails JS](https://sailsjs.com/).
9. [Mongo DB](https://www.mongodb.com/).
10. [Ngrok](https://ngrok.com/) or a cloud hosting service (DigitalOcean, AWS).

## Setup
#### Here:
1. Create a freemium account via [Here](https://developer.here.com/).
2. Create an API Key and store it in your OS environment variable by running:

```bash
export HERE_API_KEY=YOUR-API-KEY
```
3. Create places data layer and store the space ID in your OS environment variable by running:

```bash
export HERE_SA_PLACE_SPACE_ID=YOUR-SPACE-ID
```
*Note: We used South Africa data layer. Feel free to replace HERE_SA_PLACE_SPACE_ID with your preferred variable name and also update it in your code*
4. Create an [access token](https://xyz.api.here.com/token-ui/index.html) and store it in your OS environment variable by running:

```bash
export HERE_ACCESS_TOKEN=YOUR-ACCESS-TOKEN
```
#### Telegram:
1. Create a new chatbot via [BotFather](https://telegram.me/BotFather).
2. Store the newly created telegram bot access token in your OS environment variable by running:

```bash
export TELEGRAM_TOKEN=YOUR-ACCESS-TOKEN
```

#### Facebook
1. Follow the necessary steps to create a developer account and chatbot via [Facebook Messenger Documentation](https://developers.facebook.com/docs/messenger-platform/).
2. Store your Facebook token in your OS environment variable by running:
```bash
export FACEBOOK_TOKEN=YOUR-FACEBOOK-APP-TOKEN
```
#### Wit AI:
1. Store the wit.ai server access token in your OS environment variable by running:

```bash
export WIT_AI_TOKEN=YOUR-WITAI-ACCESS-TOKEN
```

## Usage
Navigate to the project directory in your terminal and install the necessary packages

```bash
npm install
```
Start the project by running:
##### Production
```bash
npm run start
```
##### Development
```bash
npm run dev
```
Open a new terminal, Navigate to the project directory and start your Ngrok Server

```bash
ngrok http 1500
```
To set the webhook URL to your telegram chatbot, run this in your terminal. 
Note: Replace YOUR_NGROK_URL with your Ngrok server URL.

```bash
curl https://api.telegram.org/bot$TELEGRAM_TOKEN/setWebhook?url=https://YOUR_NGROK_URL/flow/callback/telegram
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://github.com/cooleraid/bmatch/blob/master/LICENSE)
