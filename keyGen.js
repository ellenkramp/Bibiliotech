let crypto = require("crypto");

let fs = require("fs");

crypto.randomBytes(60,(err,buffer) => {
    if (err) {
        throw(err);
    }
    fs.writeFile("newkey.txt",buffer.toString("hex"),(err) => {
        if (err){
            throw(err);
        }
    });
});
