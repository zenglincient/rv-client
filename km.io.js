const release = require('./km.controller.release')

module.exports = ctx => {
  ctx.io.on('connect', socket => {
    socket.on('message', data => {
      data = JSON.parse(data)
      release({ ctx, socket, data })
    })
  })
}