import React, { useState, useEffect } from "react";
import VoucherForm from "./components/VoucherForm";
import Sidebar from "./components/Sidebar";
import AccountsForm from "./components/AccountsForm";
import HighAccounts from "./components/HighAccountsForm";
import HighBandsForm from "./components/HighBandsForm";
import Login from "./components/Login";
import RegisterUser from "./components/RegisterUser";
import RegisterCompany from "./components/RegisterCompany";
import AdminUsers from "./components/AdminUsers";
import BalanceSheet from "./components/report/BalanceSheet";
import AccountStatement from "./components/report/AccountStatement";
import TrialBalance from "./components/report/trialbalance";


function App() {
  const [lang, setLang] = useState("ar");
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  const role = localStorage.getItem("userRole");
  const screens = JSON.parse(
    localStorage.getItem("screens") ||
      (role === "admin"
        ? JSON.stringify(["Accounts", "Journal", "Reports", "Users"])
        : "[]")
  );

  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");

useEffect(() => {
  setPage("login"); 
  setUser(null); 
}, []);


const navigate = (path) => {
  switch (path) {
    case "/login":
      // نحفظ اسم الشركة قبل حذف كل شيء
      const companyName = localStorage.getItem("companyName");
      localStorage.clear();
      // نعيد اسم الشركة إلى التخزين المحلي إذا كان موجوداً
      if (companyName) {
        localStorage.setItem("companyName", companyName);
      }
      setUser(null);
      setPage("login");
      break;
    case "/admin-users":
      setPage("admin-users");
      break;
    case "/voucher":
      setPage("voucher");
      break;
    case "/accounts":
      setPage("accounts");
      break;
    case "/HighAccounts":
      setPage("HighAccounts");
      break;
    case "/HighBands":
      setPage("HighBands");
      break;
    case "/register-user":
      setPage("register-user");
      break;
    case "/register-company":
      setPage("register-company");
      break;
    case "/report/balanceSheet":
      setPage("balanceSheet");
      break;
      case "/report/accountStatement":
      setPage("accountStatement");
      break;
      case "/report/trialBalance":
      setPage("trialbalance");
      break;
    default:
      setPage("voucher");
  }
};


  return (
    <div className="flex">
      {/* سايدبار */}
      {page !== "login" && page !== "register-user" && page !== "register-company" && (
        <Sidebar
          lang={lang}
          setLang={setLang}
          currentPage={page}
          navigate={navigate}
          user={user}
        />
      )}

      {/* المحتوى الأساسي */}
      <div
        className={`flex-1 p-6 ${
          lang === "ar" ? "md:mr-[220px]" : "md:ml-[220px]"
        }`}
      >
        

        {/* {page === "voucher" && screens.includes("Journal") && <VoucherForm lang={lang} permissions={permissions} />}
        {page === "accounts" && screens.includes("Accounts") && <AccountsForm lang={lang} permissions={permissions} />}
        {page === "HighAccounts" && screens.includes("Accounts") && <HighAccounts lang={lang} permissions={permissions} />}
        {page === "HighBands" && screens.includes("Reports") && <HighBandsForm lang={lang} permissions={permissions} />}
        {page === "admin-users" && (role === "admin" || screens.includes("Users")) && <AdminUsers lang={lang} />} */}

        {page === "voucher" && screens.includes("Journal") && <VoucherForm lang={lang} permissions={permissions} />}
        {page === "accounts" && screens.includes("AccountsBase") && <AccountsForm lang={lang} permissions={permissions} />}
        {page === "HighAccounts" && screens.includes("AccountsHigh") && <HighAccounts lang={lang} permissions={permissions} />}
        {page === "HighBands" && screens.includes("AccountsBands") && <HighBandsForm lang={lang} permissions={permissions} />}
        {page === "admin-users" && (role === "admin" || screens.includes("Users")) && <AdminUsers lang={lang} />}



        {/* {page === "voucher" && <VoucherForm lang={lang} />} */}
        {/* {page === "accounts" && <AccountsForm lang={lang} permissions={permissions}/>} */}
        {/* {page === "HighAccounts" && <HighAccounts lang={lang} permissions={permissions} />} */}
        {/* {page === "HighBands" && <HighBandsForm lang={lang} permissions={permissions}/>} */}
        {page === "login" && <Login onLogin={setUser} navigate={navigate} />}
        {page === "register-company" && <RegisterCompany navigate={navigate} />}
        {page === "register-user" && <RegisterUser navigate={navigate} />}
        {page === "balanceSheet" && <BalanceSheet lang={lang} />}
        {page === "accountStatement" && <AccountStatement lang={lang} />}
        {page === "trialbalance" && <TrialBalance lang={lang} />}

        {/* {page === "admin-users" && <AdminUsers lang={lang} />} */}
      </div>
    </div>
  );
}

export default App;
