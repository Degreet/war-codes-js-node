const tests = testsTA.value.slice(0, testsTA.value.length - 1).split('\n')

function send(id) {
  tests.forEach(test => eval(test.match(/\w*/)[0] + ' = () => false'))
  eval(taskTA.value.replace('const', 'var'))
  tests.forEach(test => eval(test) ? next() : fail())

  function next() {
    fetch(`/api/complete`, {
      method: "POST",
      body: JSON.stringify({id, code: taskTA.value})
    }).then(() => {
      M.toast({html: "Отправлено!"})
      setTimeout(() => location.reload(), 1500)
    })
  }

  function fail() {
    M.toast({html: "Неверный ответ"})
  }
}