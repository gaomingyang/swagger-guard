package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
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

	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	redirectURI := os.Getenv("GITHUB_REDIRECT_URI")

	if clientID == "" || clientSecret == "" || redirectURI == "" {
		log.Fatal("Missing required GitHub OAuth environment variables")
	}

	oauthConfig = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURI,
		Endpoint:     github.Endpoint,
		Scopes:       []string{"user:email"},
	}

	jwtSecret = os.Getenv("JWT_SECRET")
	allowedDomain = os.Getenv("ALLOWED_DOMAIN")

	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll("./uploads", 0755); err != nil {
		log.Fatal("Error creating uploads directory:", err)
	}
}

func main() {
	router := gin.Default()

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Public routes
	router.GET("/swagger.yaml", serveSwaggerFile)
	router.GET("/auth/github", githubLogin)
	router.GET("/auth/github/callback", githubCallback)
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// Protected routes group
	authorized := router.Group("/")
	authorized.Use(authMiddleware())
	{
		authorized.GET("/secure", secureRoute)
		authorized.GET("/user", getUserInfo)
		authorized.POST("/upload", uploadSwagger)
	}

	router.Run(":8000")
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

	// 添加调试日志
	log.Printf("OAuth Config: %+v\n", oauthConfig)
	log.Printf("Generated OAuth URL: %s\n", url)

	c.Redirect(http.StatusFound, url)
}

// GitHub OAuth Callback
func githubCallback(c *gin.Context) {
	code := c.Query("code")

	token, err := oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.Redirect(http.StatusFound, os.Getenv("FRONTEND_URL")+"/login-error?message="+url.QueryEscape("OAuth exchange failed"))
		return
	}

	client := oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://api.github.com/user/emails")
	if err != nil {
		c.Redirect(http.StatusFound, os.Getenv("FRONTEND_URL")+"/login-error?message="+url.QueryEscape("Failed to get email"))
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
		errorMsg := "Access restricted to @" + allowedDomain + " users"
		c.Redirect(http.StatusFound, os.Getenv("FRONTEND_URL")+"/login-error?message="+url.QueryEscape(errorMsg))
		return
	}

	// Generate JWT Token
	jwtToken := generateJWT(userEmail)

	// Redirect to frontend with token
	c.Redirect(http.StatusFound, os.Getenv("FRONTEND_URL")+"/login-success?token="+jwtToken)
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

// User Info Route
func getUserInfo(c *gin.Context) {
	email, _ := c.Get("email")
	c.JSON(http.StatusOK, gin.H{"email": email})
}

// After the getUserInfo function and before main(), add this new function:
func uploadSwagger(c *gin.Context) {
	// Get the file from the request
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No file uploaded"})
		return
	}

	// Ensure uploads directory exists
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create uploads directory"})
		return
	}

	swaggerPath := filepath.Join(uploadsDir, "swagger.yaml")

	// Check if swagger.yaml exists
	if _, err := os.Stat(swaggerPath); err == nil {
		// Create backup with timestamp
		timestamp := time.Now().Format("20060102150405")
		backupPath := filepath.Join(uploadsDir, "swagger_"+timestamp+".yaml")
		if err = os.Rename(swaggerPath, backupPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to backup existing file: " + err.Error()})
			return
		}
	}

	// Save the new file as swagger.yaml
	if err := c.SaveUploadedFile(file, swaggerPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save file: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File uploaded successfully"})
}

// Add this new function after uploadSwagger
func serveSwaggerFile(c *gin.Context) {
	// Set cache control headers to prevent caching
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	// Serve the file
	c.File("./uploads/swagger.yaml")
}
