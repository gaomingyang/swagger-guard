import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);

// 添加axios拦截器
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('jwt_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);