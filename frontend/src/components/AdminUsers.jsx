import React, { useEffect, useState } from "react";
import api from "../api";

export default function AdminUsers({ lang }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [screens, setScreens] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" });
  const [editUserData, setEditUserData] = useState({ username: "", password: "", role: "" });
  const [toast, setToast] = useState({ message: "", type: "" });

  // ✳️ Company states
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyFormData, setCompanyFormData] = useState({ name: "", location: "", tel: "", email: "", taxid: "" });


  // ✳️ التقارير (المفاتيح بالإنجليزي، الأسماء حسب اللغة)
  const reportPages = [
    { key: "balanceSheet", ar: "الميزانية العمومية", en: "Balance Sheet" },
    { key: "trialBalance", ar: "ميزان المراجعة", en: "Trial Balance" },
    { key: "accountStatement", ar: "كشف حساب", en: "Account Statement" },
  ];



  // ✳️ أسماء الشاشات
  const allScreens = [
    "Journal",
    "AccountsBase",
    "AccountsHigh",
    "AccountsBands",
    "Users",
    "Reports",
  ];

  // ✳️ الترجمة
  const t = {
    ar: {
      manageUsers: "إدارة المستخدمين",
      username: "اسم المستخدم",
      password: "كلمة المرور",
      role: "الدور",
      action: "الإجراء",
      editPerms: "تعديل ",
      addUser: "إضافة ",
      permissionsOf: "صلاحيات المستخدم",
      manageCompanies: "إدارة الشركات",
      companyName: "اسم الشركة",
      addCompany: "إضافة شركة",
      updateCompany: "تعديل شركة",
      selectCompany: "اختر شركة",
      company: "الشركة",
      save: "حفظ",
      cancel: "إلغاء",
      saved: "تم الحفظ بنجاح",
      accounts: "الحسابات التشغيلية",
      HighAccountsForm: "الحسابات الفرعية",
      HighBandsForm: "الحسابات العليا",
      journal: "القيود اليومية",
      users: "إدارة المستخدمين",
      view: "عرض",
      edit: "تعديل",
      delete: "حذف",
      reports: "التقارير",
      confirmDelete: "هل أنت متأكد من حذف المستخدم؟",
      errorFetch: "حدث خطأ أثناء جلب البيانات",
      errorSave: "حدث خطأ أثناء الحفظ",
      errorAdd: "حدث خطأ أثناء الإضافة",
      errorDelete: "حدث خطأ أثناء الحذف",
      added: "تمت الإضافة بنجاح",
      deleted: "تم الحذف بنجاح",
    },
    en: {
      manageUsers: "Manage Users",
      username: "Username",
      password: "Password",
      role: "Role",
      action: "Action",
      editPerms: "Edit ",
      addUser: "Add ",
      permissionsOf: "Permissions of",
      manageCompanies: "Company Management",
      companyName: "Company Name",
      addCompany: "Add Company",
      updateCompany: "Update Company",
      selectCompany: "Select Company",
      company: "Company",
      save: "Save",
      cancel: "Cancel",
      saved: "Saved successfully",
      accounts: "Operating Accounts",
      HighAccountsForm: "High Sub Accounts",
      HighBandsForm: "High Accounts",
      journal: "Journal Entry",
      users: "Manage Users",
      view: "View",
      edit: "Edit",
      delete: "Delete",
      reports: "Reports",
      confirmDelete: "Are you sure you want to delete this user?",
      errorFetch: "Error fetching users",
      errorSave: "Error saving user",
      errorAdd: "Error adding user",
      errorDelete: "Error deleting user",
      added: "User added successfully",
      deleted: "User deleted successfully",
    },
  }[lang || "en"];

  const screenNames = {
    Journal: t.journal,
    AccountsBase: t.accounts,
    AccountsHigh: t.HighAccountsForm,
    AccountsBands: t.HighBandsForm,
    Users: t.users,
    Reports: t.reports,
  };

  // ✅ Toast function
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  // ✅ Fetch users
  const fetchUsers = async (companyId) => {
    if (!companyId) return;
    try {
      const res = await api.get(`/users?company_id=${companyId}`);
      setUsers(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || t.errorFetch, "error");
    }
  };

  // ✅ Fetch all companies (for super admin)
  const fetchCompanies = async () => {
    try {
      const res = await api.get("/companies");
      setCompanies(res.data);
    } catch (err) {
      showToast("Failed to fetch companies", "error");
    }
  };

  // Re-fetch users when selected company changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchUsers(selectedCompanyId);
      setSelectedUser(null); // Clear user selection
    }
  }, [selectedCompanyId]);

  // ✅ Fetch user permissions
  const fetchPermissions = async (user) => {
    try {
      const res = await api.get(`/users/${user.id}/permissions`);
      const perms = res.data.permissions || {};
      if (!perms.Reports) perms.Reports = {};
      setSelectedUser(user);
      setEditUserData({ username: user.username, password: "", role: user.role });
      setScreens(res.data.screens || []);
      setPermissions(perms);
    } catch (err) {
      showToast(err.response?.data?.error || t.errorFetch, "error");
    }
  };

  useEffect(() => {
    const userCompanyId = localStorage.getItem("companyId");
    const isSuper = parseInt(userCompanyId, 10) === 1;
    setIsSuperAdmin(isSuper);
    setSelectedCompanyId(userCompanyId);

    if (isSuper) {
      fetchCompanies(); // Super admin fetches all companies
    }
  }, []); // This effect runs only once on mount

  // ✅ Toggle screen
  const toggleScreen = (screen) => {
    setScreens((prev) =>
      prev.includes(screen)
        ? prev.filter((s) => s !== screen)
        : [...prev, screen]
    );
  };

  // ✅ Toggle permission (عرض / تعديل / حذف)
  const togglePerm = (screen, perm) => {
    setPermissions((prev) => ({
      ...prev,
      [screen]: {
        ...prev[screen],
        [perm]: !prev[screen]?.[perm],
      },
    }));
  };

  // ✅ Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(t.deleted, "success");
    } catch (err) {
      showToast(err.response?.data?.error || t.errorDelete, "error");
    }
  };

  // ✅ Save permissions
  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      // Only send password if it's not empty
      const dataToUpdate = { username: editUserData.username };
      if (editUserData.password) {
        dataToUpdate.password = editUserData.password;
      }
      await api.put(`/users/${selectedUser.id}`, dataToUpdate);
      const fixedPermissions = { ...permissions, Reports: permissions.Reports || {} };
      await api.put(`/users/${selectedUser.id}/permissions`, {
        screens,
        permissions: fixedPermissions,
      });
      showToast(t.saved, "success");
      setSelectedUser(null);
      fetchUsers(selectedCompanyId);
    } catch (err) {
      showToast(err.response?.data?.error || t.errorSave, "error");
    }
  };

  // ✅ Cancel editing
  const handleCancel = () => {
    setSelectedUser(null);
    setScreens([]);
    setPermissions({});
  };

  // ✅ Add new user
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      showToast("Please enter username and password", "error");
      return;
    }
    try {
      const res = await api.post("/users", { ...newUser, company_id: selectedCompanyId });
      setUsers((prev) => [...prev, res.data]);
      setNewUser({ username: "", password: "", role: "user" });
      showToast(t.added, "success");
    } catch (err) {
      showToast(err.response?.data?.error || t.errorAdd, "error");
    }
  };

  // --- Company CRUD Functions (Super Admin) ---

  const handleCompanyFormChange = (e) => {
    const { name, value } = e.target;
    if (editingCompany) {
      setEditingCompany(prev => ({ ...prev, [name]: value }));
    } else {
      setCompanyFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    const companyData = editingCompany ? editingCompany : companyFormData;
    try {
      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, companyData);
        showToast("Company updated", "success");
      } else {
        await api.post("/companies", companyData);
        showToast("Company added", "success");
      }
      cancelEditCompany();
      fetchCompanies(); // Refresh list
    } catch (err) {
      showToast(err.response?.data?.error || "Error saving company", "error");
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany({ ...company });
  };

  const handleDeleteCompany = async (companyId) => {
    if (companyId === 1) {
      showToast("Cannot delete the main company", "error");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this company and all its users?")) return;
    try {
      await api.delete(`/companies/${companyId}`);
      showToast("Company deleted", "success");
      fetchCompanies(); // Refresh list
      // If the deleted company was the selected one, reset selection
      if (String(selectedCompanyId) === String(companyId)) {
        setSelectedCompanyId(localStorage.getItem("companyId"));
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Error deleting company", "error");
    }
  };

  const cancelEditCompany = () => {
    setEditingCompany(null);
    setCompanyFormData({ name: "", location: "", tel: "", email: "", taxid: "" });
  };

  return (
    <div
      className="voucher-container admin-users"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ textAlign: lang === "ar" ? "right" : "left" }}
    >
      <h2>{t.manageUsers}</h2>

      {toast.message && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      {isSuperAdmin && (
        <div className="form-group" style={{ maxWidth: '400px', marginBottom: '20px' }}>
          <label>{t.selectCompany}</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ✅ إضافة مستخدم جديد */}
      <div className="form-header">
        <div className="form-group">
          <label>{t.username}</label>
          <input
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            placeholder={t.username}
          />
        </div>
        <div className="form-group">
          <label>{t.password}</label>
          <input
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder={t.password}
          />
        </div>
        <div className="form-group" style={{ flex: "0 0 120px" }}>
          <button className="btn save" onClick={handleAddUser}>
            {t.addUser}
          </button>
        </div>
      </div>

      {/* ✅ جدول المستخدمين */}
      <table className="voucher-table">
        <thead>
          <tr>
            <th>{t.username}</th>
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>
                <button className="btn save" onClick={() => fetchPermissions(u)}>
                  {t.editPerms}
                </button>
                <button
                  className="btn delete"
                  style={{ marginLeft: "6px" }}
                  onClick={() => handleDeleteUser(u.id)}
                >
                  {t.delete}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ تعديل الصلاحيات */}
      {selectedUser && (
        <div className="permissions-box">
          <h3>
            {t.permissionsOf} {selectedUser.username}
          </h3>

          <div className="form-header">
            <div className="form-group">
              <label>{t.username}</label>
              <input
                value={editUserData.username}
                onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t.password}</label>
              <input
                type="password"
                placeholder="••••••"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            {allScreens.map((screen) => (
              <div key={screen} className="screen-perm">
                <label>
                  <input
                    type="checkbox"
                    checked={screens.includes(screen)}
                    onChange={() => toggleScreen(screen)}
                  />
                  {screenNames[screen]}
                </label>

                {/* ✅ في حالة Reports */}
                {screens.includes(screen) && screen === "Reports" && (
                  <div className="sub-permissions">
                    {reportPages.map((report) => (
                      <label key={report.key}>
                        <input
                          type="checkbox"
                          checked={permissions.Reports?.[report.key] || false}
                          onChange={() =>
                            setPermissions((prev) => ({
                              ...prev,
                              Reports: {
                                ...prev.Reports,
                                [report.key]: !prev.Reports?.[report.key],
                              },
                            }))
                          }
                        />
                        {lang === "ar" ? report.ar : report.en}
                      </label>
                    ))}
                  </div>
                )}

                {/* ✅ باقي الصفحات */}
                {screens.includes(screen) && screen !== "Reports" && (
                  <div className="sub-permissions">
                    {["view", "edit", "delete"].map((perm) => (
                      <label key={perm}>
                        <input
                          type="checkbox"
                          checked={permissions[screen]?.[perm] || false}
                          onChange={() => togglePerm(screen, perm)}
                        />
                        {t[perm]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button className="btn save" onClick={handleSave}>
              {t.save}
            </button>
            <button className="btn delete" onClick={handleCancel}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* --- Company Management Section (Super Admin Only) --- */}
      {isSuperAdmin && (
        <div className="company-management" style={{ marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
          <h3>{t.manageCompanies}</h3>

          {/* Company Add/Edit Form */}
          <form onSubmit={handleCompanySubmit} className="account-form">
            <div className="form-group">
              <label>{t.companyName}</label>
              <input
                name="name"
                value={editingCompany ? editingCompany.name : companyFormData.name}
                onChange={handleCompanyFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                name="location"
                value={editingCompany ? editingCompany.location : companyFormData.location}
                onChange={handleCompanyFormChange}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                name="tel"
                value={editingCompany ? editingCompany.tel : companyFormData.tel}
                onChange={handleCompanyFormChange}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={editingCompany ? editingCompany.email : companyFormData.email}
                onChange={handleCompanyFormChange}
              />
            </div>
            <div className="form-group">
              <label>Tax ID</label>
              <input
                name="taxid"
                value={editingCompany ? editingCompany.taxid : companyFormData.taxid}
                onChange={handleCompanyFormChange}
              />
            </div>
            <div className="form-buttons">
              <button type="submit" className="btn save">
                {editingCompany ? t.updateCompany : t.addCompany}
              </button>
              {editingCompany && (
                <button type="button" className="btn cancel" onClick={cancelEditCompany}>
                  {t.cancel}
                </button>
              )}
            </div>
          </form>

          {/* Companies Table */}
          <table className="voucher-table" style={{ marginTop: '20px' }}>
            <thead>
              <tr>
                <th>{t.companyName}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <button className="btn save" onClick={() => handleEditCompany(c)}>{t.edit}</button>
                    <button className="btn delete" style={{ marginLeft: '6px' }} onClick={() => handleDeleteCompany(c.id)}>{t.delete}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
