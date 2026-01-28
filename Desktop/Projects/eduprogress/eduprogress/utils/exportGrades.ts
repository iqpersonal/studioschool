import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export interface ExportGradesData {
    title: string;
    grade: string;
    subject: string;
    section: string;
    schoolName: string;
    mainHeaders: string[];
    subHeaders: string[];
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
        const margin = 15;
        let yPosition = 15;

        // ============= PROFESSIONAL HEADER =============
        // School Name
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109); // Professional dark blue
        doc.text(data.schoolName || "School", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 8;

        // Title
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Assessment Grades Report", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 7;

        // Metadata Line
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const metadata = `Grade: ${data.grade}    Subject: ${data.subject}    Section: ${data.section}    Generated: ${new Date().toLocaleDateString()}`;
        doc.text(metadata, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 10;

        // ============= TABLE SETUP =============
        const numHeaders = data.mainHeaders.length;
        const studentNameWidth = 35; // Wider for full names
        const totalWidth = pageWidth - 2 * margin;
        const remainingWidth = totalWidth - studentNameWidth;
        const cellWidth = remainingWidth / (numHeaders - 1); // -1 because first column is student name

        const mainHeaderHeight = 8;
        const subHeaderHeight = 7;
        const dataRowHeight = 8;

        // Helper function to draw table headers (main + sub)
        const drawHeaders = (startY: number): number => {
            let y = startY;

            // ===== MAIN HEADERS ROW =====
            doc.setFillColor(25, 55, 109); // Professional dark blue
            doc.setDrawColor(25, 55, 109);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);

            // Student Name header
            doc.rect(margin, y, studentNameWidth, mainHeaderHeight, "FD");
            doc.text(
                "Student Name",
                margin + studentNameWidth / 2,
                y + 5.5,
                { align: "center" }
            );

            // Assessment headers (spanning their sub-assessments)
            let xPos = margin + studentNameWidth;
            for (let i = 1; i < numHeaders; i++) {
                const header = String(data.mainHeaders[i] || "");
                doc.rect(xPos, y, cellWidth, mainHeaderHeight, "FD");
                doc.text(
                    header,
                    xPos + cellWidth / 2,
                    y + 5.5,
                    { align: "center", maxWidth: cellWidth - 1 }
                );
                xPos += cellWidth;
            }
            y += mainHeaderHeight;

            // ===== SUB-HEADERS ROW =====
            doc.setFillColor(220, 230, 241); // Light blue
            doc.setDrawColor(25, 55, 109);
            doc.setTextColor(25, 55, 109);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);

            // Empty cell under Student Name
            doc.rect(margin, y, studentNameWidth, subHeaderHeight, "FD");

            // Sub-assessment headers
            xPos = margin + studentNameWidth;
            for (let i = 1; i < numHeaders; i++) {
                const subHeader = String(data.subHeaders[i] || "");
                doc.rect(xPos, y, cellWidth, subHeaderHeight, "FD");
                if (subHeader) {
                    doc.text(
                        subHeader,
                        xPos + cellWidth / 2,
                        y + 4.5,
                        { align: "center", maxWidth: cellWidth - 1 }
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
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(150, 150, 150);

        let rowIndex = 0;
        data.rows.forEach((row) => {
            // Check if we need a new page
            if (yPosition + dataRowHeight > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
                yPosition = drawHeaders(yPosition);
            }

            // Alternate row background (subtle)
            if (rowIndex % 2 === 0) {
                doc.setFillColor(248, 249, 250);
                doc.rect(margin, yPosition, totalWidth, dataRowHeight, "F");
            }

            // Draw borders (cleaner - just outer and row separators)
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);

            // Student name cell
            doc.rect(margin, yPosition, studentNameWidth, dataRowHeight);
            const studentName = String(row[0] || "");
            doc.text(
                studentName,
                margin + 2,
                yPosition + 5,
                { maxWidth: studentNameWidth - 3 }
            );

            // Score cells
            let xPos = margin + studentNameWidth;
            for (let i = 1; i < row.length && i < numHeaders; i++) {
                doc.rect(xPos, yPosition, cellWidth, dataRowHeight);
                const cellValue = String(row[i] || "");
                doc.text(
                    cellValue,
                    xPos + cellWidth / 2,
                    yPosition + 5,
                    { align: "center", maxWidth: cellWidth - 1 }
                );
                xPos += cellWidth;
            }

            yPosition += dataRowHeight;
            rowIndex++;
        });

        // ============= FOOTER =============
        yPosition += 5;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "italic");
        doc.text(
            `Report generated on ${new Date().toLocaleString()}`,
            pageWidth / 2,
            pageHeight - 10,
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
