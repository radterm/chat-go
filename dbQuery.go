package main

import (
	"context"
	"go.mongodb.org/mongo-driver/bson"
	"log"
	"time"
)

type User struct {
	Name     string
	Password string
}

// Query for new user sign up
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

// Query for user log in
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

// Query to find firends of the logged in user
// For now, everyone is everyone's friend on the network. So it is a query to find all users on the network.
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
