const { MongoClient, ObjectId } = require("mongodb")
const { createServer } = require('http')
const fs = require('fs'), fsp = fs.promises
const bcrypt = require('bcrypt')
const Cookies = require('cookies')
const dotenv = require('dotenv')
dotenv.config()

const PORT = process.env.PORT || 3000
const pass = process.env.KEY
const server = createServer(requestHandler)
const uri = `mongodb+srv://Node:${pass}@cluster0-ttfss.mongodb.net/war-codes-js?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

async function requestHandler(req, resp) {
  const cookies = new Cookies(req, resp)

  let { url } = req
  if (url.startsWith('/api/')) {
    url = url.slice(5)

    if (url == 'reg') {
      const user = JSON.parse(await streamToString(req))

      const salt = bcrypt.genSaltSync(10)
      const hash = bcrypt.hashSync(user.pass, salt)
      
      const candidate = await users.findOne({login: user.login})
      if (candidate) {
        resp.end(JSON.stringify({message: "Данный логин уже занят"}))
      } else {
        users.insertOne({login: user.login, pass: hash})
        resp.end(JSON.stringify({}))
      }   
    } else if (url == 'auth') {
      const data = {}
      const user = JSON.parse(await streamToString(req))
      const candidate = await users.findOne({login: user.login})
      if (!candidate) {
        data.message = 'Неверный логин'
        data.succcess = false
      } else {
        const res = bcrypt.compareSync(user.pass, candidate.pass)

        if (res) {
          const token = generateToken()
          users.updateOne({login: user.login, pass: user.pass}, {$set: {token}})
          cookies.set('token', token)
          data.message = 'Вы успешно вошли!'
          data.success = true
        } else {
          data.message = 'Неверный пароль'
          data.success = false
        }
      }

      resp.end(JSON.stringify(data))
    }
  } else {
    if (url == '/components/header.htm') {
      const [file] = await Promise.all([fsp.readFile('public/components/header.htm')])
      const html = file.toString()
      resp.setHeader('Content-Type', 'text/html; charset=utf-8')
      resp.end(html)
    } else if (url == '/reg') {
      const path = __dirname + '/public/reg.html'
      const [file, header] = await Promise.all([
        fsp.readFile(path), fsp.readFile(path.replace('reg.html', 'components/header.htm'))])
      const html = file.toString().replace(/(<\/header>)/, header + '$1')/* .replace(/(id="wishList">)/, '$1' + wishesData.map(buildWish).join('')) */
      resp.setHeader('Content-Type', 'text/html')
      resp.end(html)
    } else if (url == '/auth') {
      const path = __dirname + '/public/auth.html'
      const [file, header] = await Promise.all([
        fsp.readFile(path), fsp.readFile(path.replace('auth.html', 'components/header.htm'))])
      const html = file.toString().replace(/(<\/header>)/, header + '$1')/* .replace(/(id="wishList">)/, '$1' + wishesData.map(buildWish).join('')) */
      resp.setHeader('Content-Type', 'text/html')
      resp.end(html)
    } else {
      let path = process.cwd() + '/public' + url.replace(/\/$/, '')

      try {
        const target = await fsp.stat(path).catch(_ => fsp.stat(path += '.html'))
        if (target.isDirectory()) path += '/index.html'
        const match = path.match(/\.(\w+)$/), ext = match ? match[1] : 'html'

        if (path.endsWith("/public/index.html")) {
          const [file, header] = await Promise.all([
            fsp.readFile(path), fsp.readFile(path.replace('index.html', 'components/header.htm'))])
          const html = file.toString().replace(/(<\/header>)/, header + '$1')/* .replace(/(id="wishList">)/, '$1' + wishesData.map(buildWish).join('')) */
          resp.setHeader('Content-Type', 'text/html')
          resp.end(html)
        } else {
          fs.createReadStream(path).pipe(resp)
          resp.setHeader('Content-Type', {
            html: 'text/html',
            json: 'application/json',
            css: 'text/css',
            ico: 'image/x-icon',
            jpg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            js: 'application/javascript',
          }[ext])
        }
      } catch {
        resp.end('"... sorry, ' + url + ' is not available"')
      }
    }
  }
}

function streamToString(stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

function generateToken() {
  let res = ''
  const chars = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890'
  for (let i = 0; i < 32; i++) res += chars[Math.floor(Math.random() * chars.length)]
  return res
}

client.connect(err => {
  if (err) console.log(err)
  global.users = client.db("war-codes-js").collection("users")
  server.listen(PORT, () => console.log('Server started at http://localhost:3000'))
  setTimeout(() => client.close(), 1e9)
})