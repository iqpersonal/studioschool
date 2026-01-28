import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export interface ExportGradesData {
    title: string;
    grade: string;
    subject: string;
    section: string;
    schoolName: string;
    mainHeaders: string[]; // Assessment names + summary columns
    subHeaders: string[]; // Sub-assessment names
    assessmentGroups: { name: string; colCount: number }[]; // Groups for spanning headers
    rows: (string | number)[][];
}

export const exportToExcel = (data: ExportGradesData) => {
    const sheetData: (string | number)[][] = [
        [data.title],
        [`Grade: ${data.grade} | Subject: ${data.subject} | Section: ${data.section}`],
        [],
        data.mainHeaders,
        data.subHeaders,
        ...data.rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Apply center alignment to both header rows
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let row = 3; row <= 4; row++) {
        for (let col = 0; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
            if (!ws[cellRef].a) ws[cellRef].a = {};
            ws[cellRef].a.h = "center";
            ws[cellRef].a.v = "center";
        }
    }

    // Set column widths - dynamic based on header length
    ws["!cols"] = data.mainHeaders.map((header, idx) => {
        if (idx === 0) {
            return { wch: 22 }; // Student Name
        }
        const headerLen = String(header).length;
        const width = Math.max(12, Math.min(headerLen + 2, 20));
        return { wch: width };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grades");

    const subject = data.subject.replace(/\s+/g, "_");
    const grade = data.grade.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `${subject}_${grade}_Assessment_Grades.xlsx`);
};

export const exportToPDF = (data: ExportGradesData) => {
    try {
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 8; // Reduced margin
        let yPosition = 8;

        // ============= PROFESSIONAL HEADER =============
        // School Name
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text(data.schoolName || "School", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 5;

        // Title
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Assessment Grades Report", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 4;

        // Metadata Line
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const metadata = `Grade: ${data.grade}    Subject: ${data.subject}    Section: ${data.section}    Generated: ${new Date().toLocaleDateString()}`;
        doc.text(metadata, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 5;

        // ============= TABLE SETUP =============
        const numDataColumns = data.subHeaders.length - 1;  // Exclude 'Student Name' from data columns count
        const rowNoWidth = 8; // Running number column
        const studentNameWidth = 35; // Student name column
        const totalWidth = pageWidth - 2 * margin;
        const remainingWidth = totalWidth - rowNoWidth - studentNameWidth;
        const cellWidth = remainingWidth / numDataColumns;

        const mainHeaderHeight = 6.5;
        const subHeaderHeight = 6;
        const dataRowHeight = 6;

        // Helper function to draw table headers (main + sub) with grouped headers
        const drawHeaders = (startY: number): number => {
            let y = startY;

            // ===== MAIN HEADERS ROW (Grouped) =====
            doc.setFillColor(25, 55, 109);
            doc.setDrawColor(25, 55, 109);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);

            // Row number header
            doc.rect(margin, y, rowNoWidth, mainHeaderHeight, "FD");
            doc.text(
                "S.No",
                margin + rowNoWidth / 2,
                y + 4.5,
                { align: "center" }
            );

            // Student Name header
            doc.rect(margin + rowNoWidth, y, studentNameWidth, mainHeaderHeight, "FD");
            doc.text(
                "Student Name",
                margin + rowNoWidth + studentNameWidth / 2,
                y + 4.5,
                { align: "center" }
            );

            // Assessment main headers (with grouping/spanning)
            let xPos = margin + rowNoWidth + studentNameWidth;
            
            if (data.assessmentGroups && data.assessmentGroups.length > 0) {
                data.assessmentGroups.forEach(group => {
                    const groupWidth = cellWidth * group.colCount;
                    doc.rect(xPos, y, groupWidth, mainHeaderHeight, "FD");
                    doc.text(
                        group.name,
                        xPos + groupWidth / 2,
                        y + 4.5,
                        { align: "center", maxWidth: groupWidth - 0.5 }
                    );
                    xPos += groupWidth;
                });
            }
            
            y += mainHeaderHeight;

            // ===== SUB-HEADERS ROW =====
            doc.setFillColor(220, 230, 241);
            doc.setDrawColor(25, 55, 109);
            doc.setLineWidth(0.3);
            doc.setTextColor(0, 0, 0);  // Changed to black for better contrast
            doc.setFont("helvetica", "bold");  // Bold for better visibility
            doc.setFontSize(8);

            // Empty cells for row number and student name columns
            doc.rect(margin, y, rowNoWidth, subHeaderHeight, "FD");
            doc.rect(margin + rowNoWidth, y, studentNameWidth, subHeaderHeight, "FD");

            // Sub-assessment and summary headers - reads from index 1 onwards (skips 'Student Name')
            xPos = margin + rowNoWidth + studentNameWidth;
            for (let i = 0; i < numDataColumns; i++) {
                const subHeader = String(data.subHeaders[i + 1] || ""); // +1 because first is empty for student name
                doc.rect(xPos, y, cellWidth, subHeaderHeight, "FD");
                if (subHeader) {
                    // Y position adjusted to 4.5 for better vertical centering in 6mm cell with font size 8
                    doc.text(
                        subHeader,
                        xPos + cellWidth / 2,
                        y + 4.5,  // Changed from 3.5 to 4.5 for better centering
                        { align: "center", maxWidth: cellWidth - 0.5 }
                    );
                }
                xPos += cellWidth;
            }
            y += subHeaderHeight;

            return y;
        };

        // Draw initial headers
        yPosition = drawHeaders(yPosition);

        // ============= DATA ROWS =============
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(200, 200, 200);

        let rowIndex = 0;
        data.rows.forEach((row, dataRowIndex) => {
            // Check if we need a new page
            if (yPosition + dataRowHeight > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
                yPosition = drawHeaders(yPosition);
            }

            // Alternate row background
            if (rowIndex % 2 === 0) {
                doc.setFillColor(248, 249, 250);
                doc.rect(margin, yPosition, totalWidth, dataRowHeight, "F");
            }

            // Draw borders
            doc.setLineWidth(0.2);

            // Row number cell
            doc.rect(margin, yPosition, rowNoWidth, dataRowHeight);
            doc.text(
                String(dataRowIndex + 1),
                margin + rowNoWidth / 2,
                yPosition + 4,
                { align: "center" }
            );

            // Student name cell
            doc.rect(margin + rowNoWidth, yPosition, studentNameWidth, dataRowHeight);
            let studentName = String(row[0] || "");
            
            // Truncate name if too long
            if (studentName.length > 18) {
                studentName = studentName.substring(0, 15) + "...";
            }
            
            doc.text(
                studentName,
                margin + rowNoWidth + 1,
                yPosition + 4,
                { maxWidth: studentNameWidth - 2 }
            );

            // Score cells
            let xPos = margin + rowNoWidth + studentNameWidth;
            for (let i = 1; i < row.length && i <= numDataColumns; i++) {
                doc.rect(xPos, yPosition, cellWidth, dataRowHeight);
                const cellValue = String(row[i] || "");
                doc.text(
                    cellValue,
                    xPos + cellWidth / 2,
                    yPosition + 4,
                    { align: "center", maxWidth: cellWidth - 0.5 }
                );
                xPos += cellWidth;
            }

            yPosition += dataRowHeight;
            rowIndex++;
        });

        // ============= FOOTER =============
        yPosition += 2;
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "italic");
        doc.text(
            `Report generated on ${new Date().toLocaleString()}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
        );

        const subject = data.subject.replace(/\s+/g, "_");
        const grade = data.grade.replace(/\s+/g, "_");
        doc.save(`${subject}_${grade}_Assessment_Grades.pdf`);
    } catch (error) {
        console.error("PDF Export Error:", error);
        throw error;
    }
};
