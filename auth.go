package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"

	"context"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/google/go-querystring/query"
	"github.com/joho/godotenv"
)

// of course this should not be in code
var tokenSecret = []byte("itachironnysecret")

func (a *AuthApp) isPresent(u User) bool {
	var user User
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	err := a.collection.FindOne(ctx, bson.M{"Name": u.Name}).Decode(&user)
	if err != nil {
		log.Fatal("Could not find user %s: %v", u.Name, err)
		return false
	}
	if u.Name == user.Name && u.Password == user.Password {
		return true
	}
	return false
}

type AuthApp struct {
	client     *mongo.Client
	collection *mongo.Collection
}

func GetNewAuthApp() *AuthApp {
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)

	if err := godotenv.Load(".env"); err != nil {
		log.Fatal(err)
	}

	dbUrl := os.Getenv("MONGO_URL")
	cert := os.Getenv("CERT_LOC")
	log.Println("Got dbUrl", dbUrl)
	log.Println("Got cert", cert)

	params := struct {
		AuthSource            string `url:"authSource"`
		AuthMechanism         string `url:"authMechanism"`
		RetryWrites           bool   `url:"retryWrites"`
		W                     string `url:"w"`
		TlsCertificateKeyFile string `url:"tlsCertificateKeyFile"`
	}{"$external", "MONGODB-X509", true, "majority", cert}
	v, _ := query.Values(params)
	paramString := v.Encode()
	log.Println("Using params url", paramString)

	uri := fmt.Sprintf("%s?%s", dbUrl, paramString)
	serverAPIOptions := options.ServerAPI(options.ServerAPIVersion1)
	clientOptions := options.Client().
		ApplyURI(uri).
		SetServerAPIOptions(serverAPIOptions)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		panic(err)
	}

	collection := client.Database("chat_go").Collection("user_auth")
	return &AuthApp{client: client, collection: collection}
}

type User struct {
	Name     string
	Password string
}

func (a *AuthApp) Close() error {
	// ctx := context.TODO()
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	return a.client.Disconnect(ctx)
}

func (a *AuthApp) Login(c *fiber.Ctx) error {
	var user User
	user.Name = c.FormValue("name")
	user.Password = c.FormValue("password")
	log.Println("Got user %s", user.Name)
	if !a.isPresent(user) {
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

	log.Println("%s logged in successfully!", user.Name)
	return c.JSON(fiber.Map{"token": t})
}
