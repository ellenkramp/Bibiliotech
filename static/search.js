"Use strict";
const url = 'localhost:3000/api/' + method;
const address = 'https://www.googleapis.com/books/v1/volumes?q=';
const key = '&key=AIzaSyAqMcQj6rxs6dXYzTytATx9lz558CHvKCc';
let container = document.getElementById('results');

(function loadPage() {
    let header = document.querySelector('h1');
    let name; //local host and then call to users with an authorization header
    let userWelcome = document.createElement('h1');
    userWelcome.textContent = `Welcome to Your Library, ${name}!`;
    header.appendChild(userWelcome);
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
    let bookDataList = [];
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
            bookDataList.push(bookData);
            clickToAddBook(button, bookDataList);
    }
} else {
    container.textContent = "Request not found. Please try again."
}
  console.log(bookDataList);
}

let clickToAddBook = async (addButton, bookDataList) => {
    addButton.addEventListener('click', () => {
        let buttonId = addButton.id;
        let thisBooksData = bookDataList[buttonId];
        console.log(thisBooksData);
        fetch(url, {
            method: 'POST',
            body: JSON.stringify(thisBooksData),
            headers: new Headers({
                'Content-Type': 'application/json',
                Authorization: Basic token
            })
        }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then(response => console.log('Sucess:', response));
    });
}

let searchFunction = () => {
    let searchButton = document.querySelector('[name = search]');
    searchButton.addEventListener('click', () => {
        let form = document.getElementById('search');
        let title = document.getElementById('intitle:');
        let author = document.getElementById('inauthor:');
        let isbn = document.getElementById('isbn:');
        let parameters = 'intitle:'+title.value.toString() + 'inauthor:' + author.value.toString() 
            + 'isbn:' + isbn.value.toString();
        console.log(parameters);
        query(parameters);
        form.reset();
        let container = document.getElementById('results');
        while (container.lastChild) { 
            container.removeChild(container.lastChild) 
        };
    });

}
searchFunction();