import React, { useEffect, useState } from "react";
import axios from "axios";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import SwaggerGenerator from './pages/SwaggerGenerator';

// 创建一个新的组件来包含主要内容
function MainContent() {
    const [token, setToken] = useState(localStorage.getItem("jwt_token"));
    const [userEmail, setUserEmail] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const backendApiUrl = process.env.REACT_APP_BACKEND_API_URL;
    const [swaggerUrl, setSwaggerUrl] = useState(backendApiUrl + "/swagger.yaml");
    const [swaggerKey, setSwaggerKey] = useState(Date.now());
    const [isValidToken, setIsValidToken] = useState(true);
    
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("token")) {
            const receivedToken = urlParams.get("token");
            localStorage.setItem("jwt_token", receivedToken);
            setToken(receivedToken);
            setErrorMessage(null);
            window.history.replaceState({}, document.title, "/");
        } else if (urlParams.has("message")) {
            setErrorMessage(urlParams.get("message"));
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    useEffect(() => {
        if (token) {
            // Fetch user info when token is available
            axios.get(backendApiUrl + "/user", {
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

    useEffect(() => {
        checkToken();
    }, []);

    const checkToken = () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            setIsValidToken(false);
            return;
        }
        
        // 这里可以添加验证token是否过期的逻辑
        try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            if (tokenData.exp && tokenData.exp * 1000 < Date.now()) {
                setIsValidToken(false);
                localStorage.removeItem('jwt_token');
            }
        } catch (error) {
            setIsValidToken(false);
            localStorage.removeItem('jwt_token');
        }
    };

    const handleLogin = () => {
        window.location.href = backendApiUrl + "/auth/github";
    };

    const handleLogout = () => {
        localStorage.removeItem("jwt_token");
        setToken(null);
    };

    const accessProtectedRoute = () => {
        axios.get(backendApiUrl + "/secure", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(response => alert(response.data.message))
          .catch(error => alert("Access Denied"));
    };

    const handleUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        axios.post(backendApiUrl + "/upload", formData, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => {
            alert("Upload successful");
            setSwaggerUrl(backendApiUrl + "/swagger.yaml?v=" + Date.now());
            setSwaggerKey(Date.now());
            // Reset the file input value
            event.target.value = '';
        })
        .catch(error => {
            console.error("Upload failed:", error);
            const errorMessage = error.response?.data?.message || "Upload failed: Unknown error";
            alert(errorMessage);
            // Also reset the file input value on error
            event.target.value = '';
        });
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <h2 style={{ margin: 0, color: '#2c3e50' }}>Swagger API Documentation</h2>
                {token && userEmail && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{
                            padding: '8px 12px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}>
                            {userEmail}
                        </span>
                        <button
                            onClick={handleLogout}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>

            {errorMessage && (
                <div style={{
                    padding: '12px',
                    marginBottom: '20px',
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    borderRadius: '4px',
                    border: '1px solid #f5c6cb'
                }}>
                    {errorMessage}
                </div>
            )}

            {!token || !isValidToken ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px'
                }}>
                    <button
                        onClick={handleLogin}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Login with GitHub
                    </button>
                </div>
            ) : (
                <div>
                    <div style={{
                        marginBottom: '20px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ 
                            marginTop: 0,
                            marginBottom: '15px',
                            color: '#2c3e50'
                        }}>
                            Upload API JSON
                        </h3>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center'
                        }}>
                            <input
                                type="file"
                                onChange={handleUpload}
                                style={{
                                    padding: '8px',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    backgroundColor: 'white'
                                }}
                            />
                            <button
                                onClick={accessProtectedRoute}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Test Secure Route
                            </button>
                            <button
                                onClick={() => navigate('/generator')}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Swagger生成器
                            </button>
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <SwaggerUI 
                            url={swaggerUrl} 
                            key={swaggerKey}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// 主App组件现在只负责路由设置
function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MainContent />} />
                <Route path="/generator" element={<SwaggerGenerator />} />
            </Routes>
        </Router>
    );
}

export default App;
