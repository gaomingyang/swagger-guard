# Swagger Guard

Swagger Guard is a tool that allows you to guard your API documentation with a login system.Currently, it only supports GitHub OAuth login.

You can now set limit to only allow users with certain suffix email to access the API documentation.


## How to use

1. Clone the repository
```
git clone https://github.com/swagger-guard/swagger-guard.git
```

2.Create .env file in the server folder and add the following:
```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
GITHUB_SCOPES=user:email,read:user
```

3. Install the backend and frontend dependencies
```
cd server
go mod tidy

cd ../swagger-ui
npm install
```

### Run the project

1.Start the Golang Backend
```
cd server
go run main.go
```

2.Start the React Frontend
```
cd swagger-ui
npm start
```

3.Visit http://localhost:3000 in your browser.

* Click Login with GitHub.
* Upload an API JSON file.
* Swagger UI should display the uploaded API documentation.