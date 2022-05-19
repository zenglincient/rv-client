const path = require('path')
const fs = require('fs')
const packageJson = require('./package.json')
const name = packageJson.name
const script = packageJson.main

// pm2 测试环境名称
const TEST_NAME = `${name}/test`
// pm2 正式环境名称
const PROD_NAME = `${name}/production`
// 临时文件夹
const TEMP_PATH = path.resolve(__dirname, 'temp')
// 端口号
const PORT = 10012

!fs.existsSync(TEMP_PATH) && fs.mkdirSync(TEMP_PATH)

// PM2 配置
module.exports = {
  apps: [
    {
      name: TEST_NAME,
      script,
      env: {
        NODE_ENV: 'test',
        TEMP_PATH,
        PORT
      }
    },
    {
      name: PROD_NAME,
      script,
      env: {
        NODE_ENV: 'production',
        TEMP_PATH,
        PORT
      }
    }
  ]
}