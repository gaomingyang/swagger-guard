import React, { useEffect, useState } from "react";
import axios from "axios";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

function App() {
    const [token, setToken] = useState(localStorage.getItem("jwt_token"));
    const [userEmail, setUserEmail] = useState(null);
    const [swaggerUrl, setSwaggerUrl] = useState("http://localhost:8000/swagger.json");
    const [swaggerKey, setSwaggerKey] = useState(Date.now());

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("token")) {
            const receivedToken = urlParams.get("token");
            localStorage.setItem("jwt_token", receivedToken);
            setToken(receivedToken);
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    useEffect(() => {
        if (token) {
            // Fetch user info when token is available
            axios.get("http://localhost:8000/user", {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => {
                setUserEmail(response.data.email);
            })
            .catch(error => {
                console.error("Failed to fetch user info:", error);
            });
        } else {
            setUserEmail(null);
        }
    }, [token]);

    const handleLogin = () => {
        window.location.href = "http://127.0.0.1:8000/auth/github";
    };

    const handleLogout = () => {
        localStorage.removeItem("jwt_token");
        setToken(null);
    };

    const accessProtectedRoute = () => {
        axios.get("http://localhost:8000/secure", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(response => alert(response.data.message))
          .catch(error => alert("Access Denied"));
    };

    const handleUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        axios.post("http://localhost:8000/upload", formData, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => {
            alert("Upload successful");
            setSwaggerUrl(`http://localhost:8000/swagger.json?v=${Date.now()}`);
            setSwaggerKey(Date.now());
        })
        .catch(error => {
            alert("Upload failed: " + error.response.data.message);
        });
    };

    return (
        <div>
            <h2>Swagger API Documentation</h2>

            {token && userEmail && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    {userEmail}
                </div>
            )}

           
            {!token ? (
                <button onClick={handleLogin}>Login with GitHub</button>
            ) : (
                <div>
                    <button onClick={handleLogout}>Logout</button>
                    <button onClick={accessProtectedRoute}>Access Secure Route</button>

                    {/* File Upload Section */}
                    <div>
                        <h3>Upload API JSON</h3>
                        <input type="file" onChange={handleUpload} />
                    </div>

                    {/* Updated Swagger UI with key prop */}
                    <SwaggerUI 
                        url={swaggerUrl} 
                        key={swaggerKey}
                    />

                </div>
            )}
        </div>
    );
}

export default App;
