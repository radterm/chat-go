This is a simple chat application written in Golang and ReactJs

The frontend and backend servers are run separately

First run the backend server
```sh
go run main.go
```

Then run the front end server
```sh
cd frontend/chat-go
npm start
```

# New Feature
Use JWTs in the backend for all authentication. Check a specific cookie for a valid token for only websocket connections.
The frontend wraps the JWT auth feature.
