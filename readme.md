Bibliotech is a program allowing users to manage large collections of books.

Server api:

Create new user:
  Method:Post
  URL:/api/register 
  Payload:{"username":username,
           "password":password}
  Return Value: json web token vaild for 7days
  
Login a user:
  Method:Post
  URL:/api/login 
  Payload:{"username":username,
           "password":password}
  Return Value: json web token vaild for 7days
  
  
 Create new book entry for user:
    Method:Post
    Authorization header:json web token
    URL:/api/newBook
    Payload:book object
    Return value:Id of the book
    
 Look up user information:
    Method:Get
    Authorization header:json web token
    URL:/api/user
    Return value: an object containing the username of the logged in user, and an array of all owned books
    
 
           
