import React, { useState, useRef, useEffect } from "react";
import api from "../../api";
import html2pdf from "html2pdf.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import "./BalanceSheet.css";
import cairoFont from "./Cairo-Bold-normal.js";

export default function AccountStatement({ lang }) {
  const [subNo, setSubNo] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [data, setData] = useState([]);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [accountOptions, setAccountOptions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [message, setMessage] = useState(null);
  const reportRef = useRef();

  const t = {
    ar: {
      title: "كشف حساب",
      account: "اسم الحساب",
      journal_no: "رقم القيد",
      debit: "مدين",
      credit: "دائن",
      running: "الرصيد الجاري",
      desc: "الوصف",
      ref: "المرجع",
      date: "التاريخ",
      period: "الفترة",
      overall: "الرصيد النهائي",
      movement: "حركة الفترة",
      balance: "رصيد الفترة",
      export: "تصدير PDF",
      no_data: "لا توجد بيانات لعرضها",
    },
    en: {
      title: "Account Statement",
      account: "Account Name",
      journal_no: "Journal No",
      debit: "Debit",
      credit: "Credit",
      running: "Running Balance",
      desc: "Description",
      ref: "Reference",
      date: "Date",
      period: "Period",
      overall: "Final Balance",
      movement: "Period Movement",
      balance: "Period Balance",
      export: "Export PDF",
      no_data: "No data to display",
    },
  }[lang || "ar"];

  // دالة الرسائل
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

  const fetchAccounts = async (inputValue) => {
    if (!inputValue) return;
    try {
      const res = await api.get("/accounts1", {
        params: { search: inputValue },
      });
      const options = res.data.map((acc) => ({
        value: acc.sub_no.toString(),
        label: acc.name,
      }));
      setAccountOptions(options);
    } catch (err) {
      console.error("فشل في جلب الحسابات:", err);
      showMessage(lang === "ar" ? "فشل في جلب الحسابات" : "Failed to fetch accounts", "error");
    }
  };

  const fetchReport = async () => {
    if (!subNo || !startDate || !endDate) {
      showMessage(lang === "ar" ? "يرجى إدخال رقم الحساب وتحديد الفترة" : "Please select account and date range", "error");
      return;
    }

    try {
      const res = await api.get("/account-statement", {
        params: {
          sub_no: subNo,
          fdate: startDate.toISOString().split("T")[0],
          ldate: endDate.toISOString().split("T")[0],
        },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      showMessage(lang === "ar" ? "فشل في جلب البيانات" : "Failed to fetch data", "error");
    }
  };

  const totalDr = data.reduce((sum, row) => sum + Number(row.journal_dr || 0), 0);
  const totalCr = data.reduce((sum, row) => sum + Number(row.journal_cr || 0), 0);

const handleSavePDF = () => {
  if (data.length === 0 || !selectedAccount) {
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
  const accountName = selectedAccount.label;
  const periodBalance = Number(data[0]?.period_balance ?? 0).toLocaleString();
  const finalBalance = Number(data[0]?.final_balance ?? 0).toLocaleString();
  const periodText = startDate && endDate
    ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    : "";

  element.innerHTML = `
    <div style="font-family: 'Cairo', Arial, sans-serif; padding: 20px; color: #153F4D; ${lang === "ar" ? "direction: rtl; text-align: right;" : ""}">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
        ${headerContent}
        <div style="font-size: 24px; font-weight: 700;">${t.title}</div>
      </div>

      <p style="margin-top: 60px;"><strong>${t.account}:</strong> ${accountName}</p>
      <p><strong>${t.period}:</strong> ${periodText}</p>

      <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr>
            <th style="border:1px solid #000; padding:8px;">${t.journal_no}</th>
            <th style="border:1px solid #000; padding:8px;">${t.debit}</th>
            <th style="border:1px solid #000; padding:8px;">${t.credit}</th>
            <th style="border:1px solid #000; padding:8px;">${t.running}</th>
            <th style="border:1px solid #000; padding:8px;">${t.desc}</th>
            <th style="border:1px solid #000; padding:8px;">${t.ref}</th>
            <th style="border:1px solid #000; padding:8px;">${t.date}</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td style="border:1px solid #000; padding:8px;">${row.journal_no}</td>
              <td style="border:1px solid #000; padding:8px;">${Number(row.journal_dr).toLocaleString()}</td>
              <td style="border:1px solid #000; padding:8px;">${Number(row.journal_cr).toLocaleString()}</td>
              <td style="border:1px solid #000; padding:8px;">${Number(row.running_balance).toLocaleString()}</td>
              <td style="border:1px solid #000; padding:8px;">${row.journal_desc}</td>
              <td style="border:1px solid #000; padding:8px;">${row.journal_docno}</td>
              <td style="border:1px solid #000; padding:8px;">${new Date(row.journal_date).toLocaleDateString("en-GB")}</td>
            </tr>`).join("")}
          <tr style="font-weight:bold; background:#f0f0f0;">
            <td>${t.movement}</td>
            <td>${totalDr.toLocaleString()}</td>
            <td>${totalCr.toLocaleString()}</td>
            <td colspan="4"></td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top:20px;">
        <strong>${t.balance}:</strong> ${periodBalance}<br>
        <strong>${t.overall}:</strong> ${finalBalance}
      </p>
    </div>
  `;

  const opt = {
    margin: [10, 10, 25, 10],
    filename: `${accountName}_${t.title}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: 'portrait' },
  };

  html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
    pdf.addFileToVFS("Cairo-Bold-normal.ttf", cairoFont);
    pdf.addFont("Cairo-Bold-normal.ttf", "Cairo", "normal");
    pdf.setFont("Cairo");

    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      const pageWidth = pdf.internal.pageSize.getWidth();
pdf.text(
  lang === "ar" 
    ? `صفحة ${i} من ${pageCount}` 
    : `Page ${i} of ${pageCount}`,
  pageWidth / 2, 
  pdf.internal.pageSize.getHeight() - 10,
  { align: "center" } 
);

    }

  }).save(`${accountName}_${t.title}.pdf`).then(() => showMessage(lang === "ar" ? "تم التصدير بنجاح" : "Exported successfully", "success"));
};


  return (
    <div className="report-page" ref={reportRef} dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* الرسائل */}
      {message && (
        <div className={`toast ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="card shadow p-4 bg-white rounded-2xl">
        <h2 className="title text-center mb-4">{t.title}</h2>

        <div className="controls mb-6">
          <div className="form-group">
            <label className="input-label">{t.account}</label>
            <Select
  placeholder={lang === "ar" ? "اكتب اسم الحساب..." : "Type account name..."}
  value={selectedAccount}
  onInputChange={(inputValue, { action }) => {
    if (action === "input-change" && inputValue.trim().length >= 1) {
      fetchAccounts(inputValue);
    }
    return inputValue;
  }}
  onChange={(opt) => {
    setSelectedAccount(opt);
    setSubNo(opt?.value || "");
  }}
  options={accountOptions}
  isClearable
/>

          </div>

          <div className="form-group">
            <label className="input-label">{t.period}</label>
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              isClearable
              dateFormat="yyyy-MM-dd"
              placeholderText={lang === "ar" ? "اختر الفترة" : "Select date range"}
              className="date-input"
            />
          </div>

          <div className="form-group flex justify-end">
            <button className="primary-btn w-full" onClick={fetchReport}>
              {lang === "ar" ? "عرض" : "View"}
            </button>
          </div>
        </div>

        {startDate && endDate && (
          <p className="text-center text-gray-600 mb-4">
            <strong>{t.period}:</strong> {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        )}

        <div className="table-wrapper overflow-x-auto rounded-xl border border-gray-200">
          <table className="report-table w-full text-center border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th>{t.journal_no}</th>
                <th>{t.debit}</th>
                <th>{t.credit}</th>
                <th>{t.running}</th>
                <th>{t.desc}</th>
                <th>{t.ref}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                <>
                  {data.map((row, i) => (
                    <tr key={i}>
                      <td>{row.journal_no}</td>
                      <td>{Number(row.journal_dr).toLocaleString()}</td>
                      <td>{Number(row.journal_cr).toLocaleString()}</td>
                      <td>{Number(row.running_balance).toLocaleString()}</td>
                      <td>{row.journal_desc}</td>
                      <td>{row.journal_docno}</td>
                      <td>{new Date(row.journal_date).toLocaleDateString("en-GB")}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-200 font-semibold">
                    <td>{t.movement}</td>
                    <td>{totalDr.toLocaleString()}</td>
                    <td>{totalCr.toLocaleString()}</td>
                    <td colSpan={4}></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan="7">{t.no_data}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data.length > 0 && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <p><strong>{t.balance}:</strong> {Number(data[0]?.period_balance ?? 0).toLocaleString()}</p>
            <p><strong>{t.overall}:</strong> {Number(data[0]?.final_balance ?? 0).toLocaleString()}</p>
          </div>
        )}

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
