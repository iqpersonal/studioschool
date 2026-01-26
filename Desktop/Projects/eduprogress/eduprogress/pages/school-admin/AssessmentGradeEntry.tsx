import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export interface ExportGradesData {
    title: string;
    grade: string;
    subject: string;
    section: string;
    schoolName: string;
    headers: string[];
    rows: (string | number)[][];
    assessmentStructure?: any;
    teacherName?: string;
    mainAssessments?: Array<{ name: string; weightage: number; subCount: number }>;
}

export const exportToExcel = (data: ExportGradesData) => {
    const metadata = `Grade: ${data.grade} | Section: ${data.section} | Subject: ${data.subject} | School: ${data.schoolName}`;
    
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

const splitHeaderText = (text: string, maxLength: number = 8): string[] => {
    if (text.length <= maxLength) return [text];
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = currentLine ? currentLine + " " + word : word;
        }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
};

export const exportToPDF = (data: ExportGradesData) => {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });
    
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 8;
    let yPosition = 10;
    
    // Color scheme
    const primaryColor = [25, 103, 175]; // Professional blue
    const headerBg = [25, 103, 175];
    const headerText = [255, 255, 255];
    const alternateRow = [245, 248, 252]; // Very light blue
    const textDark = [30, 30, 30];
    const textGray = [70, 70, 70];
    
    // ===== Header Section =====
    // School Name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(data.schoolName, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
    
    // Report Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text("Assessment Grades Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 7;
    
    // Divider line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
    
    // Metadata Line 1: Grade (left), Subject (center), Generated (right)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textGray);
    
    const gradeLine = `Grade: ${data.grade} | Section: ${data.section}`;
    const subjectLine = `Subject: ${data.subject}`;
    const generatedLine = `Generated: ${new Date().toLocaleDateString()}`;
    
    doc.text(gradeLine, margin, yPosition);
    doc.text(subjectLine, pageWidth / 2, yPosition, { align: "center" });
    doc.text(generatedLine, pageWidth - margin, yPosition, { align: "right" });
    yPosition += 6;
    
    // Teacher Name Line (if available) - centered
    if (data.teacherName) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textGray);
        doc.text(`Teacher: ${data.teacherName}`, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;
    }
    
    yPosition += 2;
    
    // ===== Table Setup =====
    const srNoWidth = 7;
    const studentWidth = 50;
    const remainingWidth = pageWidth - margin * 2 - srNoWidth - studentWidth;
    const scoreColWidth = remainingWidth / (data.headers.length - 1);
    
    const rowHeight = 5.5;
    const headerHeight1 = 8;
    const headerHeight2 = 8;
    
    // ===== Draw Table Header =====
    const drawTableHeader = (startY: number) => {
        let currentY = startY;
        
        // Header Row 1 - Main Assessments
        doc.setFillColor(...headerBg);
        doc.rect(margin, currentY, pageWidth - 2 * margin, headerHeight1, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...headerText);
        doc.setFontSize(8);
        
        let xPos = margin + 0.5;
        
        // S.No
        doc.text("S.No", xPos + srNoWidth / 2, currentY + headerHeight1 / 2 + 1, { align: "center" });
        xPos += srNoWidth;
        
        // Student Name
        doc.text("Student Name", xPos + 2, currentY + headerHeight1 / 2 + 1);
        xPos += studentWidth;
        
        // Main Assessments
        if (data.mainAssessments && data.mainAssessments.length > 0) {
            data.mainAssessments.forEach(mainAssessment => {
                const mainWidth = scoreColWidth * mainAssessment.subCount;
                const mainLabel = `${mainAssessment.name} (${mainAssessment.weightage}%)`;
                doc.text(mainLabel, xPos + mainWidth / 2, currentY + headerHeight1 / 2 + 1, { 
                    align: "center", 
                    maxWidth: mainWidth - 1 
                });
                xPos += mainWidth;
            });
        } else {
            for (let i = 1; i < data.headers.length; i++) {
                doc.text("", xPos + scoreColWidth / 2, currentY + headerHeight1 / 2 + 1, { align: "center" });
                xPos += scoreColWidth;
            }
        }
        
        currentY += headerHeight1;
        
        // Header Row 2 - Sub Assessments
        doc.setFillColor(...headerBg);
        doc.rect(margin, currentY, pageWidth - 2 * margin, headerHeight2, "F");
        
        xPos = margin + 0.5;
        
        // Empty cells for S.No and Student Name
        xPos += srNoWidth + studentWidth;
        
        // Sub Assessment Names
        for (let i = 1; i < data.headers.length; i++) {
            const lines = splitHeaderText(String(data.headers[i]), 8);
            const headerX = xPos + scoreColWidth / 2;
            
            if (lines.length === 1) {
                doc.text(lines[0], headerX, currentY + headerHeight2 / 2 + 1, { align: "center", maxWidth: scoreColWidth - 1 });
            } else {
                doc.text(lines[0], headerX, currentY + 3.5, { align: "center", maxWidth: scoreColWidth - 1 });
                doc.text(lines[1], headerX, currentY + 6.5, { align: "center", maxWidth: scoreColWidth - 1 });
            }
            xPos += scoreColWidth;
        }
        
        return currentY + headerHeight2;
    };
    
    yPosition = drawTableHeader(yPosition);
    
    // ===== Table Rows =====
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textDark);
    doc.setFontSize(7.5);
    
    data.rows.forEach((row, dataRowIndex) => {
        // Page break check
        if (yPosition + rowHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
            yPosition = drawTableHeader(yPosition);
        }
        
        // Alternating row background
        if (dataRowIndex % 2 === 1) {
            doc.setFillColor(...alternateRow);
            doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "F");
        }
        
        // Row border
        doc.setDrawColor(200, 210, 220);
        doc.setLineWidth(0.2);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight);
        
        doc.setTextColor(...textDark);
        let xPos = margin + 0.5;
        
        // S.No - Centered
        doc.text(String(dataRowIndex + 1), xPos + srNoWidth / 2, yPosition + rowHeight / 2 + 1, { align: "center" });
        xPos += srNoWidth;
        
        // Student Name
        const studentName = String(row[0]).substring(0, 40);
        doc.setTextColor(...textDark);
        doc.text(studentName, xPos + 2, yPosition + rowHeight / 2 + 1, { maxWidth: studentWidth - 3 });
        xPos += studentWidth;
        
        // Score columns - Centered
        for (let i = 1; i < row.length; i++) {
            doc.setTextColor(...textGray);
            const cellValue = String(row[i]);
            doc.text(cellValue, xPos + scoreColWidth / 2, yPosition + rowHeight / 2 + 1, { align: "center" });
            xPos += scoreColWidth;
        }
        
        yPosition += rowHeight;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        margin,
        pageHeight - 5
    );
    
    const totalPages = (doc as any).internal.pages.length - 1;
    if (totalPages > 0) {
        doc.text(
            `Page ${totalPages}`,
            pageWidth - margin - 20,
            pageHeight - 5
        );
    }
    
    const subject = data.subject.replace(/\s+/g, "_");
    const grade = data.grade.replace(/\s+/g, "_");
    doc.save(`${subject}_${grade}_Assessment_Grades.pdf`);
};
