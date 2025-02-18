package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

var (
	oauthConfig   *oauth2.Config
	jwtSecret     string
	allowedDomain string
)

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	oauthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
		RedirectURL:  "http://127.0.0.1:8000/auth/github/callback",
		Endpoint:     github.Endpoint,
		Scopes:       []string{"user:email"},
	}

	jwtSecret = os.Getenv("JWT_SECRET")
	allowedDomain = os.Getenv("ALLOWED_DOMAIN")
}

// Generate a random state for OAuth
func generateState() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		log.Fatal(err)
	}
	return base64.URLEncoding.EncodeToString(b)
}

// GitHub OAuth Login Handler
func githubLogin(c *gin.Context) {
	state := generateState()
	url := oauthConfig.AuthCodeURL(state)
	c.Redirect(http.StatusFound, url)
}

// GitHub OAuth Callback
func githubCallback(c *gin.Context) {
	code := c.Query("code")

	token, err := oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OAuth exchange failed"})
		return
	}

	client := oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://api.github.com/user/emails")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get email"})
		return
	}
	defer resp.Body.Close()

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	json.NewDecoder(resp.Body).Decode(&emails)

	var userEmail string
	for _, email := range emails {
		if email.Primary && email.Verified {
			userEmail = email.Email
			break
		}
	}

	if userEmail == "" || !strings.HasSuffix(userEmail, "@"+allowedDomain) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access restricted to uniuni.com users"})
		return
	}

	// Generate JWT Token
	jwtToken := generateJWT(userEmail)

	// Redirect to frontend with token
	c.Redirect(http.StatusFound, "http://127.0.0.1:3000/login-success?token="+jwtToken)
}

// Generate JWT Token
func generateJWT(email string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": email,
		"exp":   time.Now().Add(time.Hour).Unix(),
	})

	tokenString, _ := token.SignedString([]byte(jwtSecret))
	return tokenString
}

// Middleware to validate JWT
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No token provided"})
			c.Abort()
			return
		}

		tokenString := strings.Split(authHeader, "Bearer ")[1]
		claims := jwt.MapClaims{}
		_, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("email", claims["email"])
		c.Next()
	}
}

// Protected API Route Example
func secureRoute(c *gin.Context) {
	email, _ := c.Get("email")
	c.JSON(http.StatusOK, gin.H{"message": "Welcome!", "email": email})
}

func main() {
	router := gin.Default()

	router.GET("/auth/github", githubLogin)
	router.GET("/auth/github/callback", githubCallback)
	router.GET("/secure", authMiddleware(), secureRoute)

	router.Run(":8000")
}
