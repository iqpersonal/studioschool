import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export interface ExportGradesData {
    title: string;
    grade: string;
    subject: string;
    section: string;
    headers: string[];
    rows: (string | number)[][];
}

export const exportToExcel = (data: ExportGradesData) => {
    const metadata = `Grade: ${data.grade} | Subject: ${data.subject} | Section: ${data.section}`;
    const ws = XLSX.utils.aoa_to_sheet([
        [data.title],
        [metadata],
        [],
        data.headers,
        ...data.rows
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grades");
    
    const subject = data.subject.replace(/\s+/g, "_");
    const grade = data.grade.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `${subject}_${grade}_Grades.xlsx`);
};

export const exportToPDF = (data: ExportGradesData) => {
    const doc = new jsPDF();
    const metadata = `Grade: ${data.grade} | Subject: ${data.subject} | Section: ${data.section}`;
    const dateStr = new Date().toLocaleDateString();
    
    doc.setFontSize(16);
    doc.text(data.title, 14, 15);
    
    doc.setFontSize(10);
    doc.text(metadata, 14, 25);
    doc.text(`Generated: ${dateStr}`, 14, 32);
    
    (doc as any).autoTable({
        head: [data.headers],
        body: data.rows.map(row => row.map(cell => String(cell))),
        startY: 40,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 240, 240] },
    });
    
    const subject = data.subject.replace(/\s+/g, "_");
    const grade = data.grade.replace(/\s+/g, "_");
    doc.save(`${subject}_${grade}_Grades.pdf`);
};