"Use strict";
const address = 'https://www.googleapis.com/books/v1/volumes?q=';
const key = '&key=AIzaSyAqMcQj6rxs6dXYzTytATx9lz558CHvKCc';
let query = async (searchterms) => {
    let searchBy = document.querySelector('[name=searchBy]');
    let parameters = searchBy.options[searchBy.selectedIndex].value;
    let request = address + parameters + searchterms + key;
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
    populate(results);
}

let getBookData = (volume) => {
    let thumbnailSrc;
    let defaultImg = 'http://nobacks.com/wp-content/uploads/2014/11/Book-2.png';
    thumbnailSrc = volume["imageLinks"].smallThumbnail
        // thumbnailSrc = JSON.stringify(volume.imageLinks.smallThumbnail);
        
    console.log(thumbnailSrc);
    if (thumbnailSrc == false) {
        thumbnailSrc = defaultImg;
    }
    let bookData = {
        title: volume.title,
        author: volume.authors,
        thumbnail: thumbnailSrc,
        publishedDate: volume.publishedDate
    };
    let identifiers = volume.industryIdentifiers;
    console.log(identifiers);
    for (var i=0; i<identifiers.length; i++) {
        if (identifiers[i].type["ISBN_10"]) {
            let asin = identifiers[i].type["ISBN_10"];
            console.log(asin);
        }
        if (identifiers[i].type["ISBN_10"]) {
            let isbn = identifiers[i].type["ISBN_13"];
            console.log(isbn);
        }
    };

    console.log(bookData);
    console.log(identifiers);
    return bookData;
};

let populate = (results) => {
    let container = document.getElementById('results');
    for (var i=0; i<results.length; i++) {
        let volume = results[i].volumeInfo;
        let bookData = getBookData(volume);
        let volumeContainer = document.createElement('container');
        let li = document.createElement('li');
        let img = document.createElement('img');
        let button = document.createElement('button');
        button.setAttribute('value', 'addBook');
        button.innerHTML = 'Add Book';
        img.setAttribute('width', '100px');
        if (bookData.thumbnail) {
            img.setAttribute('src', bookData.thumbnail);
        } else {
            img.setAttribute('src', defaultImg);
        }
        li.textContent = bookData.title;
        volumeContainer.appendChild(li);
        volumeContainer.appendChild(img);
        volumeContainer.appendChild(button);
        container.appendChild(volumeContainer);
  }
}

let clickToAddBook = (addButton) => {
    addButton.addEventListener('click', () => {
        
    });
}

let searchFunction = () => {
    let searchButton = document.querySelector('[name = search]');
    searchButton.addEventListener('click', () => {
        let inputField = document.querySelector('[name = searchInput]');
        let searchterms = inputField.value.toString();
        query(searchterms);
        inputField.value = "";
        let container = document.getElementById('results');
        container.innerHTML="";
    });

}
searchFunction();