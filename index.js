#! /usr/bin/env node
let sodium = require("sodium").api;

const http = require("http");
const uuidv4 = require("uuid/v4");
const fs = require("fs");
const {promisify} = require("util");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const jwt = require("jsonwebtoken");
require("dotenv").config();

const dbConfig ={
    host:"localhost",
    port:5432,
    database: "biblotech",
    user:"terryp"
};
const pg = require("pg-promise")();
const LDB = pg(dbConfig);


const landingPage = "static/index.html";
const userFacingDirectory = "static";
const rootAPIUrl = "/api";


let populateAuthedFiles = (authedFiles = [],
    startingPath=`${userFacingDirectory}/`) => {
    return new Promise((resolve) => {

        readdir(startingPath).then((readFiles) => {
            let foundINodes = [];
            readFiles.forEach((entry) =>{
                foundINodes.push(
                    stat(startingPath + entry).then((stats) => {
                        if (stats.isFile()){
                            authedFiles.push(startingPath + entry);
                        }
                        else {
                            populateAuthedFiles(authedFiles,
                                startingPath + entry + "/")
                                .then((moreAuthedFiles) =>{
                                    authedFiles = authedFiles.concat(
                                        moreAuthedFiles);
                                });
                        }
                    })
                );
            });
            Promise.all(foundINodes).then( () => {
                resolve(authedFiles);
            });
        });
    });
};


let createAccount = (request) => {
    return new Promise( async (resolve, reject) => {
        let body = await receiveBody(request);
        let username = body["username"];
        let password = body["password"];;
        let passBuffer = Buffer.from(password);
        let id = uuidv4();
        let hashed = sodium.crypto_pwhash_str(passBuffer,
            sodium.crypto_pwhash_OPSLIMIT_MODERATE,
            sodium.crypto_pwhash_MEMLIMIT_MODERATE);
        let query = pg.as.format("INSERT INTO users(username, password, id)"+
        " VALUES(${username}, ${password}, ${id})"
            , {column:"users",
            username:username,
            password:hashed,
            id:id
        });
        LDB.none(query).then( () => {
            resolve(login(request,body));
        }).catch( (err) => {
            err.statusCode = 501;
            reject(err);
        });
    });
};


let login = (request, body) => {
    return new Promise( async (resolve, reject) => {
        if (!body) {
            body = await receiveBody(request);
        }
        let password = body["password"];
        let username =  body["username"];
        verifyPasword(username, password).then( (data) => {
            let response = {};
            let pass = data[0];
            if (pass) {
                createToken(data[1]).then( (token) => {
                    response["response"] = token;
                    resolve(response);
                });
            }
            else {
                response["statusCode"] = 401;
                response["message"] = "Login Failed";
                reject(response);
            }
        });
    });
};
let user = (request) => {
    return new Promise( (resolve, reject) => {
        let response = {};
        response["response"] = {};
        jwt.verify(request.headers.Authorization, process.env.JWT_SECRET,
            (err, loginObject) => {
                let userID = loginObject["id"];
                if (err) {
                    response["statusCode"] = 401;
                    response["message"] = "Login failed";
                    reject(response);
                }
                else {
                    LDB.query("SELECT username FROM users WHERE id = userID")
                        .then( (data) => {
                            response["response"]["username"] = data["username"];
                        }).catch( () => {
                            response["statusCode"] = 404;
                            response["message"] = `User: ${userID} not found.`;
                        });
                    LDB.query("SELECT users.username, user_books.avaible_to_lend,"+
                " books.isbn, books.asin, books.title, books.author,"+
                " books.publicationDate, books.thumbnail, books.cover,"+
                " books.publisher, books.format, books.id AS book_id FROM users"+
                " JOIN user_books ON users.id = user_books.owner JOIN books on"+
                " user_books.book_id = books.id WHERE users.id = $1",userID)
                        .then( (data) => {
                            response["response"]["books"] = data;
                        }).catch( () => {
                            response["statusCode"] = 500;
                            reject(response);
                        });
                }
            });
    });
};

let receiveBody = (request) => {
    return new Promise ( (resolve, reject) => {
        let receivedData = "";
        request.on("data", (chunk) => {
            receivedData += chunk;
        });
        request.on("end",() => {
            try {
                resolve(JSON.parse(receivedData));
            }
            catch (error){
                error.statusCode = 400;
                error.message = error;
                reject(error);
            }
        });
    });
};

let verifyPasword = (username, password) => {
    return new Promise ( (resolve, reject) => {
        let passBuffer = Buffer.from(password);
        console.log("Getting user information");
        resolve(LDB.one("SELECT password, id FROM ${table:name}"+
        " WHERE ${comparisonColumn:name} = ${target} ",
        {column:"password",
            table:"users",
            comparisonColumn:"username",
            target:username}).catch( (err) => {
            err.statusCode = 501;
            reject(err);
        }).then( (data) => {
            return [sodium.crypto_pwhash_str_verify(Buffer.from(data["password"]),
                passBuffer),data["id"]];
        }));
    });
};

let createToken  = userId => {
    return new Promise( (resolve) => {
        resolve(jwt.sign({id:userId},
            process.env.JWT_SECRET, {expiresIn:"7d"}));
    });
};

let server = http.createServer((request, response) => {
    console.log(request.method);
    const router = {"POST":
    {"login":login,
        "register":createAccount},
    "GET":
        {"user":user}//,
            //"search":search}
    };

    if (request.url === "/"){
        fs.readFile(landingPage, "utf8", (err, data) => {
            response.end(data);
        });
    }

    else if (request.url.startsWith(rootAPIUrl)) {
        let parameter = request.url.replace(rootAPIUrl, "").replace("/","");
        parameter = parameter ? parameter : undefined;
        router[request.method][parameter](request, response).then(
            (data) => {
                response.end(JSON.stringify(data["response"]));})
            .catch((error) =>{
                response.statusCode = error.statusCode;
                response.end(error.message);
            });
    }

    else if (server.authedFiles.includes(
        `${userFacingDirectory}${request.url}`)){
        fs.readFile(`userFacingFiles${request.url}`,"utf8",(err,data) => {
            response.end(data);
        });
    }

    else {
        response.statusCode = 404;
        response.end(`Woops ${request.url} doesn't exits.`);
    }
});


populateAuthedFiles().then((authedFiles) => {
    server.authedFiles = authedFiles;
    server.listen(3000);
});
