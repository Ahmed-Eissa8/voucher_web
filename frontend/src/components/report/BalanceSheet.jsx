import React, { useEffect, useState } from "react";
import api from "../../api";
import html2pdf from "html2pdf.js";
import "./BalanceSheet.css";

export default function BalanceSheet({ lang }) {
  const [subbands, setSubbands] = useState([]);
  const [companyDetails, setCompanyDetails] = useState(null);

  const t = {
    ar: { title: "الميزانية العمومية", subband: "الفئة الفرعية", total: "الإجمالي", export: "تصدير PDF" },
    en: { title: "Balance Sheet", subband: "Subband", total: "Total", export: "Export PDF" },
  }[lang || "ar"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/reports/balance-sheet");
        setSubbands(res.data.subbands || []);
        const companyRes = await api.get("/company-details");
        setCompanyDetails(companyRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const calcTotal = (arr) =>
    Array.isArray(arr) ? arr.reduce((a, b) => a + (b.amount || 0), 0) : 0;

const printPDF = () => {
  const element = document.createElement("div");

  const headerContent = companyDetails
    ? `<div style="text-align: ${lang === "ar" ? "right" : "left"};">
         <div style="font-size: 22px; font-weight: bold;">${companyDetails.name}</div>
         <div>${companyDetails.location}</div>
       </div>`
    : "";

  element.innerHTML = `
    <div style="font-family: 'Cairo', Arial, sans-serif; padding: 30px; color: #153F4D;">
      
    
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 15px;">
        ${headerContent}
        <div style="font-size: 26px; font-weight: 700; text-align: ${lang === "ar" ? "left" : "right"};">
          ${t.title}
        </div>
      </div>

      <!-- محتوى التقرير -->
      <div style="${lang === 'ar' ? 'direction: rtl; text-align: right;' : 'direction: ltr; text-align: left;'} font-size: 16px;">
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 0 6px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background-color: #ffffffff;">
              <th style="border: 1px solid #153F4D; padding: 10px; font-size: 17px;">${t.subband}</th>
              <th style="border: 1px solid #153F4D; padding: 10px; text-align: end; font-size: 17px;">${t.total}</th>
            </tr>
          </thead>
          <tbody>
            ${subbands.map(s => `
              <tr>
                <td style="border: 1px solid #d1e3e3; padding: 8px;">${s.name}</td>
                <td style="border: 1px solid #d1e3e3; padding: 8px; text-align: end;">${s.amount.toLocaleString()}</td>
              </tr>
            `).join("")}
            <tr style="background-color: #f5fafb; font-weight: bold; border-top: 2px solid #153F4D;">
              <td style="padding: 10px;">${t.total}</td>
              <td style="padding: 10px; text-align: end;">${calcTotal(subbands).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
  
    </div>
  `;

  html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `${t.title}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
};




  return (
    <div className="voucher-container" dir={lang === "ar" ? "rtl" : "ltr"}>
      <h2>{t.title}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
     <thead className={lang === "ar" ? "table-head-ar" : "table-head-en"}>
  <tr>
    <th>{t.subband}</th>
    <th>{t.total}</th>
  </tr>
</thead>

        <tbody>
          {subbands.map((s, i) => (
            <tr key={i}>
              <td>{s.name}</td>
              <td style={{ textAlign: "end" }}>{s.amount.toLocaleString()}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: "bold", background: "#f0f6f6" }}>
            <td>{t.total}</td>
            <td style={{ textAlign: "end" }}>{calcTotal(subbands).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="form-actions" style={{ marginTop: "20px" }}>
        <button className="btn save" onClick={printPDF}>{t.export}</button>
      </div>
    </div>
  );
}
