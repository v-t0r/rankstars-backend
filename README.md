# RankStars API  
_The RESTful API behind [RankStars](https://github.com/v-t0r/rankstars-frontend)._

This backend powers **RankStars**, handling user authentication, reviews, lists, likes, comments, and more.

👉 API documentation available [here](https://rankstars-backend.onrender.com/api/api-docs).

👉 You can check the Frontend repository [here](https://github.com/v-t0r/rankstars-frontend).

## 🛠️ Tech Stack

- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT & BCrypt** - for user authentication
- **Multer** - for handling image uploads
- **AWS S3** - for image hosting and storage

## 📁 Project Structure (simplified)
```
project 
│
│───controllers/
│
│───models/
│  
│───routes/   
│   
│───util/  
```

## ✨ Features

  - User signup/login with hashed passwords  
  - JWT-based authentication using HTTP-only cookies  
  - Create, update, delete, retrieve, like and comment reviews
  - Create, update, delete and retrieve lists
  - Create, update, delete and retrive user profiles.
  - Create, update, delete, reply and vote comments.   

## 🧠 What I Learned

This project helped me solidify my backend development skills, specially in:

- Designing and building **RESTful APIs** using Express  
- Implementing secure **authentication flows** with JWT and HTTP-only cookies  
- Handling image uploads with **Multer** and storing them using **AWS S3**  
- Create models and store and retrieve documents with **Mongoose**
- Applying **input validation and sanitization** with **Express Validator**
- Organizing a scalable codebase following the **MVC (Model-View-Controller)** pattern    


## 📬 Contact

- **GitHub**: [github.com/v-t0r](https://github.com/v-t0r)  
- **LinkedIn**: [linkedin.com/in/vitor-b-05bba2124](https://www.linkedin.com/in/vitor-b-05bba2124/)  
- **Email**: [vitorlemes.com@hotmail.com](mailto:vitorlemes.com@hotmail.com)
