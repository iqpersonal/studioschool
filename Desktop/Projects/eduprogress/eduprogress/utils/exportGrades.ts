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
        // Calculate width based on header length (min 12, max 20)
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
        const margin = 10;
        let yPosition = 12;

        // School Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.text(data.schoolName || "School", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 7;

        // Title
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Assessment Grades Report", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 7;

        // Metadata
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const gradeLine = `Grade: ${data.grade}`;
        const subjectLine = `Subject: ${data.subject}`;
        const dateLine = `Generated: ${new Date().toLocaleDateString()}`;

        doc.text(gradeLine, margin, yPosition);
        doc.text(subjectLine, pageWidth / 2 - 15, yPosition);
        doc.text(dateLine, pageWidth - margin - 40, yPosition);
        yPosition += 8;

        // Validate headers match
        const numHeaders = data.mainHeaders.length;
        const mainHeadersNormalized = data.mainHeaders.map(h => String(h || ""));
        const subHeadersNormalized = data.subHeaders.map((h, i) => i < numHeaders ? String(h || "") : "");

        // Calculate dynamic column widths
        const studentNameWidth = 20;
        const totalWidth = pageWidth - 2 * margin;
        
        const columnWidths: number[] = [];
        columnWidths.push(studentNameWidth);
        
        for (let i = 1; i < numHeaders; i++) {
            const mainHeader = mainHeadersNormalized[i] || "";
            const subHeader = subHeadersNormalized[i] || "";
            const headerText = mainHeader.length > subHeader.length ? mainHeader : subHeader;
            const calculatedWidth = Math.max(10, Math.min(headerText.length * 1.2, 25));
            columnWidths.push(calculatedWidth);
        }
        
        // Normalize widths to fit page
        const totalCalculatedWidth = columnWidths.reduce((a, b) => a + b, 0);
        const scaleFactor = totalCalculatedWidth > totalWidth 
            ? totalWidth / totalCalculatedWidth 
            : 1;
        const scaledWidths = columnWidths.map(w => w * scaleFactor);
        
        const rowHeight = 6;
        const mainHeaderHeight = 7;
        const subHeaderHeight = 5.5;

        // Helper function to draw headers and return new yPosition
        const drawHeaders = (currentY: number): number => {
            let y = currentY;

            // Main Headers Row
            doc.setFillColor(41, 128, 185);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);

            let xPos = margin;
            mainHeadersNormalized.forEach((header, colIndex) => {
                if (colIndex < scaledWidths.length) {
                    const colWidth = scaledWidths[colIndex];
                    doc.rect(xPos, y, colWidth, mainHeaderHeight, "F");
                    doc.text(
                        header,
                        xPos + colWidth / 2,
                        y + 3.5,
                        { align: "center", maxWidth: colWidth - 1 }
                    );
                    xPos += colWidth;
                }
            });
            y += mainHeaderHeight;

            // Sub Headers Row
            doc.setFillColor(100, 160, 220);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);

            xPos = margin;
            subHeadersNormalized.forEach((header, colIndex) => {
                if (colIndex < scaledWidths.length) {
                    const colWidth = scaledWidths[colIndex];
                    doc.rect(xPos, y, colWidth, subHeaderHeight, "F");
                    if (header) {
                        doc.text(
                            header,
                            xPos + colWidth / 2,
                            y + 2.8,
                            { align: "center", maxWidth: colWidth - 1 }
                        );
                    }
                    xPos += colWidth;
                }
            });
            y += subHeaderHeight;

            return y;
        };

        // Initial headers
        yPosition = drawHeaders(yPosition);

        // Data Rows
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7.5);
        let rowIndex = 0;

        data.rows.forEach((row) => {
            // Check if we need a new page
            if (yPosition + rowHeight > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
                yPosition = drawHeaders(yPosition);
            }

            // Normalize row to match header count
            const normalizedRow = row.map((c, i) => i < numHeaders ? c : null).filter(c => c !== null);

            // Alternate row colors
            if (rowIndex % 2 === 0) {
                doc.setFillColor(240, 245, 250);
                let xPos = margin;
                for (let i = 0; i < scaledWidths.length; i++) {
                    doc.rect(xPos, yPosition, scaledWidths[i], rowHeight, "F");
                    xPos += scaledWidths[i];
                }
            }

            // Draw row borders and content
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.2);

            let xPos = margin;
            normalizedRow.forEach((cell, colIndex) => {
                const colWidth = scaledWidths[colIndex];
                doc.rect(xPos, yPosition, colWidth, rowHeight);

                const alignType = colIndex === 0 ? "left" : "center";
                const textX = alignType === "left" ? xPos + 0.5 : xPos + colWidth / 2;
                
                doc.text(
                    String(cell || ""),
                    textX,
                    yPosition + 3.5,
                    { align: alignType, maxWidth: colWidth - 1 }
                );
                xPos += colWidth;
            });

            yPosition += rowHeight;
            rowIndex++;
        });

        const subject = data.subject.replace(/\s+/g, "_");
        const grade = data.grade.replace(/\s+/g, "_");
        doc.save(`${subject}_${grade}_Assessment_Grades.pdf`);
    } catch (error) {
        console.error("PDF Export Error:", error);
        throw error;
    }
};
