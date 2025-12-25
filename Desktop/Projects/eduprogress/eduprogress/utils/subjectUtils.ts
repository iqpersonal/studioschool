import { Subject } from '../types';

export const sortSubjectsForPrint = (subjects: Subject[]): Subject[] => {
    const scienceSubjects = ['biology', 'chemistry', 'physics'];

    const sciences = subjects.filter(s =>
        scienceSubjects.includes(s.name.toLowerCase())
    );

    const others = subjects.filter(s =>
        !scienceSubjects.includes(s.name.toLowerCase())
    );

    // Sort sciences in specific order: Biology, Chemistry, Physics
    const order: { [key: string]: number } = { biology: 0, chemistry: 1, physics: 2 };
    sciences.sort((a, b) => order[a.name.toLowerCase()] - order[b.name.toLowerCase()]);

    // Return others first (alphabetically if needed, but preserving original order of others for now as per original logic), 
    // then sciences grouped at the end
    return [...others, ...sciences];
};
