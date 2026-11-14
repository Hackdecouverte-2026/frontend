const ENDPOINT_ADDRESS = "http://localhost:8000/dev"

const Iframe = document.getElementById("mainIframe")

const Paths = document.getElementById("paths")

const NavList = document.getElementById("nav-list")
const NavUser = document.getElementById("nav-user")

let isLogged = false

function setCookie(cname, cvalue) {
    document.cookie = cname + "=" + cvalue + ";";
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}


function loadPage(source) {
    Iframe.src = "/src/pages/"+source+".html"

    if (isLogged) {
        Paths.style.display = "flex"
    }
}

function init() {
    loadPage("login")
}

window.addEventListener('message',function(event) {
    isLogged = true
    loadPage("home")
    // $.post(ENDPOINT_ADDRESS+"/auth",JSON.parse(event.data),
    // function(data, status){
    //     console.log("Data: " + data + "\nStatus: " + status)
    //     let jsonResponse = JSON.parse(data)
    //     if (jsonResponse.data && jsonResponse.data.token) {
    //         isLogged = true
    //         setCookie("sessionToken",jsonResponse.data.token,1)
    //         loadPage("home")
    //     }
    // })
})

init()