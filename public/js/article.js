function remove(id) {
  fetch('/api/remove', {
    method: "POST",
    body: JSON.stringify({id})
  }).then(resp => resp.json()).then(data => {
    M.toast({html: data.message})
  })
}