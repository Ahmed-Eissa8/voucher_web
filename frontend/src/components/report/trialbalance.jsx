import React, { useState, useRef, useEffect } from "react";
import html2pdf from "html2pdf.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import "./BalanceSheet.css";
import cairoFont from "./Cairo-Bold-normal.js";
import api from "../../api";

export default function TrialBalance({ lang }) {
  const [level, setLevel] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [data, setData] = useState([]);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [message, setMessage] = useState(null);
  const reportRef = useRef();

  const t = {
    ar: {
      title: "ميزان المراجعة",
      level: "المستوى",
      from: "من تاريخ",
      to: "إلى تاريخ",
      debit: "مدين",
      credit: "دائن",
      account_no: "رقم الحساب",
      account_name: "اسم الحساب",
      export: "تصدير PDF",
      view: "عرض",
      no_data: "لا توجد بيانات",
    },
    en: {
      title: "Trial Balance",
      level: "Level",
      from: "From Date",
      to: "To Date",
      debit: "Debit",
      credit: "Credit",
      account_no: "Account No",
      account_name: "Account Name",
      export: "Export PDF",
      view: "View",
      no_data: "No data",
    },
  }[lang || "ar"];

  const levels = [
    { value: "band", label: lang === "ar" ? "الفئة العليا" : "Band" },
    { value: "subband", label: lang === "ar" ? "الحسابات العليا" : "SubBand" },
    { value: "main", label: lang === "ar" ? "الحسابات الفرعية" : "Main" },
    { value: "submain", label: lang === "ar" ? "الحسابات التشغلية" : "SubMain" },
  ];

  // رسائل مؤقتة
  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const res = await api.get("/company-details");
        setCompanyDetails(res.data);
      } catch (err) {
        console.error("Failed to fetch company details", err);
      }
    };
    fetchCompanyDetails();
  }, []);

  // جلب البيانات
  const fetchReport = async () => {
    if (!level || !startDate || !endDate) {
      showMessage(lang === "ar" ? "يرجى تحديد المستوى والفترة" : "Please select level and date range", "error");
      return;
    }

    // دالة لتنسيق التاريخ بالتوقيت المحلي لتجنب مشاكل UTC
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    try {
      const res = await api.get("/trial-balance", {
        params: {
          level: level.value,
          fromDate: formatDate(startDate),
          toDate: formatDate(endDate),
        },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      showMessage(lang === "ar" ? "فشل في جلب البيانات" : "Failed to fetch data", "error");
    }
  };

  // حساب الإجماليات
  const totalDebit = data.reduce((sum, r) => sum + (r.DEBIT || 0), 0);
  const totalCredit = data.reduce((sum, r) => sum + (r.CREDIT || 0), 0);

  // تصدير PDF
  const handleSavePDF = () => {
    if (data.length === 0) {
      showMessage(lang === "ar" ? "لا يوجد بيانات للتصدير." : "No data to export.", "error");
      return;
    }

    const headerContent = companyDetails
      ? `<div style="text-align: ${lang === "ar" ? "right" : "left"};">
           <div style="font-size: 22px; font-weight: bold;">${companyDetails.name}</div>
           <div>${companyDetails.location}</div>
         </div>`
      : "";

    const element = document.createElement("div");
    element.innerHTML = `
      <div style="font-family:'Cairo', Arial; padding:25px; color:#153F4D; ${lang === "ar" ? "direction:rtl; text-align:right;" : ""}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
          ${headerContent}
          <div style="font-size:24px; font-weight:700;">${t.title}</div>
        </div>

        <p><strong>${t.level}:</strong> ${level.label}</p>
        <p><strong>${t.from}:</strong> ${startDate.toLocaleDateString()} — <strong>${t.to}:</strong> ${endDate.toLocaleDateString()}</p>

        <table style="width:100%; border-collapse:collapse; margin-top:20px;">
          <thead style="background:#f2f2f2;">
            <tr>
              <th style="border:1px solid #000; padding:8px;">${t.account_no}</th>
              <th style="border:1px solid #000; padding:8px;">${t.account_name}</th>
              <th style="border:1px solid #000; padding:8px;">${t.debit}</th>
              <th style="border:1px solid #000; padding:8px;">${t.credit}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(
              (r) => `
                <tr>
                  <td style="border:1px solid #000; padding:6px;">${r.ACCNO || ""}</td>
                  <td style="border:1px solid #000; padding:6px;">${r.ACCNAME || ""}</td>
                  <td style="border:1px solid #000; padding:6px; text-align:right;">${r.DEBIT?.toLocaleString() || ""}</td>
                  <td style="border:1px solid #000; padding:6px; text-align:right;">${r.CREDIT?.toLocaleString() || ""}</td>
                </tr>`
            ).join("")}
            <tr style="font-weight:bold; background:#eee;">
              <td colspan="2">${lang === "ar" ? "الإجمالي" : "Total"}</td>
              <td style="text-align:right;">${totalDebit.toLocaleString()}</td>
              <td style="text-align:right;">${totalCredit.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: [10, 10, 25, 10],
      filename: `${t.title}_${level.label}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).toPdf().get("pdf").then((pdf) => {
      pdf.addFileToVFS("Cairo-Bold-normal.ttf", cairoFont);
      pdf.addFont("Cairo-Bold-normal.ttf", "Cairo", "normal");
      pdf.setFont("Cairo");

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        const pageWidth = pdf.internal.pageSize.getWidth();
        pdf.text(
          lang === "ar" ? `صفحة ${i} من ${pageCount}` : `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
    }).save();
  };

  return (
    <div className="report-page" ref={reportRef} dir={lang === "ar" ? "rtl" : "ltr"}>
      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      <div className="card shadow p-4 bg-white rounded-2xl">
        <h2 className="title text-center mb-4">{t.title}</h2>

        <div className="controls mb-6 flex flex-wrap gap-4">
          <div className="form-group">
            <label>{t.level}</label>
            <Select options={levels} value={level} onChange={setLevel} placeholder={t.level} />
          </div>

          <div className="form-group">
            <label>{t.from} / {t.to}</label>
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              isClearable
              dateFormat="yyyy-MM-dd"
              placeholderText={lang === "ar" ? "اختر الفترة" : "Select range"}
              className="date-input"
            />
          </div>

          <div className="form-group flex justify-end">
            <button className="primary-btn w-full" onClick={fetchReport}>
              {t.view}
            </button>
          </div>
        </div>

        {/* الجدول */}
        <div className="table-wrapper overflow-x-auto rounded-xl border border-gray-200">
          <table className="report-table w-full text-center border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th>{t.account_no}</th>
                <th>{t.account_name}</th>
                <th>{t.debit}</th>
                <th>{t.credit}</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                <>
                  {data.map((r, i) => (
                    <tr key={i}>
                      <td>{r.ACCNO}</td>
                      <td>{r.ACCNAME}</td>
                      <td>{r.DEBIT?.toLocaleString()}</td>
                      <td>{r.CREDIT?.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-200 font-semibold">
                    <td colSpan="2">{lang === "ar" ? "الإجمالي" : "Total"}</td>
                    <td>{totalDebit.toLocaleString()}</td>
                    <td>{totalCredit.toLocaleString()}</td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan="4">{t.no_data}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data.length > 0 && (
          <div className="text-center mt-6">
            <button className="primary-btn w-full" onClick={handleSavePDF}>
              {t.export}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
