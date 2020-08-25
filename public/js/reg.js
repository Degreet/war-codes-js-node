sendBtn.onclick = () => {
  const login = loginInp.value
  const pass = passwordInp.value
  const passConf = passwordConfInp.value

  let error = ''

  if (login.length < 5 || login.length > 20) error = 'Логин должен быть от 5 до 20 символов'
  else if (pass.length < 8 || pass.length > 32) error = 'Пароль должен быть от 8 до 32 символов'
  else if (pass != passConf) error = 'Пароли не совпадают'

  if (error) M.toast({html: error})
  else {
    fetch('/api/reg', {
      method: "POST",
      body: JSON.stringify({login, pass})
    }).then(resp => resp.json()).then(data => {
      if (data.message) {
        M.toast({html: data.message})
      } else {
        M.toast({html: 'Вы были зарегистрированы!'})
        setTimeout(() => location.href = '/', 1500)
      }
    })
  }
}