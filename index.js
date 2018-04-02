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


let createAccount = (username, password) => {
    return new Promise( (resolve, reject) => {
        let passBuffer = Buffer.from(password);
        let id = uuidv4();
        let hashed = sodium.crypto_pwhash_str(passBuffer,
            sodium.crypto_pwhash_OPSLIMIT_MODERATE,
            sodium.crypto_pwhash_MEMLIMIT_MODERATE);
        let query = pg.as.format("INSERT INTO users(username, password, id) VALUES(${username}, ${password}, ${id})"
            , {column:"users",
                username:username,
                password:hashed,
                id:id
            });
        LDB.none(query).then( () => {
            resolve(login(username, password));
        }).catch( (err) => {
            reject(err);
        });
    })
};


let login = (username, password) => {
    return new Promise( (resolve, reject) => {
        let passBuffer = Buffer.from(password);
        let query = LDB.one("SELECT ${column:name} FROM ${table:name} WHERE ${comparisonColumn:name} = ${target} ",
            {column:"password",
                table:"users",
                comparisonColumn:"username",
                target:username}).catch( (err) => {
            reject(err);
        });
        query.then( (query) => {
            let pass = sodium.crypto_pwhash_str_verify(Buffer.from(query["password"]),passBuffer);
            if (pass) {
                resolve(jwt.sign(username, process.env.JWT_SECRET,
                    {expiresIn:"7d"}
                ));
            }
        });
    });
};



let server = http.createServer((request, response) => {
    const router = {};

    if (request.url === "/"){
        fs.readFile(landingPage, "utf8", (err, data) => {
            response.end(data);
        });
    }

    else if (request.url.startsWith(rootAPIUrl)) {
        let parameter = request.url.replace(rootAPIUrl, "").replace("/","");
        parameter = parameter ? parameter : undefined;
        router[request.method](parameter, request, response).then(
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
