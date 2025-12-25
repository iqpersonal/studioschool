
const admin = require('firebase-admin');
// const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'eduprogress-app'
    });
}

const db = admin.firestore();

async function checkAllocations() {
    console.log("Fetching teacher assignments...");
    const snapshot = await db.collection('teacherAssignments').get();
    const allocations = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.grade} - ${data.section}`;
        if (!allocations[key]) allocations[key] = 0;
        allocations[key] += (data.periodsPerWeek || 0);
    });

    console.log("\n--- Allocation Report ---");
    const issues = [];
    for (const [key, total] of Object.entries(allocations)) {
        if (total !== 35) {
            issues.push({ class: key, total });
            console.log(`[WARNING] ${key}: ${total} periods (Expected 35)`);
        } else {
            // console.log(`[OK] ${key}: 35 periods`);
        }
    }

    if (issues.length === 0) {
        console.log("All classes have exactly 35 periods!");
    } else {
        console.log(`\nFound ${issues.length} classes with incorrect allocations.`);
    }
}

checkAllocations().catch(console.error);
