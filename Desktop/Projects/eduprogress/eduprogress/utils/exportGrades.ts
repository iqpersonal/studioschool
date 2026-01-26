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

    // Apply center alignment to headers (rows 4 and 5, which are indices 3 and 4)
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let row = 3; row <= 4; row++) {
        for (let col = 0; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
            ws[cellRef].a = { h: "center", v: "center" };
        }
    }

    // Set column widths for better appearance
    ws["!cols"] = Array(range.e.c + 1).fill(null).map((_, idx) => ({
        wch: idx === 0 ? 25 : 12
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grades");

    const subject = data.subject.replace(/\s+/g, "_");
    const grade = data.grade.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `${subject}_${grade}_Assessment_Grades.xlsx`);
};

export const exportToPDF = (data: ExportGradesData) => {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let yPosition = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(data.schoolName, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Assessment Grades Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    // Metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const gradeLine = `Grade: ${data.grade}`;
    const subjectLine = `Subject: ${data.subject}`;
    const dateLine = `Generated: ${new Date().toLocaleDateString()}`;

    doc.text(gradeLine, margin, yPosition);
    doc.text(subjectLine, pageWidth / 2 - 20, yPosition);
    doc.text(dateLine, pageWidth - margin - 50, yPosition);
    yPosition += 10;

    // Calculate column widths
    const numCols = data.mainHeaders.length;
    const colWidth = (pageWidth - 2 * margin) / numCols;
    const rowHeight = 7;
    const headerHeight = 10;

    // Main Headers Row
    doc.setFillColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);

    data.mainHeaders.forEach((header, colIndex) => {
        const xPos = margin + colIndex * colWidth;
        doc.rect(xPos, yPosition, colWidth, headerHeight, "F");
        doc.text(
            String(header),
            xPos + colWidth / 2,
            yPosition + 5,
            { align: "center", maxWidth: colWidth - 2 }
        );
    });
    yPosition += headerHeight;

    // Sub Headers Row
    doc.setFillColor(100, 160, 220);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);

    data.subHeaders.forEach((header, colIndex) => {
        const xPos = margin + colIndex * colWidth;
        doc.rect(xPos, yPosition, colWidth, headerHeight / 2, "F");
        if (header) {
            doc.text(
                String(header),
                xPos + colWidth / 2,
                yPosition + 3,
                { align: "center", maxWidth: colWidth - 2 }
            );
        }
    });
    yPosition += headerHeight / 2;

    // Data Rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    let rowIndex = 0;

    data.rows.forEach((row, dataRowIndex) => {
        // Check if we need a new page
        if (yPosition + rowHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;

            // Repeat headers on new page
            doc.setFillColor(41, 128, 185);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);

            data.mainHeaders.forEach((header, colIndex) => {
                const xPos = margin + colIndex * colWidth;
                doc.rect(xPos, yPosition, colWidth, headerHeight, "F");
                doc.text(
                    String(header),
                    xPos + colWidth / 2,
                    yPosition + 5,
                    { align: "center", maxWidth: colWidth - 2 }
                );
            });
            yPosition += headerHeight;

            doc.setFillColor(100, 160, 220);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);

            data.subHeaders.forEach((header, colIndex) => {
                const xPos = margin + colIndex * colWidth;
                doc.rect(xPos, yPosition, colWidth, headerHeight / 2, "F");
                if (header) {
                    doc.text(
                        String(header),
                        xPos + colWidth / 2,
                        yPosition + 3,
                        { align: "center", maxWidth: colWidth - 2 }
                    );
                }
            });
            yPosition += headerHeight / 2;

            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
        }

        // Alternate row colors
        if (rowIndex % 2 === 0) {
            doc.setFillColor(240, 245, 250);
            doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "F");
        }

        // Draw row borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);

        row.forEach((cell, colIndex) => {
            const xPos = margin + colIndex * colWidth;
            doc.rect(xPos, yPosition, colWidth, rowHeight);

            // Left-align first column (student names), center-align others
            const alignType = colIndex === 0 ? "left" : "center";
            doc.text(
                String(cell),
                alignType === "left" ? xPos + 2 : xPos + colWidth / 2,
                yPosition + 4,
                { align: alignType, maxWidth: colWidth - 2 }
            );
        });

        yPosition += rowHeight;
        rowIndex++;
    });

    const subject = data.subject.replace(/\s+/g, "_");
    const grade = data.grade.replace(/\s+/g, "_");
    doc.save(`${subject}_${grade}_Assessment_Grades.pdf`);
};
