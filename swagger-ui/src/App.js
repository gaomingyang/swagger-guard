import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
    const [token, setToken] = useState(localStorage.getItem("jwt_token"));
    const [userEmail, setUserEmail] = useState(null);

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

    return (
        <div>
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
            <h2>Swagger API Docs</h2>
            {!token ? (
                <button onClick={handleLogin}>Login with GitHub</button>
            ) : (
                <div>
                    <button onClick={handleLogout}>Logout</button>
                    <button onClick={accessProtectedRoute}>Access Secure Route</button>
                </div>
            )}
        </div>
    );
}

export default App;
