import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
    const [token, setToken] = useState(localStorage.getItem("jwt_token"));

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("token")) {
            const receivedToken = urlParams.get("token");
            localStorage.setItem("jwt_token", receivedToken);
            setToken(receivedToken);
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

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
