const fs = require('fs')
const path = require('path')
const execa = require('execa')
const del = require('del')
const axios = require('axios')

const Release = async ({ ctx, socket, data }) => {
  const log = data => socket.send(JSON.stringify({ type: 'release:log', data }))
  const success = data => socket.send(JSON.stringify({ type: 'release:success', data }))
  const fail = data => socket.send(JSON.stringify({ type: 'release:fail', data }))

  const { zip, content, type, clean, token } = data
  const fileDir = process.env.TEMP_PATH
  const fileName = zip
  const fileNameNoSuffix = path.basename(fileName, '.zip')
  const filePath = path.resolve(fileDir, fileName)
  const fileSourcePath = path.resolve(fileDir, fileNameNoSuffix)

  ctx.logger.trace('-----------')
  ctx.logger.trace('token', token)
  ctx.logger.trace('zip', fileName)
  ctx.logger.trace('type', type)
  ctx.logger.trace('content', JSON.stringify(content, null, 2))

  // 检验 token 参数
  const checkToken = () => {
    if (!token || (token && !['joyyued2021'].includes(token))) {
      fail('RV_TOKEN 验证失败，请正确配置相关参数。')
      throw new Error('token 验证失败')
    }
    log('[RV_TOKEN] 验证成功')
  }

  try {
    log('[zip] 开始下载...')

    // 下载代码包
    await new Promise(resolve => {
      axios({
        url: `https://ovo-oss.duowan.com/rv/${fileName}`,
        responseType: 'arraybuffer'
      }).then(({ data }) => {
        fs.writeFileSync(filePath, data, 'binary')
        resolve()
      }).catch(error => {
        fail('[zip] 下载发生过程错误')
        ctx.logger.error('下载代码包错误', error)
      })
    })

    log('[zip] 下载完成')

    // 解压源文件
    fs.mkdirSync(fileSourcePath)

    await execa.command(`unzip ${filePath}`, { cwd: fileSourcePath })

    log('[zip] 解压完成')

    for (const item of content) {
      const { path: itemPath, script: itemScript } = item

      log(`[发布] 开始执行，路径 ${itemPath}`)

      if (!itemPath || itemPath === '/') {
        throw new Error('[发布] 路径存在错误')
      }

      // 发布到其他服务器文件夹需要验证 token
      if (
        itemPath.indexOf('/usr/share/nginx/html/') !== 0 &&
        itemPath.indexOf('/data') !== 0
      ) {
        checkToken()
      }

      // 是否创建文件夹
      !fs.existsSync(itemPath) && fs.mkdirSync(itemPath)

      // node 类型先清理旧文件
      if (type === 'node') {
        await del([
          `${itemPath}/*`,
          `!${itemPath}/node_modules`,
          `!${itemPath}/logs`,
          `!${itemPath}/cache.*`,
          `!${itemPath}/tmp`
        ], { force: true })
        log('[发布] type(node) 清除旧文件完成')
      }

      // 清空之前旧部署文件
      // eslint-disable-next-line eqeqeq
      if (clean == true) {
        checkToken()
        await del([`${itemPath}/*`], { force: true })
        log('[发布] clean - 清除所有旧文件完成')
      }

      // 迁移资源
      await execa.command(`cp -R . ${itemPath}`, { cwd: fileSourcePath })
      log('[发布] 文件迁移完成')

      // 执行脚本
      if (itemScript && Array.isArray(itemScript) && itemScript.length > 0) {
        log('[发布] 开始执行脚本...')
        checkToken()
        for (const command of itemScript) {
          log(`[发布] ${command}`)
          const result = await execa.command(command, { cwd: itemPath })
          if (result.exitCode === 0) {
            log(result.stdout)
          } else {
            throw result.stdout
          }
        }
        log('[发布] 完成执行所有脚本')
      }
    }

    ctx.logger.trace('success')
  } catch (error) {
    ctx.logger.error(error)
    fail(error.message)
  } finally {
    del.sync(filePath, { force: true })
    del.sync(fileSourcePath, { force: true })
    log('[清理] 缓存文件')
}

success()
}

module.exports = Release