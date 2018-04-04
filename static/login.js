const LoginUrl = `${window.location.origin}/api/login`;
const regURL = `${window.location.origin}/api/register`;
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

(function loadPage() {
    let loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        logIn(event);
    });
})();