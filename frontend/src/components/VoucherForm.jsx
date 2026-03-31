import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../api";

import "./style/VoucherForm.css";
import html2pdf from "html2pdf.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cairoBold from "./Cairo-Bold-normal.js";



export default function VoucherForm({ lang, permissions }) {
   const screen = "Journal";
   const emptyEntry = { accNo: "", accName: "", reference: "", dr: 0, cr: 0, desc: "" };

    const canView = permissions[screen]?.view;
    const canEdit = permissions[screen]?.edit;
    const canDelete = permissions[screen]?.delete;

  // const [lang, setLang] = useState("ar"); // "ar" أو "en"
  const labels = {
    ar: {
      title: "قيد اليومية",
      voucherNo: "رقم القيد",
      search: "بحث برقم القيد",
      accNo: "رقم الحساب",
      accName: "اسم الحساب",
      reference: "المرجع",
      dr: "مدين",
      cr: "دائن",
      desc: "الوصف",
      totalDr: "إجمالي مدين",
      totalCr: "إجمالي دائن",
      save: "حفظ",
      delete: "حذف",
      drCrMismatch: " المدين والدائن لازم يكونوا متساويين!",
      deleteConfirm: "هل أنت متأكد أنك تريد حذف القيد بالكامل؟",
      noVoucher: " لا يوجد رقم قيد للحذف",
      saved: "تم الحفظ بنجاح",
      deleted: " تم حذف القيد",
      error: " حدث خطأ أثناء العملية",
      date: "التاريخ"
    },
    en: {
      title: "Journal Entry",
      voucherNo: "Voucher No",
      search: "Search by Voucher No",
      accNo: "Account No",
      accName: "Account Name",
      reference: "Reference",
      dr: "Debit",
      cr: "Credit",
      desc: "Description",
      totalDr: "Total Debit",
      totalCr: "Total Credit",
      save: "Save",
      delete: "Delete",
      drCrMismatch: " Debit and Credit must be equal!",
      deleteConfirm: "Are you sure you want to delete this voucher?",
      noVoucher: " No voucher number to delete",
      saved: " Saved successfully",
      deleted: "Voucher deleted",
      error: " An error occurred",
       date: "Date"
    }
  };

  const [voucherNo, setVoucherNo] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchNo, setSearchNo] = useState("");
  const [entries, setEntries] = useState([emptyEntry]);
  const [accounts, setAccounts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [message, setMessage] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [suggestionFocus, setSuggestionFocus] = useState({ row: -1, input: null });
  const [portalCoords, setPortalCoords] = useState({ top: 0, left: 0, width: 0 });

  const addNewRow = () => {
    setEntries(prev => [...prev, { ...emptyEntry }]);
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click events on suggestions to fire
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const resetForm = async () => {
    try {
      setIsNew(true);
      const res = await api.get("/voucher/new");
      setVoucherNo(res.data.newVoucherNo || "");
      setEntries([emptyEntry]);
      setDate(new Date().toISOString().split("T")[0]);
      setSearchNo("");
    } catch (err) {
      console.error(err);
    }
  };

  // useEffect(() => resetForm(), []);
  useEffect(() => {
  const init = async () => {
    try {
      await resetForm();
      const res = await api.get("/company-details");
      setCompanyDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch company details", err);
    }
  };
  init();
}, []);


const fetchAccounts = async (query = "", type = "accNo") => {
  console.log("Frontend: fetchAccounts called with query:", query, "type:", type);
  try {
    const res = await api.get("/accounts", { params: { query, type } });
    console.log("Frontend: API response for accounts (length):", res.data.length, "Data:", res.data);
    setAccounts(res.data);
    setShowSuggestions(res.data.length > 0);
    setActiveIndex(res.data.length ? 0 : -1);
  } catch (err) {
    console.error("Frontend: Error fetching accounts:", err);
  }
};


  const handleChange = (idx, field, value) => {
    const newEntries = [...entries];
    newEntries[idx][field] = value;
    if (field === "dr" && value) newEntries[idx].cr = 0;
    if (field === "cr" && value) newEntries[idx].dr = 0;
    setEntries(newEntries);
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Enter") {
      if (showSuggestions && activeIndex >= 0 && accounts.length > 0) {
        const acc = accounts[activeIndex];
        const newEntries = [...entries];
        newEntries[idx].accNo = acc.SUBMAIN_NO;
        newEntries[idx].accName = acc.SUBMAIN_NAME;
        setEntries(newEntries);
        setShowSuggestions(false);
      }
    } else if (e.key === "ArrowDown") {
      if (accounts.length) setActiveIndex((prev) => (prev + 1) % accounts.length);
    } else if (e.key === "ArrowUp") {
      if (accounts.length) setActiveIndex((prev) => (prev - 1 + accounts.length) % accounts.length);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (idx, acc) => {
    const newEntries = [...entries];
    newEntries[idx].accNo = acc.SUBMAIN_NO;
    newEntries[idx].accName = acc.SUBMAIN_NAME;
    setEntries(newEntries);
    setShowSuggestions(false);
  };

  const handleRightClick = (e, idx) => {
    e.preventDefault();
    const newEntries = [...entries];
    newEntries.splice(idx, 1);
    if (newEntries.length === 0) newEntries.push({ ...emptyEntry });
    setEntries(newEntries);
  };

  const totalDr = entries.reduce((sum, e) => sum + Number(e.dr || 0), 0);
  const totalCr = entries.reduce((sum, e) => sum + Number(e.cr || 0), 0);

const printVoucher = () => {
  jsPDF.API.events.push(["addFonts", function () {
    this.addFileToVFS("Cairo-Bold.ttf", cairoBold);
    this.addFont("Cairo-Bold.ttf", "Cairo", "normal");
  }]);

  const headerContent = companyDetails
    ? `<div style="text-align: ${lang === "ar" ? "right" : "left"};">
         <div style="font-size: 22px; font-weight: bold;">${companyDetails.name}</div>
         <div>${companyDetails.location}</div>
       </div>`
    : "";

  const element = document.createElement("div");
  element.innerHTML = `
    <div style="font-family: 'Cairo', Arial, sans-serif; padding: 20px; ${lang === "ar" ? "direction: rtl; text-align: right;" : ""}">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        ${headerContent}
        <h2 style="text-align:center;">${labels[lang].title}</h2>
      </div>      <p><strong>${labels[lang].voucherNo}:</strong> ${voucherNo}</p>
      <p><strong>${labels[lang].date}:</strong> ${date}</p>
      <table style="width:100%; border-collapse: collapse; margin-top: 20px; page-break-inside: auto;">
        <thead style="display: table-header-group;">
          <tr>
            <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">${labels[lang].accNo}</th>
            <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">${labels[lang].accName}</th>
            <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">${labels[lang].reference}</th>
            <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">${labels[lang].dr}</th>
            <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">${labels[lang].cr}</th>
            <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">${labels[lang].desc}</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => `
            <tr style="page-break-inside: avoid;">
              <td style="border:1px solid #000; padding:8px;">${e.accNo}</td>
              <td style="border:1px solid #000; padding:8px;">${e.accName}</td>
              <td style="border:1px solid #000; padding:8px;">${e.reference}</td>
              <td style="border:1px solid #000; padding:8px;">${e.dr}</td>
              <td style="border:1px solid #000; padding:8px;">${e.cr}</td>
              <td style="border:1px solid #000; padding:8px;">${e.desc}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      <p style="margin-top:20px;"><strong>${labels[lang].totalDr}:</strong> ${totalDr}<br><strong>${labels[lang].totalCr}:</strong> ${totalCr}</p>
    </div>
  `;

  const opt = {
    margin: [10, 10, 25, 10], // 👈 زودنا الهامش السفلي 25mm
    filename: `Voucher_${voucherNo}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // 👈 يخلي التقطيع أنظف
  };

  html2pdf().set(opt).from(element).toPdf().get('pdf').then(function (pdf) {
    const totalPages = pdf.internal.getNumberOfPages();
    const pageLabel = labels[lang].page || (lang === "ar" ? "صفحة" : "Page");
    const ofLabel = labels[lang].of || (lang === "ar" ? "من" : "of");

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFont("Cairo", "normal");
      pdf.setFontSize(10);

      const pageText = `${pageLabel} ${i} ${ofLabel} ${totalPages}`;
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.text(pageText, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    pdf.save(`Voucher_${voucherNo}.pdf`);
  });
  // html2pdf().set(opt).from(element).save();
};

const saveVoucher = async () => {
  if (Math.abs(totalDr - totalCr) > 0.001) {
    showMessage(labels[lang].drCrMismatch, "error");
    return;
  }

  try {
    const res = await api.post("/voucher", {
      voucherNo,
      date,
      entries,
      isNew
    });

    // السيرفر بيرجع رقم القيد النهائي  
    const savedNo = res.data.voucherNo;
    setVoucherNo(savedNo);

    showMessage(`${labels[lang].saved} (${labels[lang].voucherNo}: ${savedNo})`, "success");

    resetForm(); // يعيد النموذج لقيد جديد
  } catch (err) {
    console.error(err);
    showMessage(labels[lang].error, "error");
  }
};
 

// const saveVoucher = async () => {
//   if (Math.abs(totalDr - totalCr) > 0.001) {
//     showMessage(labels[lang].drCrMismatch, "error");
//     return;
//   }

//   try {
//     const res = await axios.post("http://localhost:5000/api/voucher", {
//       voucherNo,
//       date,
//       entries,
//       isNew
//     });

//     // السيرفر بيرجع رقم القيد الصحيح
//     const savedNo = res.data.voucherNo;
//     setVoucherNo(savedNo);

//     // ✅ الرسالة توضح رقم القيد
//     showMessage(`${labels[lang].saved} (${labels[lang].voucherNo}: ${savedNo})`, "success");

//     resetForm();
//   } catch (err) {
//     console.error(err);
//     showMessage(labels[lang].error, "error");
//   }
// };


  const deleteVoucher = async () => {
    if (!voucherNo) return showMessage(labels[lang].noVoucher, "error");
    if (!window.confirm(labels[lang].deleteConfirm)) return;

    try {
      await api.delete(`/voucher/${voucherNo}`);
      showMessage(labels[lang].deleted, "success");
      resetForm();
    } catch (err) {
      console.error(err);
      showMessage(labels[lang].error, "error");
    }
  };

  // 🔹 البحث عن القيد عند كتابة الرقم
  // useEffect(() => {
  //   const fetchVoucher = async () => {
  //     if (!searchNo) return resetForm();
  //     try {
  //       const res = await axios.get(`http://localhost:5000/api/voucher/${searchNo}`);
  //       if (res.data.length > 0) {
  //         setIsNew(false);
  //         const v = res.data[0];
  //         setVoucherNo(v.JOURNAL_NO);
  //         setDate(v.JOURNAL_DATE?.slice(0, 10) || date);
  //         setEntries(res.data.map((r) => ({
  //           accNo: r.JOURNAL_SUBMAIN_NO,
  //           accName: r.SUBMAIN_NAME || "",
  //           reference: r.JOURNAL_DOCNO || "",
  //           dr: r.JOURNAL_DR,
  //           cr: r.JOURNAL_CR,
  //           desc: r.JOURNAL_DESC,
  //         })));
  //       } else resetForm();
  //     } catch (err) {
  //       console.error(err);
  //       resetForm();
  //     }
  //   };
  //   fetchVoucher();
  // }, [searchNo]);

  useEffect(() => {
  const fetchVoucher = async () => {
    if (!searchNo) return resetForm();
    try {
      const res = await api.get(`/voucher/${searchNo}`);
      if (res.data.length > 0) {
        setIsNew(false);
        const v = res.data[0];
        setVoucherNo(v.JOURNAL_NO);
        setDate(v.JOURNAL_DATE?.slice(0,10) || date);
        setEntries(res.data.map((r) => ({
          accNo: r.JOURNAL_SUBMAIN_NO,
          accName: r.SUBMAIN_NAME || "",
          reference: r.JOURNAL_DOCNO || "",
          dr: r.JOURNAL_DR,
          cr: r.JOURNAL_CR,
          desc: r.JOURNAL_DESC,
        })));
      } else resetForm();
    } catch (err) {
      console.error(err);
      resetForm();
    }
  };
  fetchVoucher();
}, [searchNo]);



useEffect(() => {
  const handleScroll = () => setShowSuggestions(false);
  window.addEventListener("scroll", handleScroll);

  return () => window.removeEventListener("scroll", handleScroll);
}, []);


  return (
    <div
      className="voucher-container"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ textAlign: lang === "ar" ? "right" : "left" }}
    >
      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      {/* <div style={{ textAlign: lang === "ar" ? "right" : "left", marginBottom: "10px" }}>
        <button className="btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
          {lang === "ar" ? "English" : "عربي"}
        </button>
      </div> */}

      <h2>{labels[lang].title}</h2>
     <div className="form-header">
  <div className="form-group">
    <label>{labels[lang].voucherNo}:</label>
    <input value={voucherNo} readOnly />
  </div>
  <div className="form-group">
    <label>{labels[lang].date}:</label>
    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
  </div>
  <div className="form-group">
    <label>{labels[lang].search}:</label>
    <input value={searchNo} onChange={(e) => setSearchNo(e.target.value)} />
  </div>
</div>


      <table className="voucher-table">
        <thead>
          <tr>
            <th>{labels[lang].accNo}</th>
            <th>{labels[lang].accName}</th>
            <th>{labels[lang].reference}</th>
            <th>{labels[lang].dr}</th>
            <th>{labels[lang].cr}</th>
            <th>{labels[lang].desc}</th>
          </tr>
        </thead>
        {/* <tbody>
          {entries.map((row, i) => (
            <tr key={i} onContextMenu={(e) => handleRightClick(e, i)}>
              <td className="with-suggestions">
                <input
                  value={row.accNo}
                  onChange={(e) => { handleChange(i, "accNo", e.target.value); fetchAccounts(e.target.value, "accNo"); }}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                />
                {showSuggestions && accounts.length > 0 && (
                  <ul className="suggestions">
                    {accounts.map((acc, idx) => (
                      <li key={idx} className={idx === activeIndex ? "active" : ""} onMouseDown={() => selectSuggestion(i, acc)}>
                        {acc.SUBMAIN_NO} - {acc.SUBMAIN_NAME}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td>
                <input value={row.accName} onChange={(e) => { handleChange(i, "accName", e.target.value); fetchAccounts(e.target.value, "accName"); }} />
              </td>
              <td>
                <input value={row.reference} onChange={(e) => handleChange(i, "reference", e.target.value)} />
              </td>
              <td>
                <input type="number" value={row.dr} onChange={(e) => handleChange(i, "dr", e.target.value)} />
              </td>
              <td>
                <input type="number" value={row.cr} onChange={(e) => handleChange(i, "cr", e.target.value)} />
              </td>
              <td>
                <input value={row.desc} onChange={(e) => handleChange(i, "desc", e.target.value)} />
              </td>
            </tr>
          ))}
        </tbody> */}
        {/* داخل جدول الإدخالات */}
<tbody>
  {entries.map((row, i) => (
    <tr key={i} onContextMenu={(e) => canEdit && handleRightClick(e, i)}>
      <td className="with-suggestions">
        <input
          value={row.accNo}
          disabled={!canEdit} // 🚫 تعطيل لو ما عنده صلاحية تعديل
          onChange={(e) => { handleChange(i, "accNo", e.target.value); fetchAccounts(e.target.value, "accNo"); }}
          // onFocus handler for accNo input
          onFocus={(e) => {
            const rect = e.target.getBoundingClientRect();
            setPortalCoords({
              top: rect.bottom + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width
            });
            setSuggestionFocus({ row: i, input: 'accNo' });
            fetchAccounts(e.target.value, "accNo"); 
          }}
          onBlur={handleInputBlur}
          onKeyDown={(e) => handleKeyDown(e, i)}
        />
      </td>
      <td className="with-suggestions">
        <input
          value={row.accName}
          disabled={!canEdit}
          onChange={(e) => { handleChange(i, "accName", e.target.value); fetchAccounts(e.target.value, "accName"); }}
          // onFocus handler for accName input
          onFocus={(e) => {
            const rect = e.target.getBoundingClientRect();
            setPortalCoords({
              top: rect.bottom + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width
            });
            setSuggestionFocus({ row: i, input: 'accName' });
            fetchAccounts(e.target.value, "accName"); 
          }}
          onBlur={handleInputBlur}
          onKeyDown={(e) => handleKeyDown(e, i)}
        />
      </td>
      <td>
        <input
          value={row.reference}
          disabled={!canEdit}
          onChange={(e) => handleChange(i, "reference", e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          value={row.dr}
          disabled={!canEdit}
          onChange={(e) => handleChange(i, "dr", e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          value={row.cr}
          disabled={!canEdit}
          onChange={(e) => handleChange(i, "cr", e.target.value)}
        />
      </td>
      <td>
        <input
          value={row.desc}
          disabled={!canEdit}
          onChange={(e) => handleChange(i, "desc", e.target.value)}
        />
      </td>
    </tr>
  ))}
</tbody>

      </table>

      {canEdit && (
        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={addNewRow} 
            className="btn save" 
            title={lang === 'ar' ? 'إضافة طرف جديد' : 'Add new entry'}
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              padding: 0, 
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            +
          </button>
        </div>
      )}

      <div className="totals">
        <span>{labels[lang].totalDr}: {totalDr}</span>
        <span>{labels[lang].totalCr}: {totalCr}</span>
      </div>

      {/* <div className="form-actions">
        <button className="btn save" onClick={saveVoucher}>{labels[lang].save}</button>
        <button className="btn delete" onClick={deleteVoucher}>{labels[lang].delete}</button>
              {!isNew && (
  <button className="btn print" onClick={printVoucher}>
    {lang === "ar" ? "طباعة " : "Print"}
  </button>
)}
      </div> */}
      <div className="form-actions">
        {canEdit && <button className="btn save" onClick={saveVoucher}>{labels[lang].save}</button>}
        {canDelete && <button className="btn delete" onClick={deleteVoucher}>{labels[lang].delete}</button>}
        {!isNew && <button className="btn print" onClick={printVoucher}>{lang === "ar" ? "طباعة " : "Print"}</button>}
      </div>

      {showSuggestions && accounts.length > 0 &&
  createPortal(
    <ul
      className="suggestions"
      style={{
        position: "absolute",
        top: portalCoords.top,
        left: portalCoords.left,
        width: portalCoords.width,
        background: "#fff",
        border: "1px solid #C8E2E1",
        maxHeight: "250px",
        overflowY: "auto",
        zIndex: 9999,
        margin: 0,
        padding: 0,
        listStyle: "none",
        boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
      }}
    >
      {accounts.map((acc, idx) => (
        <li
          key={idx}
          className={idx === activeIndex ? "active" : ""}
          onMouseDown={() => selectSuggestion(suggestionFocus.row, acc)}
          style={{
            padding: "8px",
            cursor: "pointer",
            background: idx === activeIndex ? "#eee" : "#fff"
          }}
        >
          {acc.SUBMAIN_NO} - {acc.SUBMAIN_NAME}
        </li>
      ))}
    </ul>,
    document.body
  )
}



    </div>
  );
}
