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

var (
	usernameFieldId = "name"
	// passwordFieldId = "password"
)

func (a *AuthApp) isNewUser(ctx context.Context, u User) (bool, error) {
	filter := bson.D{{Key: usernameFieldId, Value: u.Name}}
	count, err := a.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	if count > 0 {
		return false, nil
	}
	return true, nil
}

func (a *AuthApp) isPresent(u User) bool {
	var user User
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	filter := bson.D{{Key: usernameFieldId, Value: u.Name}}
	err := a.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		log.Println("Could not find user", u.Name, " : ", err)
		return false
	}
	if u.Password == user.Password {
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

func (a *AuthApp) SignUp(c *fiber.Ctx) error {
	var user User
	user.Name = c.FormValue("name")
	user.Password = c.FormValue("password")
	log.Println("Got user ", user.Name)
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	if unregistered, err := a.isNewUser(ctx, user); err != nil {
		log.Println("User ", user.Name, " not verified due to Database issue: ", err)
		return c.SendStatus(fiber.StatusInternalServerError)
	} else if !unregistered {
		log.Println("User ", user.Name, " already exists")
		return c.SendStatus(fiber.StatusConflict)
	}

	id, insertErr := a.collection.InsertOne(ctx, user)
	if insertErr != nil {
		log.Println("User ", user.Name, " not created due to Database issue: ", insertErr)
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	log.Println("User ", user.Name, " created with id ", id)

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

	log.Println(user.Name, " logged in successfully!")
	return c.JSON(fiber.Map{"token": t})
}

func (a *AuthApp) findFriends(ctx context.Context, name string) ([]string, error) {
	filter := bson.M{}
	cursor, err := a.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	var friends []string
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var friend User
		if err = cursor.Decode(&friend); err != nil {
			return nil, err
		}
		if friend.Name == name {
			continue
		}
		friends = append(friends, friend.Name)
		log.Println("Found friend ", friend.Name)
	}
	return friends, nil
}

func (a *AuthApp) GetFriendsWithToken(c *fiber.Ctx) error {
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	name := claims["name"].(string)
	log.Println("Trying to find friends of ", name)
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	friends, err := a.findFriends(ctx, name)
	if err != nil {
		log.Println("Error while getting friends for ", name, " : ", err)
		return err
	}
	return c.JSON(fiber.Map{"friends": friends})
}
