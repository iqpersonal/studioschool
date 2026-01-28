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
            // CRITICAL: Set all colors and styles ONCE before loop to ensure consistency
            doc.setFillColor(220, 230, 241);      // Light blue background
            doc.setDrawColor(25, 55, 109);         // Dark blue borders
            doc.setLineWidth(0.3);
            doc.setTextColor(0, 0, 0);             // Black text
            doc.setFont("helvetica", "bold");      // Bold font
            doc.setFontSize(8);

            // Empty cells for row number and student name columns
            // Each rect() call needs proper state - set fill color before each to ensure it applies
            doc.setFillColor(220, 230, 241);  // Ensure light blue
            doc.rect(margin, y, rowNoWidth, subHeaderHeight, "FD");
            
            doc.setFillColor(220, 230, 241);  // Ensure light blue
            doc.rect(margin + rowNoWidth, y, studentNameWidth, subHeaderHeight, "FD");

            // Sub-assessment and summary headers - reads from index 1 onwards (skips 'Student Name')
            xPos = margin + rowNoWidth + studentNameWidth;
            for (let i = 0; i < numDataColumns; i++) {
                const subHeader = String(data.subHeaders[i + 1] || ""); // +1 because first is empty for student name
                
                // IMPORTANT: Reset fill color for each cell to prevent state issues
                doc.setFillColor(220, 230, 241);  // Light blue
                doc.setDrawColor(25, 55, 109);    // Dark blue border
                doc.setLineWidth(0.3);
                
                doc.rect(xPos, y, cellWidth, subHeaderHeight, "FD");
                
                if (subHeader) {
                    // Ensure text color is set to black before rendering
                    doc.setTextColor(0, 0, 0);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    
                    // Y position adjusted to 4.5 for better vertical centering in 6mm cell with font size 8
                    doc.text(
                        subHeader,
                        xPos + cellWidth / 2,
                        y + 4.5,  // Centered in 6mm tall cell
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

export interface SubAssessmentPDFData {
    schoolName: string;
    subjectName: string;
    mainAssessmentName: string;
    subAssessmentName: string;
    grade: string;
    section: string;
    maxScore: number;
    teacherName?: string;
    students: Array<{
        name: string;
        rawScore: number;
    }>;
}

export const generateSubAssessmentPDF = (data: SubAssessmentPDFData) => {
    try {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 12;
        let yPosition = 12;

        // ============= PROFESSIONAL HEADER =============
        // School Name
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text(data.schoolName || "School", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 7;

        // Report Title
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Sub-Assessment Report", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        // ============= METADATA SECTION (Two Columns - Beautiful Layout) =============
        doc.setFontSize(10);
        
        const leftX = margin;
        const rightX = pageWidth - margin;
        let metaY = yPosition;

        // LEFT COLUMN: Subject, Grade, Section, Teacher Name
        // Subject
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text("Subject:", leftX, metaY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(data.subjectName, leftX + 20, metaY);
        metaY += 5;

        // Grade
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text("Grade:", leftX, metaY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(data.grade, leftX + 20, metaY);
        metaY += 5;

        // Section
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text("Section:", leftX, metaY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(data.section, leftX + 20, metaY);
        metaY += 5;

        // Teacher Name
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text("Teacher Name:", leftX, metaY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(data.teacherName || "N/A", leftX + 20, metaY);

        // RIGHT COLUMN: Max Score, Generated (Right Aligned)
        let rightMetaY = yPosition;
        
        // Generated
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text("Generated:", rightX - 55, rightMetaY, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(new Date().toLocaleDateString(), rightX - 5, rightMetaY, { align: "right" });
        rightMetaY += 5;

        // Max Score
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 55, 109);
        doc.text("Max Score:", rightX - 55, rightMetaY, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(String(data.maxScore), rightX - 5, rightMetaY, { align: "right" });
        
        yPosition = Math.max(metaY, rightMetaY) + 7;

        // ============= TABLE SETUP =============
        const colWidth = {
            sNo: 12,
            name: 75,
            rawScore: 28,
            scorePercent: 30
        };
        
        const totalWidth = colWidth.sNo + colWidth.name + colWidth.rawScore + colWidth.scorePercent;
        const availableWidth = pageWidth - 2 * margin;
        const tableStartX = margin + (availableWidth - totalWidth) / 2;
        const headerHeight = 8;
        const rowHeight = 6;

        // ============= HEADER ROW =============
        doc.setFillColor(25, 55, 109);
        doc.setDrawColor(25, 55, 109);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);

        const headers = ["S.No", "Student Name", `Raw Score (/${data.maxScore})`, "Score %"];
        const columnWidths = [colWidth.sNo, colWidth.name, colWidth.rawScore, colWidth.scorePercent];
        
        let xPos = tableStartX;
        headers.forEach((header, idx) => {
            doc.rect(xPos, yPosition, columnWidths[idx], headerHeight, "FD");
            doc.text(
                header,
                xPos + columnWidths[idx] / 2,
                yPosition + 5.5,
                { align: "center", maxWidth: columnWidths[idx] - 1 }
            );
            xPos += columnWidths[idx];
        });
        
        yPosition += headerHeight;

        // ============= DATA ROWS =============
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setLineWidth(0.2);

        let rowIndex = 0;
        
        if (data.students.length === 0) {
            // No data message
            doc.setTextColor(120, 120, 120);
            doc.setFont("helvetica", "italic");
            doc.text("No student data available", pageWidth / 2, yPosition + 10, { align: "center" });
            yPosition += 15;
        } else {
            data.students.forEach((student, index) => {
                // Check if we need a new page
                if (yPosition + rowHeight > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;

                    // Redraw headers on new page
                    doc.setFillColor(25, 55, 109);
                    doc.setDrawColor(25, 55, 109);
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);

                    xPos = tableStartX;
                    headers.forEach((header, idx) => {
                        doc.rect(xPos, yPosition, columnWidths[idx], headerHeight, "FD");
                        doc.text(
                            header,
                            xPos + columnWidths[idx] / 2,
                            yPosition + 5.5,
                            { align: "center", maxWidth: columnWidths[idx] - 1 }
                        );
                        xPos += columnWidths[idx];
                    });
                    
                    yPosition += headerHeight;
                }

                // Alternate row background
                if (rowIndex % 2 === 0) {
                    doc.setFillColor(240, 245, 250);
                    doc.rect(tableStartX, yPosition, totalWidth, rowHeight, "F");
                }

                // Draw row borders
                doc.setDrawColor(200, 200, 200);
                xPos = tableStartX;
                
                // S.No
                doc.rect(xPos, yPosition, colWidth.sNo, rowHeight);
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text(String(index + 1), xPos + colWidth.sNo / 2, yPosition + 4.2, { align: "center" });
                xPos += colWidth.sNo;

                // Student Name
                doc.rect(xPos, yPosition, colWidth.name, rowHeight);
                doc.text(student.name, xPos + 1, yPosition + 4.2, { maxWidth: colWidth.name - 2 });
                xPos += colWidth.name;

                // Raw Score
                doc.rect(xPos, yPosition, colWidth.rawScore, rowHeight);
                doc.text(String(student.rawScore), xPos + colWidth.rawScore / 2, yPosition + 4.2, { align: "center" });
                xPos += colWidth.rawScore;

                // Score Percentage
                doc.rect(xPos, yPosition, colWidth.scorePercent, rowHeight);
                const scorePercent = data.maxScore === 0 
                    ? 0 
                    : Math.round((student.rawScore / data.maxScore) * 100);
                doc.text(String(scorePercent), xPos + colWidth.scorePercent / 2, yPosition + 4.2, { align: "center" });

                yPosition += rowHeight;
                rowIndex++;
            });
        }

        // ============= FOOTER =============
        yPosition += 4;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "italic");
        doc.text(
            `Total Students: ${data.students.length} | Report generated on ${new Date().toLocaleString()}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
        );

        // Save file
        const fileName = [data.subjectName, data.grade, data.section, data.subAssessmentName]
            .map(part => part.replace(/\s+/g, "_"))
            .join("_");
        
        doc.save(`${fileName}.pdf`);
    } catch (error) {
        console.error("Sub-Assessment PDF Export Error:", error);
        throw error;
    }
};

