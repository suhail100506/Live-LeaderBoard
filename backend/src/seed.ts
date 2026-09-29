import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { User } from './models/User';
import { Question } from './models/Question';
import { Assessment } from './models/Assessment';
import { StudentAssignment } from './models/StudentAssignment';
import { Submission } from './models/Submission';
import { Evaluation } from './models/Evaluation';
import { AuditLog } from './models/AuditLog';

dotenv.config({ path: path.join(__dirname, '../.env') });

export const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/live_leaderboard_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    console.log('[Seed] Connected to MongoDB. Seeding initial data with 66 official SECE students & 6 problems...');

    // Clear old data to remove already created students & old records
    await User.deleteMany({});
    await Question.deleteMany({});
    await Assessment.deleteMany({});
    await StudentAssignment.deleteMany({});
    await Submission.deleteMany({});
    await Evaluation.deleteMany({});
    await AuditLog.deleteMany({});

    // Clean up any old demo screenshot files
    const uploadsDir = path.join(__dirname, '../../uploads/submissions');
    if (fs.existsSync(uploadsDir)) {
      const existingFiles = fs.readdirSync(uploadsDir);
      for (const file of existingFiles) {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
        } catch {
          // ignore
        }
      }
    } else {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 1. Create Admin Account
    const adminPasswordHash = await bcrypt.hash('anandaraj.a@sece.ac.in', 10);
    const admin = await User.create({
      name: 'Prof. Anandaraj A',
      email: 'anandaraj.a@sece.ac.in',
      passwordHash: adminPasswordHash,
      role: 'admin',
      department: 'Department of Computer Science & Engineering',
      section: 'Staff',
      year: 0
    });

    // 2. Official 66 Students List (Password = Email)
    const officialStudentsRaw = [
      { name: 'SANJAI G', email: 'sanjai.g2026@sece.ac.in' },
      { name: 'SANJAY KUMAR K', email: 'sanjaykumar.k2026@sece.ac.in' },
      { name: 'SANJAY S', email: 'sanjay.s2026@sece.ac.in' },
      { name: 'SANJEEV RAHUL S', email: 'sanjeevrahul.s2026@sece.ac.in' },
      { name: 'SANJITH VIKRAM S R', email: 'sanjithvikram.sr2026@sece.ac.in' },
      { name: 'SANTHIYA S', email: 'santhiya.s2026@sece.ac.in' },
      { name: 'SANTHOSBABU G', email: 'santhosbabu.g2026@sece.ac.in' },
      { name: 'SANTHOSH D', email: 'santhosh.d2026@sece.ac.in' },
      { name: 'SANTHOSH SHASHANK S', email: 'santhoshshashank.s2026@sece.ac.in' },
      { name: 'SANTHOSHKUMAR S', email: 'santhoshkumar.s2026@sece.ac.in' },
      { name: 'SARAN M', email: 'saran.m2026@sece.ac.in' },
      { name: 'SARAN P', email: 'saran.p2026@sece.ac.in' },
      { name: 'SARANAPRIYAN S', email: 'saranapriyan.s2026@sece.ac.in' },
      { name: 'SARANSADHUVI S', email: 'saransadhuvi.s2026@sece.ac.in' },
      { name: 'SARAVANAKUMAR M', email: 'saravanakumar.m2026@sece.ac.in' },
      { name: 'SARMADHA K', email: 'sarmadha.k2026@sece.ac.in' },
      { name: 'SARUGESH T', email: 'sarugesh.t2026@sece.ac.in' },
      { name: 'SAWRABHI S', email: 'sawrabhi.s2026@sece.ac.in' },
      { name: 'SELVABHARATHI K', email: 'selvabharathi.k2026@sece.ac.in' },
      { name: 'SELVAKUMARAN R', email: 'selvakumaran.r2026@sece.ac.in' },
      { name: 'SENTHIL VIKAAS V', email: 'senthilvikaas.v2026@sece.ac.in' },
      { name: 'SHAJITHA R', email: 'shajitha.r2026@sece.ac.in' },
      { name: 'SHANMATHI N', email: 'shanmathi.n2026@sece.ac.in' },
      { name: 'SHAZIYA SHERIN H', email: 'shaziyasherin.h2026@sece.ac.in' },
      { name: 'SHEIK FARITH M', email: 'sheikfarith.m2026@sece.ac.in' },
      { name: 'SHIVA SANKARAN M', email: 'shivasankaran.m2026@sece.ac.in' },
      { name: 'SHIVAM KUMAR SAH', email: 'shivamkumar.sah2026@sece.ac.in' },
      { name: 'SHWETHAA S', email: 'shwethaa.s2026@sece.ac.in' },
      { name: 'SIVA SWARNESH S', email: 'sivaswarnesh.s2026@sece.ac.in' },
      { name: 'SOBIKA G', email: 'sobika.g2026@sece.ac.in' },
      { name: 'SREESANTH MANI', email: 'sreesanth.mani2026@sece.ac.in' },
      { name: 'SRI NAVAVISHAL T', email: 'srinavavishal.t2026@sece.ac.in' },
      { name: 'SRIDHARAN R', email: 'sridharan.r2026@sece.ac.in' },
      { name: 'SRIHARINI C', email: 'sriharini.c2026@sece.ac.in' },
      { name: 'SRIMATHI R', email: 'srimathi.r2026@sece.ac.in' },
      { name: 'SRISARAN R K', email: 'srisaran.rk2026@sece.ac.in' },
      { name: 'SRIVIKA Y', email: 'srivika.y2026@sece.ac.in' },
      { name: 'SUBASRI R A', email: 'subasri.ra2026@sece.ac.in' },
      { name: 'SUNDARAMOORTHY N', email: 'sundaramoorthy.n2026@sece.ac.in' },
      { name: 'SUTHISH S', email: 'suthish.s2026@sece.ac.in' },
      { name: 'TAMILINI S', email: 'tamilini.s2026@sece.ac.in' },
      { name: 'TARUN S', email: 'tarun.s2026@sece.ac.in' },
      { name: 'THARANI SHREE M', email: 'tharanishree.m2026@sece.ac.in' },
      { name: 'THILAKESH S', email: 'thilakesh.s2026@sece.ac.in' },
      { name: 'SHIVA PRANAV Y K', email: 'shivapranav.yk2026@sece.ac.in' },
      { name: 'THIRIPURAGANGESH M', email: 'thiripuragangesh.m2026@sece.ac.in' },
      { name: 'TITIKSHA C', email: 'titiksha.c2026@sece.ac.in' },
      { name: 'VAIBAVE SRIRAM S', email: 'vaibavesriram.s2026@sece.ac.in' },
      { name: 'VAISHALI D', email: 'vaishali.d2026@sece.ac.in' },
      { name: 'VAISHNAVI M', email: 'vaishnavi.m2026@sece.ac.in' },
      { name: 'VARSHA B', email: 'varsha.b2026@sece.ac.in' },
      { name: 'VEDHASHREE S', email: 'vedhashree.s2026@sece.ac.in' },
      { name: 'VEERAPANDISELVI P', email: 'veerapandiselvi.p2026@sece.ac.in' },
      { name: 'VIGNESH KUMAR L', email: 'vigneshkumar.l2026@sece.ac.in' },
      { name: 'VIJAY DHAKSHIN K P', email: 'vijaydhakshin.kp2026@sece.ac.in' },
      { name: 'VIKAAS C U', email: 'vikaas.cu2026@sece.ac.in' },
      { name: 'VIKKASH G', email: 'vikkash.g2026@sece.ac.in' },
      { name: 'VINUSHKA S', email: 'vinushka.s2026@sece.ac.in' },
      { name: 'VISALI P', email: 'visali.p2026@sece.ac.in' },
      { name: 'VISHNUPRIYA S', email: 'vishnupriya.s2026@sece.ac.in' },
      { name: 'VISHRUTHI P', email: 'vishruthi.p2026@sece.ac.in' },
      { name: 'VISWAA R S', email: 'viswaa.rs2026@sece.ac.in' },
      { name: 'YARSHAN V', email: 'yarshan.v2026@sece.ac.in' },
      { name: 'YAZHINI K', email: 'yazhini.k2026@sece.ac.in' },
      { name: 'YUVASRI D', email: 'yuvasri.d2026@sece.ac.in' },
      { name: 'ZADOK DANIEL S', email: 'zadokdaniel.s2026@sece.ac.in' }
    ];

    console.log(`[Seed] Generating password hashes for ${officialStudentsRaw.length} students (password = email)...`);

    const studentDocsToInsert = await Promise.all(
      officialStudentsRaw.map(async (s, index) => {
        const cleanEmail = s.email.trim().toLowerCase();
        // Password is exact email address
        const passwordHash = await bcrypt.hash(cleanEmail, 10);

        return {
          name: s.name.trim(),
          email: cleanEmail,
          passwordHash,
          role: 'student' as const,
          department: 'Computer Science & Engineering',
          section: 'D',
          year: 1,
          isActive: true
        };
      })
    );

    const createdStudents = await User.insertMany(studentDocsToInsert);
    console.log(`[Seed] Successfully created 1 Admin and ${createdStudents.length} Students`);

    // 3. Create Exactly the 6 Required Coding Problems
    const questionsData = [
      {
        title: 'Hidden Infinite Loop',
        description: `Examine the following code:

\`\`\`cpp
int n = 10;

while(n)
{
    if(n % 2 == 0)
        n += 2;
    else
        n -= 3;

    cout << n << " ";
}
\`\`\`

Task:
1. Explain why the loop may never terminate.
2. Modify the logic so that the program terminates.
3. Print the values generated before termination.`,
        language: 'C++',
        difficulty: 'easy',
        category: 'Loops',
        marks: 10,
        timeLimitMinutes: 15,
        inputFormat: 'None (Standalone code analysis & execution)',
        outputFormat: 'Values generated before termination, space-separated',
        constraints: 'Standard 32-bit integer arithmetic',
        sampleInput: 'None',
        sampleOutput: 'Modified terminating output sequence',
        active: true,
        createdBy: admin._id
      },
      {
        title: 'What Will Be Printed?',
        description: `Determine the output:

\`\`\`cpp
int x = 1;

while(x <= 20)
{
    if(x % 2 == 0)
    {
        cout << x << " ";
        x += 3;
    }
    else
    {
        x += 2;
    }
}
\`\`\`

Task:
1. Determine and explain the output.
2. Modify the program so that it prints only the even numbers from 1 to 500.`,
        language: 'C++',
        difficulty: 'easy',
        category: 'Loops',
        marks: 10,
        timeLimitMinutes: 15,
        inputFormat: 'None',
        outputFormat: 'Part 1: Output sequence\nPart 2: Even numbers from 1 to 500',
        constraints: '1 <= x <= 500',
        sampleInput: 'None',
        sampleOutput: '2 4 6 8 10 ... 500',
        active: true,
        createdBy: admin._id
      },
      {
        title: 'Determine the Output',
        description: `Determine the output:

\`\`\`cpp
for(int i = 1; i <= 4; i++)
{
    for(int j = 1; j <= 5; j++)
    {
        if(i == j)
            continue;

        cout << i << j << " ";
    }

    cout << endl;
}
\`\`\`

Task:
1. Determine the output.
2. Modify the program so that the diagonal elements are printed as X.`,
        language: 'C++',
        difficulty: 'easy',
        category: 'Nested Loops',
        marks: 10,
        timeLimitMinutes: 15,
        inputFormat: 'None',
        outputFormat: '4 rows of matrix elements with diagonal replaced by X',
        constraints: '1 <= i <= 4, 1 <= j <= 5',
        sampleInput: 'None',
        sampleOutput: `X 12 13 14 15
21 X 23 24 25
31 32 X 34 35
41 42 43 X 45`,
        active: true,
        createdBy: admin._id
      },
      {
        title: 'Digit Frequency Without Arrays',
        description: `Given a number, determine how many times each digit from 0 to 9 occurs.

Requirement:
Solve the problem without using arrays.`,
        language: 'C++',
        difficulty: 'medium',
        category: 'Number Theory / Loops',
        marks: 15,
        timeLimitMinutes: 20,
        inputFormat: 'A positive integer or number string',
        outputFormat: '0 : count\\n1 : count\\n...\\n9 : count',
        constraints: 'Number length up to 10^18 (or 10^5 as string/arithmetic extraction), No arrays/containers allowed',
        sampleInput: '1200332120',
        sampleOutput: `0 : 3
1 : 2
2 : 3
3 : 2
4 : 0
5 : 0
6 : 0
7 : 0
8 : 0
9 : 0`,
        active: true,
        createdBy: admin._id
      },
      {
        title: 'Happy Number Detection',
        description: `A number is called Happy if repeatedly replacing it with the sum of the squares of its digits eventually produces 1.

Example for 19:
19
1² + 9² = 82
8² + 2² = 68
6² + 8² = 100
1² + 0² + 0² = 1

Therefore:
19 is a Happy Number

Task:
1. Check whether N is a Happy Number.
2. Print every intermediate value.
3. Detect whether the process enters a cycle.
4. Print an appropriate result for both Happy and non-Happy numbers.`,
        language: 'C++',
        difficulty: 'medium',
        category: 'Number Theory / Loops',
        marks: 15,
        timeLimitMinutes: 25,
        inputFormat: 'A positive integer N',
        outputFormat: 'Intermediate values followed by Happy / Non-Happy verdict',
        constraints: '1 <= N <= 10^6',
        sampleInput: '19',
        sampleOutput: `19
82
68
100
1
19 is a Happy Number`,
        active: true,
        createdBy: admin._id
      },
      {
        title: 'Kaprekar Number Challenge',
        description: `A number N is called a Kaprekar Number if:
1. Square N.
2. Split the square into two parts.
3. Add the two parts.
4. If the result equals N, then N is a Kaprekar number.

Example:
45² = 2025
20 + 25 = 45

Therefore:
45 is a Kaprekar Number

Task:
Print all Kaprekar numbers between 1 and 1000.`,
        language: 'C++',
        difficulty: 'hard',
        category: 'Number Theory',
        marks: 20,
        timeLimitMinutes: 30,
        inputFormat: 'Range: 1 to 1000',
        outputFormat: 'All Kaprekar numbers between 1 and 1000',
        constraints: '1 <= N <= 1000',
        sampleInput: '1 1000',
        sampleOutput: '1, 9, 45, 55, 99, 297, 703, 999',
        active: true,
        createdBy: admin._id
      }
    ];

    const createdQuestions = await Question.insertMany(questionsData);
    console.log(`[Seed] Created exactly ${createdQuestions.length} programming questions (Q1 to Q6)`);

    // 4. Create Active Assessment with 6 Questions
    const now = new Date();
    const assessment = await Assessment.create({
      title: 'First Year Algorithmic Sprint 2026',
      description: 'Departmental Coding Evaluation for First Year Engineering Students. Randomly assigned algorithmic problems with runtime screenshot evaluation.',
      totalQuestions: 6,
      durationMinutes: 60,
      status: 'LIVE',
      startsAt: now,
      endsAt: new Date(now.getTime() + 60 * 60 * 1000),
      questionPool: createdQuestions.map((q) => q._id),
      createdBy: admin._id
    });

    console.log(`[Seed] Created Assessment: "${assessment.title}" (Status: LIVE, Total Questions: 6)`);

    // 5. Create Question Assignments for all 66 Students (All 6 questions assigned in order, pending status, NO upload screenshots)
    const assignmentsToInsert = createdStudents.map((student) => {
      return {
        assessmentId: assessment._id,
        studentId: student._id,
        questions: createdQuestions.map((q, qIndex) => ({
          questionId: q._id,
          order: qIndex + 1,
          status: 'pending' as const
        })),
        startedAt: now
      };
    });

    await StudentAssignment.insertMany(assignmentsToInsert);
    console.log(`[Seed] Created 66 Student Assignments`);

    // 6. Seed Submissions for SANJAI G (2 Evaluated/Approved + 2 Pending Review)
    const sanjaiStudent = createdStudents[0]; // SANJAI G
    const uploadsDirReal = path.join(__dirname, '../uploads/submissions');
    if (!fs.existsSync(uploadsDirReal)) {
      fs.mkdirSync(uploadsDirReal, { recursive: true });
    }

    // Ensure sample screenshot image exists
    const sampleImgPath = path.join(uploadsDirReal, 'sample-submission.png');
    if (!fs.existsSync(sampleImgPath)) {
      // 1x1 transparent PNG or placeholder buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(sampleImgPath, pngBuffer);
    }

    // Submission 1: Q1 (Evaluated - 10/10)
    const sub1 = await Submission.create({
      assessmentId: assessment._id,
      studentId: sanjaiStudent._id,
      questionId: createdQuestions[0]._id,
      screenshotUrl: '/uploads/submissions/sample-submission.png',
      attemptNumber: 1,
      submittedAt: new Date(Date.now() - 30 * 60 * 1000),
      status: 'EVALUATED'
    });
    await Evaluation.create({
      submissionId: sub1._id,
      studentId: sanjaiStudent._id,
      assessmentId: assessment._id,
      questionId: createdQuestions[0]._id,
      evaluatedBy: admin._id,
      marksObtained: 10,
      maxMarks: 10,
      feedback: 'Excellent code termination logic. Output matches sample test case.',
      evaluatedAt: new Date(Date.now() - 25 * 60 * 1000)
    });

    // Submission 2: Q2 (Evaluated - 10/10)
    const sub2 = await Submission.create({
      assessmentId: assessment._id,
      studentId: sanjaiStudent._id,
      questionId: createdQuestions[1]._id,
      screenshotUrl: '/uploads/submissions/sample-submission.png',
      attemptNumber: 1,
      submittedAt: new Date(Date.now() - 20 * 60 * 1000),
      status: 'EVALUATED'
    });
    await Evaluation.create({
      submissionId: sub2._id,
      studentId: sanjaiStudent._id,
      assessmentId: assessment._id,
      questionId: createdQuestions[1]._id,
      evaluatedBy: admin._id,
      marksObtained: 10,
      maxMarks: 10,
      feedback: 'Correct output explanation and trace table.',
      evaluatedAt: new Date(Date.now() - 15 * 60 * 1000)
    });

    // Submission 3: Q3 (Pending Review)
    await Submission.create({
      assessmentId: assessment._id,
      studentId: sanjaiStudent._id,
      questionId: createdQuestions[2]._id,
      screenshotUrl: '/uploads/submissions/sample-submission.png',
      attemptNumber: 1,
      submittedAt: new Date(Date.now() - 10 * 60 * 1000),
      status: 'SUBMITTED'
    });

    // Submission 4: Q4 (Pending Review)
    await Submission.create({
      assessmentId: assessment._id,
      studentId: sanjaiStudent._id,
      questionId: createdQuestions[3]._id,
      screenshotUrl: '/uploads/submissions/sample-submission.png',
      attemptNumber: 1,
      submittedAt: new Date(Date.now() - 5 * 60 * 1000),
      status: 'SUBMITTED'
    });

    // Update SANJAI G assignment status
    await StudentAssignment.updateOne(
      { studentId: sanjaiStudent._id, 'questions.questionId': createdQuestions[0]._id },
      { $set: { 'questions.$.status': 'evaluated', 'questions.$.marksObtained': 10 } }
    );
    await StudentAssignment.updateOne(
      { studentId: sanjaiStudent._id, 'questions.questionId': createdQuestions[1]._id },
      { $set: { 'questions.$.status': 'evaluated', 'questions.$.marksObtained': 10 } }
    );
    await StudentAssignment.updateOne(
      { studentId: sanjaiStudent._id, 'questions.questionId': createdQuestions[2]._id },
      { $set: { 'questions.$.status': 'submitted' } }
    );
    await StudentAssignment.updateOne(
      { studentId: sanjaiStudent._id, 'questions.questionId': createdQuestions[3]._id },
      { $set: { 'questions.$.status': 'submitted' } }
    );

    console.log('=======================================================');
    console.log('[Seed] Database successfully seeded:');
    console.log(' - 1 Admin: anandaraj.a@sece.ac.in (Password: anandaraj.a@sece.ac.in)');
    console.log(' - 66 Official Students: sanjai.g2026@sece.ac.in to zadokdaniel.s2026@sece.ac.in');
    console.log(' - 6 Standard Questions: Q1 to Q6 (80 Total Marks)');
    console.log(' - 4 Submissions for SANJAI G: 2 Approved/Evaluated + 2 Pending Review');
    console.log('=======================================================');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  }
};

// Allow standalone execution: npm run seed
if (require.main === module) {
  seedDatabase().then(() => {
    console.log('[Seed] Finished. Exiting.');
    process.exit(0);
  });
}
