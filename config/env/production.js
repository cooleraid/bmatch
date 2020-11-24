/**
 * Production environment settings
 * (sails.config.*)
 *
 * What you see below is a quick outline of the built-in settings you need
 * to configure your Sails app for production.  The configuration in this file
 * is only used in your production environment, i.e. when you lift your app using:
 *
 * ```
 * NODE_ENV=production node app
 * ```
 *
 * > If you're using git as a version control solution for your Sails app,
 * > this file WILL BE COMMITTED to your repository by default, unless you add
 * > it to your .gitignore file.  If your repository will be publicly viewable,
 * > don't add private/sensitive data (like API secrets / db passwords) to this file!
 *
 * For more best practices and tips, see:
 * https://sailsjs.com/docs/concepts/deployment
 */

module.exports = {
  port: process.env.PORT || 1500,
  datastores: {
    default: {
      adapter: 'sails-mongo',
      host: 'localhost',
      port: 27017,
      database: process.env.DATABASE || 'bmatchbot'
    },
  },
  models: {
    migrate: 'safe',
  },
  session: {
    adapter: '@sailshq/connect-redis',
    host: '127.0.0.1',
    port: '6379',
    db: 4,
    prefix: 'bmatch_prod_sess:',
    cookie: {
      // secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  },
  sockets: {
    adapter: '@sailshq/socket.io-redis',
    host: '127.0.0.1',
    port: '6379',
    db: 5,
  },
  settings: {
    facebook: {
      token: process.env.FACEBOOK_TOKEN
    },
    telegram: {
      token: process.env.TELEGRAM_TOKEN
    },
    witAi: {
      token: process.env.WIT_AI_TOKEN
    },
    here: {
      apiKey: process.env.HERE_API_KEY
    },
  },
  http: {
    cache: 365.25 * 24 * 60 * 60 * 1000,
  },
  blueprints: {
    shortcuts: false,
  },
  log: {
    level: 'debug'
  },
  http: {
    cache: 365.25 * 24 * 60 * 60 * 1000,
  },
};
