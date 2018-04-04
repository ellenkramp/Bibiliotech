"Use strict";
let method = 'newBook';
const url = `${window.location.origin}/api/` + method;
const address = 'https://www.googleapis.com/books/v1/volumes?q=';
const key = '&key=AIzaSyAqMcQj6rxs6dXYzTytATx9lz558CHvKCc';
let container = document.getElementById('results');
const token = window.localStorage.getItem('token');

(function loadButtons() {
    let libraryButton = document.getElementById("libraryButton");
    let myLibrary = document.getElementById("library");
    let userAdd = document.getElementById("userAdd");
    let home = document.getElementById("accountHome");
    let bookSearch = document.getElementById("bookSearch");
    libraryButton.addEventListener("click", () => {
        myLibrary.classList.remove("hidden");
    });
    userAdd.addEventListener("click", () => {
        bookSearch.classList.remove("hidden");
    });
    home.addEventListener("click", () => {
        window.location.href = "/user.html";
    });
})

(function loadPage() {
    let header = document.querySelector('h1');
    let url = `${window.location.origin}/api/users`;
    let username = "Terry";
    fetch(url, {
        method: "GET",
        headers: new Headers({
            authorization: token
        })
    })
        .catch(error => console.error("Error:", error))
        .then(response => {
            console.log("Success:", JSON.stringify(response));
        }); //local host and then call to users with an authorization header
    header.textContent = `Welcome to Your Library, ${username}!`;
}());

let query = async (parameters) => {
    let request = address + parameters + key;
    let response = await (fetch(request)
        .then(res => {
            return res.json()
        })
        .catch(err => {
            console.log('Error: ', err);
        })
    )
    console.log(response);
    let results = response.items;
    populate(results, container);
}

let getBookData = (volume) => {
    let thumbnailSrc;
    let defaultImg = 'http://nobacks.com/wp-content/uploads/2014/11/Book-2.png';
    thumbnailSrc = volume["imageLinks"].smallThumbnail;
    console.log(thumbnailSrc);
    if (thumbnailSrc == false) {
        thumbnailSrc = defaultImg;
    }
    let identifiers = volume.industryIdentifiers;
    console.log(identifiers);
    let isbn;
    if (identifiers) {
        for (var i=0; i<identifiers.length; i++) {
            if (identifiers[i].type === "ISBN_13") {
                isbn = identifiers[i].identifier;
            }
            else if (identifiers[i].type === "ISBN_10") {
                isbn = identifiers[i].identifier;
            }
            else {
                isbn = "none";
            }
        }
    };

    let bookData = {
        title: volume.title,
        author: volume.authors,
        thumbnail: thumbnailSrc,
        publishedDate: volume.publishedDate,
        ISBN: isbn
    };
    console.log(bookData);
    return bookData;
};

let populate = (results, container) => {
    if (results) {
        for (var i=0; i<results.length; i++) {
            let volume = results[i].volumeInfo;
            let bookData = getBookData(volume);
            let volumeContainer = document.createElement('container');
            let li = document.createElement('li');
            let liAuthor = document.createElement('li');
            let img = document.createElement('img');
            let button = document.createElement('button');
            button.setAttribute('value', 'addBook');
            button.setAttribute('id', i);
            console.log(i);
            button.textContent = 'Add Book';
            img.setAttribute('width', '100px');
            if (bookData.thumbnail) {
                img.setAttribute('src', bookData.thumbnail);
            } else {
                img.setAttribute('src', defaultImg);
            }
            li.textContent = bookData.title;
            liAuthor.textContent = "Author: " + bookData.author;
            volumeContainer.appendChild(li);
            volumeContainer.appendChild(liAuthor);
            volumeContainer.appendChild(img);
            volumeContainer.appendChild(button);
            container.appendChild(volumeContainer);
            clickToAddBook(button, bookData);
            let newBook = document.querySelector('#newBook');
            newBook.classList.remove('visibility');
            console.log(bookData);
    }
} else {
    container.textContent = "Request not found. Please try again."
}

}

let addNewBook = (title, author, isbn) => {
    let createButton = document.querySelector("#createBook");
    createButton.addEventListener("click", )
}

let autoFill = (title, author, isbn) => {
    let newAuthor = document.querySelector('#newAuthor');
    let newTitle = document.querySelector('#newTitle');
    let newISBN = document.querySelector('#newISBN');
    newAuthor.setAttribute("value", author);
    newTitle.setAttribute("value", title);
    newISBN.setAttribute("value", isbn);
}

let clickToAddBook = (addButton, bookData) => {
    addButton.addEventListener("click", async () => {
        console.trace('trace');
        let buttonId = addButton.id;
        let myHeaders = new Headers();
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(bookData),
            headers: new Headers({
                authorization: token
            })
        })
        .catch(error => console.error('Error:', error))
        .then(response => console.log('Sucess:', response));
        addButton.classList.add("added");
        addButton.textContent="Added!";
    });
}

let replaceSpaces = (string) => {
    let newString = string.replace(/ /g, "+");
    return newString;
}

let searchFunction = () => {
    let searchButton = document.querySelector('[name = search]');
    searchButton.addEventListener('click', () => {
        let form = document.getElementById('search');
        let title = document.getElementById('intitle:');
        let author = document.getElementById('inauthor:');
        let isbn = document.getElementById('isbn:');
        let titleValue = title.value.toString();
        let authorValue = author.value.toString();
        let isbnValue = isbn.value.toString();
        let parameters = 'intitle:'+ replaceSpaces(titleValue)
                + '&inauthor:' + replaceSpaces(authorValue)
                + '&isbn:' + replaceSpaces(isbnValue);
        console.log(parameters);
        query(parameters);
        autoFill(titleValue, authorValue, isbnValue);
        form.reset();
        let container = document.getElementById('results');
        while (container.lastChild) {
            container.removeChild(container.lastChild)
        };
    });

}
searchFunction();
