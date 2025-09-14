// config/app.config.ts
export default () => ({
  appName: process.env.APP_NAME || 'MyNestApp',
  port: parseInt(process.env.PORT || '5009' , 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
});
