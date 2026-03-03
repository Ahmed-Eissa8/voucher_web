import React, { useState, useEffect } from "react";
import { FaGlobe } from "react-icons/fa";
import api from "../api";

export default function Login({ navigate, onLogin }) {
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lang, setLang] = useState("ar");

  useEffect(() => {
    const savedCompanyName = localStorage.getItem("companyName");
    if (savedCompanyName) {
      setCompanyName(savedCompanyName);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/login", {
        company_name: companyName,
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("companyId", res.data.company_id);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("screens", JSON.stringify(res.data.screens || []));
      localStorage.setItem("permissions", JSON.stringify(res.data.permissions || {}));
      localStorage.setItem("userRole", res.data.role);
      localStorage.setItem("companyName", companyName); // 🔹 حفظ اسم الشركة

      console.log("🔹 Saved screens:", res.data.screens);
      console.log("🔹 Saved role:", res.data.role);

      if (onLogin) onLogin(res.data);

      if (res.data.role === "admin") {
        navigate("/admin-users");
      } else {
        navigate("/voucher");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          (lang === "ar" ? "فشل تسجيل الدخول" : "Login failed")
      );
    }
  };

  const text = {
    title: lang === "ar" ? "تسجيل الدخول" : "Login",
    company: lang === "ar" ? "اسم الشركة" : "Company Name",
    username: lang === "ar" ? "اسم المستخدم" : "Username",
    password: lang === "ar" ? "كلمة المرور" : "Password",
    loginBtn: lang === "ar" ? "دخول" : "Login",
    noAccount: lang === "ar" ? "ليس لديك حساب؟" : "Don't have an account?",
    registerCompany: lang === "ar" ? "سجل شركة" : "Register Company",
    registerUser: lang === "ar" ? "سجل مستخدم" : "Register User",
  };

  return (
    <div className="voucher-container" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div
        style={{
          textAlign: lang === "ar" ? "left" : "right",
          marginBottom: "15px",
        }}
      >
        <button
          className="btn"
          style={{
            padding: "5px 10px",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        >
          <FaGlobe />
        </button>
      </div>

      <h2 style={{ textAlign: "center" }}>{text.title}</h2>

      {error && <p className="toast error">{error}</p>}

      <div className="form-group">
        <label>{text.company}</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{text.username}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{text.password}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="form-actions">
        <button className="btn save" onClick={handleLogin}>
          {text.loginBtn}
        </button>
      </div>

      {/* <p className="text-center mt-4">
        {text.noAccount}{" "}
        <span
          className="text-blue-500 cursor-pointer"
          onClick={() => navigate("/register-company")}
        >
          {text.registerCompany}
        </span>{" "}
        |{" "}
        <span
          className="text-blue-500 cursor-pointer"
          onClick={() => navigate("/register-user")}
        >
          {text.registerUser}
        </span>
      </p> */}
    </div>
  );
}
