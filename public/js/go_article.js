const tests = testsTA.value.slice(0, testsTA.value.length - 1).split('\n')

function send(id) {
  let successCount = 0

  tests.forEach(test => eval(test.match(/isSimilar\(\w*/)[0].slice(10) + ' = () => false'))
  eval(taskTA.value.replace('const', 'var'))
  tests.forEach(userTestTestTest => eval(userTestTestTest) ? successCount++ : 0)

  if (successCount == tests.length) next()
  else fail()

  function next() {
    fetch(`/api/complete`, {
      method: "POST",
      body: JSON.stringify({ id, code: taskTA.value })
    }).then(() => {
      M.toast({ html: "Отправлено!" })
      setTimeout(() => location.reload(), 1500)
    })
  }

  function fail() {
    M.toast({ html: "Неверный ответ" })
  }
}

function isSimilar(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < a.length; i++) {
      if (!isSimilar(a[i], b[i])) return false
    }

    return true
  } else if (typeof a == 'object' && typeof b == 'object') {
    for (const key in a) {
      if (!isSimilar(a[key], b[key])) return false
    }

    return true
  } else {
    return a == b
  }
}