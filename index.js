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
    database: "bibliotech",
    user:process.env.USERNAME
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
        let password = body["password"];
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
            resolve(login(request, undefined, body));
        }).catch( (err) => {
            err.statusCode = 501;
            reject(err);
        });
    });
};


let login = async (request,serverResponse, body) => {
    console.log(body);
    if (!body) {
        body = await receiveBody(request);
    }
    let password = body["password"];
    let username =  body["username"];
    console.dir(body);
    let data = await verifyPasword(username, password);
    let response = {};
    let pass = data[0];
    if (pass) {
        let token = await createToken(data[1]);
        response["response"] = token;
        return response;
    }
    else {
        response["statusCode"] = 401;
        response["message"] = "Login Failed";
        throw response;
    }
};
let user = async (request) => {
    let response = {};
    response["response"] = {};
    let loginObject = jwt.verify(request.headers.authorization,
        process.env.JWT_SECRET);
    let userID = loginObject["id"];
    let data = await LDB.one("SELECT username FROM users WHERE id = ${userID}",
        {userID:userID}).catch( () => {
        response["statusCode"] = 404;
        response["message"] = `User: ${userID} not found.`;
        throw response;
    });
    response["response"]["username"] = data["username"];

    let books = await LDB.query("SELECT users.username,"+
    " user_books.available_to_lend, books.isbn, books.asin,"+
    " books.title, books.author, books.publicationDate,"+
    " books.thumbnail, books.cover, books.publisher,"+
    " books.format, books.id AS book_id FROM users"+
" JOIN user_books ON users.id = user_books.owner JOIN books on"+
" user_books.book_id = books.id WHERE users.id = $1",userID).catch( () => {
        response["statusCode"] = 500;
        throw response;
    });
    response["response"]["books"] = books;
    return response;
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
        resolve(LDB.one("SELECT password, id FROM ${table:name}"+
        " WHERE ${comparisonColumn:name} = ${target} ",
        {column:"password",
            table:"users",
            comparisonColumn:"username",
            target:username}).catch( (err) => {
            err.statusCode = 501;
            reject(err);
        }).then( (data) => {
            return [sodium.crypto_pwhash_str_verify(
                Buffer.from(data["password"]),passBuffer),data["id"]];
        }));
    });
};


let createToken  = userId => {
    return new Promise( (resolve) => {
        resolve(jwt.sign({id:userId},
            process.env.JWT_SECRET, {expiresIn:"7d"}));
    });
};
let newBook = (request) => {
    return new Promise( (resolve, reject) => {
        jwt.verify(request.headers.Authorization, process.env.JWT_SECRET,
            (err, userID) => {
                if (err) {
                    reject({statusCode:401,
                        response:"Authentication failed"});
                }
                let receivedData = "";
                let data = {};
                let body;
                request.on("data",(chunk) => {
                    receivedData += chunk;
                });
                request.on("end", () => {
                    try {
                        body = JSON.parse(receivedData);
                    }
                    catch (err) {
                        if (err.name === "SyntaxError") {
                            err.statusCode = 400;
                            err.message = "Invaild JSON received";
                            reject(err);
                        }
                    }
                    body["id"] = uuidv4();
                    LDB.none("INSERT INTO books(isbn, asin, title, author,"+
                     "publicationDate, thumbnail, cover, publisher, id,"+
                     " available_to_lend) values(${ISBN}, ${asin},${title},"+
                     "${author},${publishedDate},${thumbnail}, ${cover},"+
                     " ${publisher}, ${id}, ${availableToLend}), ${body}",body)
                        .then( () => {
                            data["response"] = body["id"];
                            resolve(data);
                        }).catch( (err) => {
                            if (err.code !== 23505){
                                reject({statusCode:500});
                                return;
                            }
                        }).finally( () => {
                            let userBook = { book_id:body["id"],
                                owner_id:userID};

                            LDB.none("INSERT INTO user_books(book_id, owner,"+
                            " available_to_lend) values(${book_id}, ${owner_id}"+
                            ", ${available_to_lend})", userBook);
                        });
                });
            });

    });
};

let server = http.createServer((request, response) => {
    try{
        const router = {"POST":
        {"login":login,
            "register":createAccount,
            "addBook":newBook},
        "GET":
            {"user":user}
        };

        if (request.url === "/"){
            fs.readFile(landingPage, "utf8", (err, data) => {
                response.end(data);
            });
        }

        else if (request.url.startsWith(rootAPIUrl)) {
            let test = request.url.replace(rootAPIUrl, "").replace(/^\/+/g, "")
                .split("/");
                console.log(test);
            let [parameter,query] = test;
            parameter = parameter ? parameter : undefined;
            console.log(query)
            router[request.method][parameter](request, response,query).then(
                (data) => {
                    response.end(JSON.stringify(data["response"]));})
                .catch((error) =>{
                    error.statusCode = error.statusCode ? error.statusCode : 500;
                    console.dir(error);
                    response.statusCode = error.statusCode;
                    response.end(error.message);
                });
        }

        else if (server.authedFiles.includes(
            `${userFacingDirectory}${request.url}`)){
            let dotoffset = request.url.lastIndexOf(".");
            let mimetype = dotoffset == -1
                ? "text/plain"
                : {
                    ".html" : "text/html",
                    ".ico" : "image/x-icon",
                    ".jpg" : "image/jpeg",
                    ".png" : "image/png",
                    ".gif" : "image/gif",
                    ".css" : "text/css",
                    ".js" : "text/javascript"
                }[ request.url.substr(dotoffset) ];
            response.setHeader("Content-type" , mimetype);
            fs.readFile(`${userFacingDirectory}${request.url}`,"utf8",
                (err,data) => {
                    response.end(data);
                });
        }

        else {
            response.statusCode = 404;
            response.end(`Woops ${request.url} doesn't exits.`);
        }
    }
    catch (err) {
        console.trace(err);
        response.statusCode = 500;
        response.end();
    }
});


populateAuthedFiles().then((authedFiles) => {
    server.authedFiles = authedFiles;
    server.listen(3000);
});
