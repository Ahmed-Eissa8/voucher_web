import { useState, useEffect } from "react";
import {
  FaBars,
  FaSignOutAlt,
  FaBook,
  FaWallet,
  FaLayerGroup,
  FaBoxes,
  FaGlobe,
  FaUsersCog,
  FaChartBar,
} from "react-icons/fa";
import "./style/Sidebar.css";

function Sidebar({ lang, setLang, navigate }) {
  const [open, setOpen] = useState(window.innerWidth > 768);
  const [screens, setScreens] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const allowedScreens = JSON.parse(localStorage.getItem("screens") || "[]");
    const userPermissions = JSON.parse(localStorage.getItem("permissions") || "{}");

    setIsAdmin(role === "admin");
    setScreens(allowedScreens);
    setPermissions(userPermissions);

    // ضبط حالة القائمة بناءً على حجم الشاشة عند تغيير الحجم
    const handleResize = () => {
      setOpen(window.innerWidth > 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const availableReports = [
    { key: "balanceSheet", name: lang === "ar" ? "الميزانية العمومية" : "Balance Sheet" },
    { key: "accountStatement", name: lang === "ar" ? "كشف حساب" : "Account Statement" },
    { key: "trialBalance", name: lang === "ar" ? "ميزان المراجعة" : "Trial Balance" },
  ];

  const toggleLanguage = () => {
    const newLang = lang === "ar" ? "en" : "ar";
    setLang(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const handleLogout = () => {
    alert(lang === "ar" ? "تم تسجيل الخروج" : "Logged out");
    const companyName = localStorage.getItem("companyName");
    localStorage.clear();
    if (companyName) {
      localStorage.setItem("companyName", companyName);
    }
    navigate("/login");
  };

  const handleNavigate = (path, screenKey) => {
    if (!isAdmin && !screens.includes(screenKey)) {
      alert(lang === "ar" ? "ليس لديك صلاحية لهذه الصفحة" : "Access denied");
      return;
    }
    navigate(path);
    // إغلاق القائمة فقط إذا كنا على الهاتف
    if (window.innerWidth <= 768) setOpen(false);
  };

  const t = {
    ar: {
      journal: "قيد اليومية",
      accounts: " الحسابات التشغيلية",
      highAccounts: "الحسابات الفرعية",
      highBands: "الحسابات العليا",
      users: "إدارة المستخدمين",
      reports: "التقارير",
      logout: "تسجيل خروج",
      langSwitch: "English",
    },
    en: {
      journal: "Journal Entry",
      accounts: "Operating Accounts",
      highAccounts: "High Sub Accounts",
      highBands: "High Accounts",
      users: "Manage Users",
      reports: "Reports",
      logout: "Logout",
      langSwitch: "عربي",
    },
  }[lang];

  return (
    <>
      {/* Overlay for mobile */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <div
        className={`sidebar ${open ? "open" : "collapsed"} ${lang === "ar" ? "rtl" : "ltr"}`}
        style={{ [lang === "ar" ? "right" : "left"]: 0 }}
      >
      <div className="toggle-btn" onClick={() => setOpen(!open)}>
        <FaBars size={20} />
      </div>

      <ul className="menu">
        <li onClick={toggleLanguage}>
          <FaGlobe /> <span>{t.langSwitch}</span>
        </li>

        {(isAdmin || screens.includes("Users")) && (
          <li onClick={() => handleNavigate("/admin-users", "Users")}>
            <FaUsersCog /> <span>{t.users}</span>
          </li>
        )}

        {screens.includes("Journal") && (
          <li onClick={() => handleNavigate("/voucher", "Journal")}>
            <FaBook /> <span>{t.journal}</span>
          </li>
        )}

        {screens.includes("AccountsBase") && (
          <li onClick={() => handleNavigate("/accounts", "AccountsBase")}>
            <FaWallet /> <span>{t.accounts}</span>
          </li>
        )}

        {screens.includes("AccountsHigh") && (
          <li onClick={() => handleNavigate("/HighAccounts", "AccountsHigh")}>
            <FaLayerGroup /> <span>{t.highAccounts}</span>
          </li>
        )}

        {screens.includes("AccountsBands") && (
          <li onClick={() => handleNavigate("/HighBands", "AccountsBands")}>
            <FaBoxes /> <span>{t.highBands}</span>
          </li>
        )}

        {/* ✅ إظهار التقارير حسب الصلاحيات */}
        {screens.includes("Reports") && (
          <li
            className={`submenu ${showReports ? "active" : ""}`}
          >
            <div className="submenu-header" onClick={() => setShowReports(!showReports)}>
              <FaChartBar /> <span>{t.reports}</span>
            </div>

            {showReports && (
              <ul className="submenu-items">
                {availableReports
                  .filter((r) => permissions.Reports?.[r.key]) // ✅ فقط التقارير المسموح بها
                  .map((r) => (
                    <li
                      key={r.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(`/report/${r.key}`, "Reports");
                      }}
                    >
                      {r.name}
                    </li>
                  ))}
              </ul>
            )}
          </li>
        )}

        <li onClick={handleLogout}>
          <FaSignOutAlt /> <span>{t.logout}</span>
        </li>
      </ul>
    </div>
    </>
  );
}

export default Sidebar;
