
CREATE TABLE users(
    id UUID PRIMARY KEY,
    username TEXT NOT NUll,
    password BYTEA NOT NULL
);

CREATE TABLE books(
    isbn VARCHAR(13),
    asin VARCHAR(10),
    title TEXT NOT NULL,
    author TEXT,
    publicationDate DATE,
    thumbnail VARCHAR(2000),
    cover VARCHAR(2000),
    publisher TEXT,
    format TEXT,
    id UUID PRIMARY KEY
);

CREATE TABLE library(
    id UUID PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE user_books(
    book_id UUID NOT NULL REFERENCES books (id) ,
    owner UUID REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    avaible_to_lend BOOLEAN NOT NULL
);

CREATE TABLE borrowed_books(
    book_id UUID REFERENCES books (id) ON DELETE CASCADE NOT NULL,
    borrower_id UUID REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    returnDate DATE,
    owner_id UUID REFERENCES users (id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE friendShip(
    user1 UUID REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    user2 UUID REFERENCES users (id) ON DELETE CASCADE NOT NULL
);



CREATE TABLE library_users(
    library_id UUID REFERENCES library (id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users (id)  ON DELETE CASCADE NOT NULL
);

CREATE TABLE library_books(
    library_id UUID REFERENCES library (id) ON DELETE CASCADE NOT NULL,
    book_id UUID REFERENCES books (id) ON DELETE CASCADE NOT NULL
);


CREATE TABLE editions(
    id UUID PRIMARY KEY,
    digital UUID REFERENCES books (id),
    paperback UUID REFERENCES books (id),
    hardcover UUID REFERENCES books (id)
);

-- INSERT INTO users (id, username, password)
-- VALUES ('9c2fb1ae-5a96-42a6-be93-88771a478eba','terry',
--     '$argon2id$v=19$m=262144,t=3,p=1$xwQjLVoXqjFctJm5KC7Vpg$nM9H0y1PyilFJu7uKkgT8FO8xP2g46ZxyO/LlMp5dMY\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'
-- );
