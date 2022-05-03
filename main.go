package main

import (
	"fmt"
	"log"
	"sync"

	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v3"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v4"
)

const (
	tokenCookieId    = "authorization-token"
	usernameLocalsId = "username"
)

type chat struct {
	Name    string `json:"name"`
	Time    string `json:"time"`
	Message string `json:"msg"`
}

var (
	connections = make(map[int]*websocket.Conn)
	id          int
	idLock      sync.Mutex
)

func broadCast(id int, msg chat) {
	log.Println("Going to broadcast", msg)
	for key, c := range connections {
		if key == id {
			continue
		}
		if err := c.WriteJSON(msg); err != nil {
			log.Println("write error:", err)
			break
		}
		log.Println("Broadcasted to", key)
	}
}

func main() {
	id = 0

	app := fiber.New()
	authApp := GetNewAuthApp()
	defer authApp.Close()

	app.Post("/api/v1/token", authApp.Login)

	app.Post("/api/v1/signUp", authApp.SignUp)

	// JWT Middleware with Header = Authorization: Bearer
	app.Use("/api/v1/auth", jwtware.New(jwtware.Config{
		SigningKey: tokenSecret,
	}))

	app.Get("/api/v1/auth/user", getUsernameWithToken)

	// JWT Middleware with Cookie = authorization-token
	app.Use("/api/v1/chat", jwtware.New(jwtware.Config{
		SigningKey:  tokenSecret,
		TokenLookup: "cookie:" + tokenCookieId,
	}))

	app.Use("/api/v1/chat", func(c *fiber.Ctx) error {
		user := c.Locals("user").(*jwt.Token)
		claims := user.Claims.(jwt.MapClaims)
		name := claims["name"].(string)
		c.Locals(usernameLocalsId, name)
		log.Println("Got chat connection from user", name)
		return c.Next()
	})

	app.Get("/api/v1/chat/test", func(c *fiber.Ctx) error {
		name := c.Locals(usernameLocalsId).(string)
		log.Println("Got test chat connection from user", name)
		return c.SendString("Welcome to the test " + name + "!\n")
	})

	app.Use("/api/v1/chat/socket", func(c *fiber.Ctx) error {
		// IsWebSocketUpgrade returns true if the client
		// requested upgrade to the WebSocket protocol.
		log.Println("wesocket-use:  Called")
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			log.Println("wesocket-use:  Upgrade requested")
			return c.Next()
		}
		log.Println("wesocket-use:  Upgrade not requested, error")
		return fiber.ErrUpgradeRequired
	})

	app.Get("/api/v1/chat/socket", websocket.New(handleWebsocketChats))

	errServer := app.Listen("0.0.0.0:8000")
	errAuthAppClose := authApp.Close()
	panic(fmt.Sprintf("Server Closed with:%v and DB closed with:%v", errServer, errAuthAppClose))
}

func handleWebsocketChats(c *websocket.Conn) {
	// c.Locals is added to the *websocket.Conn
	log.Println(c.Locals("allowed"))  // true
	log.Println(c.Params("id"))       // 123
	log.Println(c.Query("v"))         // 1.0
	log.Println(c.Cookies("session")) // ""

	name := c.Locals(usernameLocalsId).(string)
	log.Println("Got socket chat connection from user", name)

	idLock.Lock()
	id += 1
	sessionId := id
	idLock.Unlock()

	connections[sessionId] = c
	log.Println("Got sessionId", sessionId)

	// websocket.Conn bindings https://pkg.go.dev/github.com/fasthttp/websocket?tab=doc#pkg-index
	var (
		err     error
		chatMsg chat
	)
	for {
		if err = c.ReadJSON(&chatMsg); err != nil {
			log.Println("ReadJSON error:", err)
			break
		}
		if name != chatMsg.Name {
			log.Println("Got message from %s impersonating %s", name, chatMsg.Name)
		}
		go broadCast(sessionId, chatMsg)
	}
	delete(connections, sessionId)
}

func getUsernameWithToken(c *fiber.Ctx) error {
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	name := claims["name"].(string)
	return c.SendString(name)
}
