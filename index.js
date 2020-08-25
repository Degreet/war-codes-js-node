require('c4console')
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

    if (url == 'add') {
      const token = cookies.get('token')
      const candidate = await users.findOne({ token })

      if (candidate) {
        const author = candidate.login
        const res = JSON.parse(await streamToString(req))
        res.author = author
        res.date = new Date().toLocaleString()
        articles.insertOne(res)
      }

      resp.end()
    } else if (url == 'reg') {
      const user = JSON.parse(await streamToString(req))
      const salt = bcrypt.genSaltSync(10)
      const hash = bcrypt.hashSync(user.pass, salt)
      const candidate = await users.findOne({ login: user.login })

      if (candidate) {
        resp.end(JSON.stringify({ message: "Данный логин уже занят" }))
      } else {
        users.insertOne({ login: user.login, pass: hash })
        const token = generateToken()
        users.updateOne({ login: user.login, pass: hash }, { $set: { token } })
        cookies.set('token', token)
        resp.end(JSON.stringify({}))
      }
    } else if (url == 'auth') {
      const data = {}
      const user = JSON.parse(await streamToString(req))
      const candidate = await users.findOne({ login: user.login })

      if (!candidate) {
        data.message = 'Неверный логин'
        data.success = false
      } else {
        const res = bcrypt.compareSync(user.pass, candidate.pass)

        if (res) {
          const token = generateToken()
          users.updateOne({ login: user.login, pass: candidate.pass }, { $set: { token } })
          cookies.set('token', token)
          data.message = 'Вы успешно вошли!'
          data.success = true
        } else {
          data.message = 'Неверный пароль'
          data.success = false
        }
      }

      resp.end(JSON.stringify(data))
    } else if (url == 'exit') {
      cookies.set('token', null)
      resp.end()
    } else if (url == 'complete') {
      const data = JSON.parse(await streamToString(req))
      const token = cookies.get('token')
      const candidate = await users.findOne({ token })

      if (candidate) {
        const id = data.id
        const completedArr = candidate.completed || []

        data.author = candidate.login
        data.date = new Date().toLocaleString()
        data.articleId = id

        completedArr.push(id)

        answers.insertOne(data)
        users.updateOne({ token, login: candidate.login, pass: candidate.pass }, { $set: { completed: completedArr } })
      }

      resp.end()
    } else if (url == 'remove') {
      const body = JSON.parse(await streamToString(req))
      const id = ObjectId(body.id)
      const article = articles.findOne({_id: id})
      const token = cookies.get('token')
      const candidate = users.findOne({token})
      const author = article.author
      const data = {}

      if (candidate.login == author) {
        articles.removeOne({_id: id})
        data.message = 'Успешно удалено!'
        data.success = true
      } else {
        data.message = 'Ошибка.'
        data.success = false
      }

      resp.end(JSON.stringify(data))
    }
  } else if (url.startsWith('/article/')) {
    url = url.slice(9)
    
    const article = await articles.findOne({ _id: ObjectId(url) })
    const author = article.author
    const [file, header] = await Promise.all([
      fsp.readFile(__dirname + '/public/article.html'), getHeader(cookies)])
    const html = file.toString()
      .replace(/(<\/header>)/, header + '$1')
      .replace(/(id="article">)/, '$1' + await buildFullArticle(article, {cookies, author}))
    resp.setHeader('Content-Type', 'text/html')
    resp.end(html)
  } else if (url.startsWith('/go_article/')) {
    const id = url.slice(12)

    const token = cookies.get('token')
    const candidate = await users.findOne({ token })

    const article = await articles.findOne({ _id: ObjectId(id) })
    const [file, header] = await Promise.all([
      fsp.readFile(__dirname + '/public/go_article.html'), getHeader(cookies)])
    let html = file.toString()
      .replace(/(<\/header>)/, header + '$1')

    if (candidate) {
      const completed = candidate.completed || []
      if (completed.includes(id)) {
        const answersData = await answers.find({ articleId: id }).toArray()
        html =
          html.replace(/(id="result">)/, '$1' +
            `<div class="container"><ul>${answersData.map(buildAnswer).join('')}</ul></div>`)
      } else {
        html = html.replace(/(id="result">)/, '$1' + /*html*/`
          <div class="container go-article">
            <div id="article"></div>
            <div id="go">
              <div class="input-field">
                <textarea id="taskTA" class="materialize-textarea"></textarea>
                <label for="taskTA">Напишите функцию</label>
              </div>
              <div class="input-field">
                <textarea class="materialize-textarea" readonly id="testsTA"></textarea>
                <label for="taskTA">Тесты</label>
              </div>
            </div>
          </div>
        `)
          .replace(/(id="article">)/, '$1' + await buildFullArticle(article, {str: "go_article"}))
          .replace(/(id="testsTA">)/, '$1' + getTests(article.tests))
      }
    } else {
      html = `<script>location.href = '/auth'</script>`
    }
    
    resp.setHeader('Content-Type', 'text/html; charset=utf-8')
    resp.end(html)
  } else {
    if (url == '/add') {
      const token = cookies.get('token')
      const candidate = await users.findOne({ token })
      const isAuth = candidate ? true : false

      if (isAuth) {
        const path = __dirname + '/public/add.html'
        const [file, header] = await Promise.all([
          fsp.readFile(path), getHeader(cookies)])
        const html = file.toString().replace(/(<\/header>)/, header + '$1')
        resp.setHeader('Content-Type', 'text/html')
        resp.end(html)
      } else {
        resp.setHeader('Content-Type', 'text/html')
        resp.end(`<script>location.href = '/auth'</script>`)
      }
    } else if (url == '/reg') {
      const token = cookies.get('token')
      const candidate = await users.findOne({ token })
      const isAuth = candidate ? true : false

      if (!isAuth) {
        const path = __dirname + '/public/reg.html'
        const [file, header] = await Promise.all([
          fsp.readFile(path), getHeader(cookies)])
        const html = file.toString().replace(/(<\/header>)/, header + '$1')
        resp.setHeader('Content-Type', 'text/html')
        resp.end(html)
      } else {
        resp.setHeader('Content-Type', 'text/html')
        resp.end(`<script>location.href = '/'</script>`)
      }
    } else if (url == '/auth') {
      const token = cookies.get('token')
      const candidate = await users.findOne({ token })
      const isAuth = candidate ? true : false

      if (!isAuth) {
        const path = __dirname + '/public/auth.html'
        const [file, header] = await Promise.all([
          fsp.readFile(path), getHeader(cookies)])
        const html = file.toString().replace(/(<\/header>)/, header + '$1')
        resp.setHeader('Content-Type', 'text/html')
        resp.end(html)
      } else {
        resp.setHeader('Content-Type', 'text/html')
        resp.end(`<script>location.href = '/'</script>`)
      }
    } else {
      let path = process.cwd() + '/public' + url.replace(/\/$/, '')

      try {
        const target = await fsp.stat(path).catch(_ => fsp.stat(path += '.html'))
        if (target.isDirectory()) path += '/index.html'
        const match = path.match(/\.(\w+)$/), ext = match ? match[1] : 'html'

        if (path.endsWith("/public/index.html")) {
          const articlesData = await articles.find().toArray()
          const [file, header] = await Promise.all([
            fsp.readFile(path), getHeader(cookies)])
          const html = file.toString()
            .replace(/(<\/header>)/, header + '$1')
            .replace(/(id="articles">)/, '$1' + articlesData.map(buildArticle).join(''))
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

async function getHeader(cookies) {
  let accountName
  const token = cookies.get('token')
  const candidate = await users.findOne({ token })

  if (candidate) {
    accountName = candidate.login
  }

  const [file] = await Promise.all([fsp.readFile('public/components/header.htm')])
  let html = file.toString()
  html = !accountName ? html.replace(/(id="ifNoAuth">)/, '$1' + `
    <li><a href="/auth">Войти</a></li>
    <li><a href="/reg">Регистрация</a></li>
  `) : html.replace(/(id="elseNoAuth">)/, '$1' + `
    <li><a href="/add">Добавить</a></li>
    <li><a href="#" onclick="fetch('/api/exit').then(()=>location.href='/auth')">Выйти (${accountName})</a></li>
  `)

  return html
}

function buildArticle(article) {
  return /*html*/`
    <li>
      <div class="card blue-lighten darken-1">
        <div class="card-content">
          <span class="card-title">${article.title}</span>
          <p>${article.desc.length > 130 ? article.desc.slice(0, 130) + '...' : article.desc}</p>
        </div>
        <div class="card-action">
          <a href="/article/${article._id}">Перейти</a>
        </div>
      </div>
    </li>
  `
}

async function buildFullArticle(article, params={}) {
  const str = params.str
  const cookies = params.cookies
  const token = cookies ? cookies.get('token') : ''
  const candidate = await users.findOne({token})
  const author = params.author

  return /*html*/`
    <div class="card blue-lighten darken-1">
      <div class="card-content">
        <span class="card-title">${article.title}</span>
        <p>${article.desc}</p>
        <div class="bottom">
          <span>Автор: <a href="#">${article.author}</a></span>
          <span>Дата: <a href="#">${article.date}</a></span>
        </div>
      </div>
      <div class="card-action">
        ${
          str == 'go_article'
            ? `<a onclick="send('${article._id}')" id="sendBtn" href="#">Отправить</a>`
            : `<a href="/go_article/${article._id}">Перейти к решению</a>`
        }

        ${
          candidate && candidate.login == author
            ? `<a onclick="remove('${article._id}')" href="#">Удалить</a>`
            : ''
        }
      </div>
    </div>
  `
}

function buildAnswer(answer) {
  return /*html*/`
    <li>
      <div class="card blue-lighten darken-1">
        <div class="card-content">
          <span class="card-title">${answer.author}</span>
          <p>${answer.code}</p>
        </div>
      </div>
    </li>
  `
}

function getTests(tests) {
  let res = ''
  tests.forEach(test => res += `${test.call} === ${test.res}\n`)
  return res
}

client.connect(err => {
  if (err) console.log(err)

  global.users = client.db("war-codes-js").collection("users")
  global.articles = client.db("war-codes-js").collection("articles")
  global.answers = client.db("war-codes-js").collection("answers")

  server.listen(PORT, () => console.log('Server started at http://localhost:3000'))
  setTimeout(() => client.close(), 1e9)
})