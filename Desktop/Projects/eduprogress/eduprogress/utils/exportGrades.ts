import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ExportGradesData {
    title: string;
    grade: string;
    subject: string;
    section: string;
    headers: string[];
    rows: (string | number)[][];
}

export const exportToExcel = (data: ExportGradesData) => {
    const ws = XLSX.utils.aoa_to_sheet([
        [data.title],
        [Grade:  | Subject:  | Section: ],
        [],
        data.headers,
        ...data.rows
    ]);
    
    // Set column widths
    ws['!cols'] = Array(data.headers.length).fill({ wch: 15 });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Grades');
    
    // Generate filename
    const subject = data.subject.replace(/\s+/g, '_');
    const grade = data.grade.replace(/\s+/g, '_');
    XLSX.writeFile(wb, ${subject}__Grades.xlsx);
};

export const exportToPDF = (data: ExportGradesData) => {
    const doc = new jsPDF() as any;
    
    // Add title
    doc.setFontSize(16);
    doc.text(data.title, 14, 15);
    
    // Add metadata
    doc.setFontSize(10);
    doc.text(Grade:  | Subject:  | Section: , 14, 25);
    
    // Add date
    const now = new Date().toLocaleDateString();
    doc.text(Generated: , 14, 32);
    
    // Add table
    doc.autoTable({
        head: [data.headers],
        body: data.rows.map(row => row.map(cell => String(cell))),
        startY: 40,
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240],
        },
    });
    
    // Generate filename
    const subject = data.subject.replace(/\s+/g, '_');
    const grade = data.grade.replace(/\s+/g, '_');
    doc.save(${subject}__Grades.pdf);
};
