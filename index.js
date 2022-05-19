const Koa = require('koaman')
const app = new Koa()

app
  .cors()
  .logger()
  .errorHandler()
  .util()
  .io()
  .controller()
  .router()
  .start()