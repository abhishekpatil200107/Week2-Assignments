// Public surface of the auth module
module.exports = {
  authRouter: require('./auth.routes'),
  ...require('./auth.middleware'),
  ...require('./tokens'),
  ...require('./validation'),
};
