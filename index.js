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
    let receivedData = "";
    let body;
    request.on("data", (chunk) => {
        receivedData += chunk;
    });
    request.on("end",() => {
        return new Promise( (resolve, reject) => {
            try {
                body = JSON.parse(receivedData);
            }
            catch (error){
                if (error.name === "SyntaxError"){
                    error.statusCode = 400;
                    error.message = "Invaild JSON received.";
                    reject(error);
                }
            }
            let username = body["username"];
            let password = body["password"];
            let passBuffer = Buffer.from(password);
            let id = uuidv4();
            let hashed = sodium.crypto_pwhash_str(passBuffer,
                sodium.crypto_pwhash_OPSLIMIT_MODERATE,
                sodium.crypto_pwhash_MEMLIMIT_MODERATE);
            let query = pg.as.format("INSERT INTO users(username, password, id)"
            +"VALUES(${username}, ${password}, ${id})"
                , {column:"users",
                    username:username,
                    password:hashed,
                    id:id
                });
            LDB.none(query).then( () => {
                resolve(login(username, password));
            }).catch( (err) => {
                err.statusCode = 501;
                reject(err);
            });
        });
    });
};


let login = (request) => {
    let receivedData = "";
    return new Promise( (resolve, reject) => {
        let body;
        let data = {};
        request.on("data", (chunk) => {
            receivedData += chunk;
        });
        request.on("end",() => {
            try {
                body = JSON.parse(receivedData);
            }
            catch (error){
                if (error.name === "SyntaxError"){
                    error.statusCode = 400;
                    error.message = "Invaild JSON received.";
                    reject(error);
                }
            }
            let password = body["password"];
            let username =  body["username"];
            let passBuffer = Buffer.from(password);
            let query = LDB.one("SELECT password, id FROM ${table:name}"+
            " WHERE ${comparisonColumn:name} = ${target} ",
                {table:"users",
                    comparisonColumn:"username",
                    target:username}).catch( (err) => {
                err.statusCode = 501;
                reject(err);
            });
            query.then( (query) => {
                let pass = sodium.crypto_pwhash_str_verify(
                    Buffer.from(query["password"]),passBuffer);
                if (pass) {
                    data["response"] = jwt.sign(query["id"],
                        process.env.JWT_SECRET, {expiresIn:"7d"});
                    resolve(data);
                }
                else {
                    data["statusCode"] = 401;
                    data["message"] = "Login Failed";
                    reject(data);
                }
            });
        });
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
            "newBook":newBook}
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
            fs.readFile(`${userFacingDirectory}${request.url}`,"utf8",(err,data) => {
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
login("terry","pirate");
populateAuthedFiles().then((authedFiles) => {
    server.authedFiles = authedFiles;
    server.listen(3000);
});
