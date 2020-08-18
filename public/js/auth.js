sendBtn.onclick = () => {
  const login = loginInp.value
  const pass = passwordInp.value

  fetch('/api/auth', {
    method: "POST",
    body: JSON.stringify({login, pass})
  }).then(resp => resp.json()).then(data => {
    M.toast({html: data.message})
    if (data.success) setTimeout(() => location.href = '/', 1500)
  })
}