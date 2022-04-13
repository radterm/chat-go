package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gofiber/fiber"
	"github.com/gofiber/websocket"
)

type chat struct {
	Name    string `json:"name"`
	Time    string `json:"time"`
	Message string `json:"msg"`
}

var connections = make(map[int]*websocket.Conn)

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
	test_struct()
	id := 0
	var idLock sync.Mutex

	app := fiber.New()

	app.Use(func(c *fiber.Ctx) {
		// IsWebSocketUpgrade returns true if the client
		// requested upgrade to the WebSocket protocol.
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			c.Next()
		}
	})

	app.Get("/api/v1", websocket.New(func(c *websocket.Conn) {
		// c.Locals is added to the *websocket.Conn
		log.Println(c.Locals("allowed"))  // true
		log.Println(c.Params("id"))       // 123
		log.Println(c.Query("v"))         // 1.0
		log.Println(c.Cookies("session")) // ""

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
			go broadCast(sessionId, chatMsg)
		}
		delete(connections, sessionId)

	}))

	log.Fatal(app.Listen(8000))
}
