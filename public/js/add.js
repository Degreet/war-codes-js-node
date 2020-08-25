let lastTest = 2

addTestBtn.onclick = () => {
  const testsLength = document.querySelectorAll('#tests li').length

  if (testsLength < 10) {
    const li = document.createElement('li')

    li.innerHTML = `
      <h5>Тест №${lastTest}</h5>
      <div class="input-field">
        <input id="test${lastTest}CallInp" value="тест${lastTest}" type="text" class="validate findId">
        <label for="test${lastTest}CallInp">Вызов функции</label>
      </div>
      <div class="input-field">
        <input id="test${lastTest}ResInp" value="тест${lastTest}р" type="text" class="validate">
        <label for="test${lastTest}ResInp">Ожидаемый результат</label>
      </div>
    `

    lastTest++
    tests.append(li)
  } else {
    M.toast({html: "Максимальное кол-во тестов 10!"})
  }
}

sendBtn.onclick = () => {
  const title = titleInp.value
  const desc = taskDescInp.value
  const tests = []

  document.querySelectorAll('#tests li').forEach(test => {
    const newTest = {};
    [newTest.call, newTest.res] = [...test.querySelectorAll('input')].map(input => input.value)
    tests.push(newTest)
  })

  fetch('/api/add', {
    method: "POST",
    body: JSON.stringify({title, desc, tests})
  }).then(() => {
    M.toast({html: "Успешно добавлено!"})
    setTimeout(() => location.href = '/', 1500)
  })
}