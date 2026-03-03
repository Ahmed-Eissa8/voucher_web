// frontend/src/api.js
import axios from "axios";

const baseURL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4400/api" // عنوان الخادم المحلي
    : "https://acc.kian24.com/api"; // عنوان الخادم الإنتاجي

const api = axios.create({
  baseURL,
});

// 🔹 إضافة التوكن تلقائياً لكل الطلبات
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
