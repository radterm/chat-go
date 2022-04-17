package main

import (
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
)

// of course this should not be in code
var tokenSecret = []byte("itachironnysecret")

// and neither this
var db = []User{
	{Name: "Naruto", Password: "ramen"},
	{Name: "Luffy", Password: "meat"},
	{Name: "Steven", Password: "with-a-v"},
	{Name: "Kamaboko", Password: "gonpachiro"},
}

func isPresent(u User) bool {
	for _, user := range db {
		if u == user {
			return true
		}
	}
	return false
}

type User struct {
	Name     string
	Password string
}

func Login(c *fiber.Ctx) error {
	var user User
	user.Name = c.FormValue("name")
	user.Password = c.FormValue("password")
	log.Println("Got user %s", user.Name)
	if !isPresent(user) {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	// Create the Claims
	claims := jwt.MapClaims{
		"name": user.Name,
		"exp":  time.Now().Add(time.Hour * 72).Unix(),
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate encoded token and send it as response.
	t, err := token.SignedString(tokenSecret)
	if err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	log.Println(fmt.Sprintf("%s logged in successfully!", user.Name))
	return c.JSON(fiber.Map{"token": t})
}
