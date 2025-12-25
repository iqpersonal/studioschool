
// Force deploy: 2025-12-04
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functions from 'firebase-functions/v1';
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { ScopeResolver, TimetableScheduler } from './timetableEngine';

admin.initializeApp();

export const generateAIContent = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { studentName, grade, subject, performanceMetrics } = request.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new HttpsError('failed-precondition', 'API Key not configured.');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

        // Helper to get grade context (reused logic)
        const getGradeLevelContext = (gradeString: string): string => {
            const gradeNumber = parseInt(gradeString.replace(/\D/g, ''), 10);
            if (isNaN(gradeNumber)) return 'a standard school grade';
            if (gradeNumber <= 5) return `a lower grade (e.g., Grade ${gradeNumber}), so use simple, encouraging language focused on foundational skills.`;
            if (gradeNumber <= 8) return `a middle grade (e.g., Grade ${gradeNumber}), so use language that balances encouragement with a focus on growing academic responsibility.`;
            return `an upper grade (e.g., Grade ${gradeNumber}), so use more formal, academic language focused on critical thinking and independent learning.`;
        };

        const gradeContext = getGradeLevelContext(grade || '');

        const prompt = `
        You are an expert educator crafting a personalized progress report comment. Your task is to synthesize the provided performance metrics into a single, insightful, and constructive sentence.

        **Student Profile:**
        - **Name:** ${studentName}
        - **Grade Level:** The student is in ${gradeContext}
        - **Subject:** ${subject}

        **Performance Metrics:**
        - **Academic Performance:** "${performanceMetrics.academicPerformance}"
        - **Homework Effort:** "${performanceMetrics.homeworkEffort}"
        - **In-Class Participation:** "${performanceMetrics.inClassParticipation}"
        - **Conduct:** "${performanceMetrics.conduct}"

        **Critical Instructions:**
        1.  **Synthesize, Don't List:** Weave all four performance metrics into one coherent sentence. Do not list them separately.
        2.  **Grade-Appropriate Language:** Adapt your vocabulary and tone to the student's grade level as specified above.
        3.  **Subject-Specific Vocabulary:** When logical, use vocabulary relevant to the subject. For example, for "Math," mention "problem-solving" or "logical application." For "English," consider "analytical skills" or "expressive communication."
        4.  **Constructive Tone:** The tone must be professional and constructive. If performance is strong, be affirming. If there are areas for improvement, phrase it in an encouraging way that suggests a path forward (e.g., "is encouraged to," "would benefit from").
        5.  **Start with the Name:** Always begin the sentence by addressing the student by their first name.
        6.  **Output Format:** Provide ONLY the final, single-sentence comment. Do not include any headers, titles, or introductory phrases like "Here is the comment:".
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        throw new HttpsError('internal', `AI Generation Failed: ${error.message}`);
    }
});

export const generateParentAccounts = onCall(async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
        }

        const { families } = request.data;
        if (!families || !Array.isArray(families)) {
            throw new HttpsError("invalid-argument", "The function must be called with a list of families.");
        }

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const debugLogs: string[] = [];

        for (const family of families) {
            const { username, password, email, name, schoolId } = family;
            try {
                // Check if parent profile exists in Firestore
                const userQuery = await admin.firestore().collection('users')
                    .where('schoolId', '==', schoolId)
                    .where('familyUsername', '==', username)
                    .where('role', 'array-contains', 'parent')
                    .limit(1)
                    .get();

                if (!userQuery.empty) {
                    skippedCount++;
                    continue;
                }

                // Create Auth User
                let uid;
                try {
                    const userRecord = await admin.auth().createUser({
                        email: email,
                        password: password,
                        displayName: name,
                    });
                    uid = userRecord.uid;
                } catch (authError: any) {
                    if (authError.code === 'auth/email-already-exists') {
                        // If auth user exists but profile doesn't (edge case), try to find the user
                        const userRecord = await admin.auth().getUserByEmail(email);
                        uid = userRecord.uid;
                    } else {
                        throw authError;
                    }
                }

                // Create Firestore Profile
                await admin.firestore().collection('users').doc(uid).set({
                    uid: uid,
                    name: name,
                    email: email,
                    familyUsername: username,
                    schoolId: schoolId,
                    role: ['parent'],
                    status: 'active',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                createdCount++;

            } catch (error: any) {
                console.error(`Error creating account for ${username}:`, error);
                debugLogs.push(`Error for ${username}: ${error.message}`);
                errorCount++;
            }
        }

        return {
            success: true,
            created: createdCount,
            skipped: skippedCount,
            errors: errorCount,
            debugLogs: debugLogs.slice(0, 5) // Return first 5 errors for debugging
        };
    } catch (error: any) {
        console.error("Fatal error in generateParentAccounts:", error);
        // Return the error as a success response so the client can see it
        return {
            success: false,
            fatalError: error.message,
            stack: error.stack
        };
    }
});

export const generateLessonPlan = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { topic, subject, grade, duration, objectives } = request.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new HttpsError('failed-precondition', 'API Key not configured.');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

        const prompt = `
        You are an expert curriculum developer and master teacher. Create a detailed, engaging, and structured lesson plan based on the following details:

        **Lesson Details:**
        - **Topic:** ${topic}
        - **Subject:** ${subject}
        - **Grade Level:** ${grade}
        - **Duration:** ${duration}
        ${objectives ? `- **Specific Learning Objectives:** ${objectives}` : ''}

        **Required Structure (Markdown Format):**
        1.  **Lesson Title** (Creative and descriptive)
        2.  **Learning Objectives** (Bullet points, SMART goals)
        3.  **Materials Needed** (List)
        4.  **Key Vocabulary** (List of terms to define)
        5.  **Lesson Outline:**
            *   **Introduction / Hook** (Time allocation): How to grab attention and activate prior knowledge.
            *   **Direct Instruction** (Time allocation): Core content delivery.
            *   **Guided Practice** (Time allocation): Activity done together.
            *   **Independent Practice** (Time allocation): Activity done individually or in groups.
            *   **Closure** (Time allocation): Wrap up and exit ticket.
        6.  **Differentiation Strategies** (For advanced learners and those needing support)
        7.  **Assessment / Check for Understanding** (How to measure success)

        **Tone:** Professional, practical, and encouraging.
        **Output:** Provide ONLY the Markdown content.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };

    } catch (error: any) {
        console.error("AI Lesson Plan Generation Error:", error);
        throw new HttpsError('internal', `AI Generation Failed: ${error.message}`);
    }
});

export const identifyBook = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { isbn } = request.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new HttpsError('failed-precondition', 'API Key not configured.');
    }

    try {
        // 1. Fetch from Google Books API
        const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
        const bookResponse = await axios.get(googleBooksUrl);

        if (!bookResponse.data.items || bookResponse.data.items.length === 0) {
            throw new HttpsError('not-found', 'Book not found for this ISBN.');
        }

        const volumeInfo = bookResponse.data.items[0].volumeInfo;
        const title = volumeInfo.title;
        const author = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author';
        const description = volumeInfo.description || '';
        const pageCount = volumeInfo.pageCount || 0;
        const publishedDate = volumeInfo.publishedDate || '';
        const coverUrl = volumeInfo.imageLinks?.thumbnail || '';
        const googleCategory = volumeInfo.categories ? volumeInfo.categories[0] : '';

        // 2. Enhance with Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

        const prompt = `
        Analyze this book and provide metadata for a school library catalog.
        
        **Book Details:**
        - Title: ${title}
        - Author: ${author}
        - Description: ${description}
        - Category: ${googleCategory}

        **Tasks:**
        1.  **Blurb:** Write a short, engaging "Why read this?" blurb (max 2 sentences) suitable for students.
        2.  **Tags:** Generate 3-5 relevant tags (e.g., "Adventure", "Friendship", "Dystopian").
        3.  **Category:** Suggest a standardized school library category (e.g., "Fiction", "Science", "History", "Biography").

        **Output Format (JSON):**
        {
            "blurb": "...",
            "tags": ["tag1", "tag2"],
            "category": "..."
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up JSON string if needed (remove markdown code blocks)
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(jsonString);

        return {
            title,
            author,
            isbn,
            coverUrl,
            summary: description, // Keep original description as summary
            pageCount,
            publishedDate,
            blurb: aiData.blurb,
            tags: aiData.tags,
            category: aiData.category || googleCategory // Fallback
        };

    } catch (error: any) {
        console.error("Identify Book Error:", error);
        throw new HttpsError('internal', `Failed to identify book: ${error.message}`);
    }
});

export const smartSearch = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { query } = request.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new HttpsError('failed-precondition', 'API Key not configured.');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

        const prompt = `
        Extract search keywords and concepts from the following user query for a book search.
        User Query: "${query}"
        
        Return ONLY a JSON array of strings. Example: ["sad", "winter", "tragedy"]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const keywords = JSON.parse(jsonString);

        return { keywords };

    } catch (error: any) {
        console.error("Smart Search Error:", error);
        // Fallback to original query if AI fails
        return { keywords: [query] };
    }
});

export const recommendBooks = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { userHistory, availableBooks } = request.data; // availableBooks: {id, title, category}[]
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new HttpsError('failed-precondition', 'API Key not configured.');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

        const prompt = `
        Based on the user's reading history, recommend 3 books from the available list.
        
        **User History:**
        ${userHistory.join(', ')}

        **Available Books:**
        ${JSON.stringify(availableBooks)}

        **Output Format (JSON):**
        {
            "recommendations": ["bookId1", "bookId2", "bookId3"],
            "reasoning": "Because you liked..."
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const recommendationData = JSON.parse(jsonString);

        return recommendationData;

    } catch (error: any) {
        console.error("Recommendation Error:", error);
        return { recommendations: [], reasoning: "Could not generate recommendations." };
    }
});

export const onTimetableRequest = functions.runWith({
    timeoutSeconds: 540,
    memory: '1GB'
}).firestore.document('timetable_requests/{requestId}').onCreate(async (snapshot: any, context: any) => {
    const requestData = snapshot.data();
    const {
        allocations,
        timeSlots,
        existingEntries,
        schoolId,
        allTimeSlots,
        workingDays,
        scope, // 'global', 'major', 'group', 'division'
        scopeId,
        divisions, // Pass divisions for scope resolution
        teachers // Array of { uid, name, unavailableSlots }
    } = requestData;

    const allSlots = allTimeSlots || timeSlots;

    try {
        await snapshot.ref.update({ status: 'processing' });

        // 1. Filter Allocations based on Scope
        const scopedAllocations = ScopeResolver.filterAllocations(allocations, scope || 'global', scopeId, divisions);

        if (scopedAllocations.length === 0) {
            await snapshot.ref.update({ status: 'error', error: 'No allocations found for the selected scope.' });
            return;
        }
        // 1.5 Check for Under-allocation (Log Warning)
        const totalSlotsPerWeek = (workingDays?.length || 5) * allSlots.filter((s: any) => s.type === 'class').length;
        const classAllocations = new Map<string, number>();
        scopedAllocations.forEach(a => {
            const key = `${a.gradeId}-${a.sectionId}`;
            classAllocations.set(key, (classAllocations.get(key) || 0) + a.periodsPerWeek);
        });

        const underAllocatedClasses: string[] = [];
        classAllocations.forEach((total, key) => {
            if (total < totalSlotsPerWeek) {
                underAllocatedClasses.push(`${key} (${total}/${totalSlotsPerWeek})`);
            }
        });

        if (underAllocatedClasses.length > 0) {
            console.warn(`[WARNING] Under-allocated classes detected: ${underAllocatedClasses.join(', ')}. Gaps will occur.`);
            // We could update the request status with a warning here if the UI supported it.
        }

        // 2. Initialize Scheduler
        // Convert teachers array to map for Scheduler
        const teacherMap: { [id: string]: { unavailableSlots?: string[] } } = {};
        if (teachers && Array.isArray(teachers)) {
            teachers.forEach((t: any) => {
                teacherMap[t.uid] = t;
            });
        }

        const scheduler = new TimetableScheduler(allSlots, existingEntries, workingDays, teacherMap);

        console.log(`Starting deterministic generation for ${scopedAllocations.length} allocations. Scope: ${scope || 'global'}`);

        // 3. Generate Schedule
        let lastUpdate = 0; // Start at 0 to allow immediate first update
        const updateProgress = async (current: number, total: number) => {
            const now = Date.now();
            if (now - lastUpdate > 2000) { // Update max once every 2 seconds
                lastUpdate = now;
                try {
                    await snapshot.ref.update({
                        progress: { current, total }
                    });
                } catch (e) {
                    console.warn("Failed to update progress", e);
                }
            }
        };

        const { schedule, failures } = scheduler.generateSchedule(scopedAllocations, (c, t) => {
            updateProgress(c, t).catch(console.error);
        });

        // 4. Post-process results (add schoolId, etc.)
        const finalSchedule = schedule.map(entry => ({
            ...entry,
            schoolId: schoolId
        }));

        if (failures.length > 0) {
            console.warn(`Timetable generation had ${failures.length} failures:`, failures);
            // Optionally store failures in the result or a separate field
        }

        await snapshot.ref.update({
            status: 'completed',
            result: finalSchedule,
            failures: failures // Store failures so frontend can show them
        });

    } catch (error: any) {
        console.error("Fatal error in generation:", error);
        await snapshot.ref.update({ status: 'error', error: error.message });
    }
});
