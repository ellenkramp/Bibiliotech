const LoginUrl = `${window.location.origin}/api/login`;
const regURL = `${window.location.origin}/api/register`;
const userPage = 
let token = "";
let logIn = () => {
    let userName = document.getElementById("username");
    let passWord = document.getElementById("password");
    let userNameValue = userName.value;
    let passWordValue = passWord.value;
    let logInObject = {username: userNameValue,
                        password: passWordValue};
    fetch(LoginUrl, {
        method: "POST",
        body: JSON.stringify(logInObject),
    })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(response => {
            localStorage.setItem("token", response.toString);
            console.log("Success:", response.toString);
        });
            
};

let regUser = () => {
    let newName = document.getElementById("regusername")
    let newPass = document.getElementById("regpassword")
    let newNameValue = newName.value;
    let newPassValue = newPass.value;
    let regObject = {
        username: newNameValue,
        password: newPassValue};
    fetch(regURL, {
        method: "POST",
        body: JSON.stringify(regObject),

    })
    .then(res => res.json())
    .catch(error => console.error ("Error:", error))
    .then(response => {
        localStorage.setItem("token", response.toString);
        console.log("Registered", response.toString)
    });

(function loadPage() {
    let loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        logIn(event);
    });
function submitReg() {
    let regForm = document.getElementByID("regbutton");
    regform.addEventListener("submit", (event) => {
        event.preventDefault();
        regUser(event);
    })
}
})()
