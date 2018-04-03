const LoginUrl = "localhost:3000/api/login";
let token = "b6489e33f8584e82a3019157e6cea2ac5bad10633b209745a0da34887477aa317a210375f9c91e7736220d165c562a52248018116d2b78ca640a2279";
let logIn = () => {
    let userName = document.getElementById("username");
    let passWord = document.getElementById("password");
    let userNameValue = userName.value;
    let passWordValue = passWord.value;
    let logInObject = {userNameValue: passWordValue};
    fetch(LoginUrl, {
        method: "POST",
        body: JSON.stringify(logInObject),
        headers: new Headers({
            Authorization: token
        })
    })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(response => console.log("Sucess:", response));
};

(function loadPage() {
    let loginButton = document.getElementById("loginButton");
    loginButton.addEventListener("click", logIn());
}());
