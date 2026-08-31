/**
 * import_questions.js
 * Reads all 40 JSON files from the Flutter assets folder and imports them
 * into the MongoDB QuizQuestion collection.
 *
 * Run: node src/scripts/import_questions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const QuizQuestion = require('../models/QuizQuestion');

// ── Path to the Flutter JSON assets ──────────────────────────────────────────
const JSON_BASE = path.join(
  __dirname,
  '../../../kiddo_app/assets/data/json_files'
);

// ── Subject configuration ─────────────────────────────────────────────────────
const SUBJECTS = [
  { name: 'Math',     folder: 'math',     prefix: 'math_unit_' },
  { name: 'GK',       folder: 'gk',       prefix: 'gk_unit_' },
  { name: 'English',  folder: 'english',  prefix: 'english_unit_' },
  { name: 'Computer', folder: 'computer', prefix: 'computer_unit_' },
];

// ── Transform a raw JSON question to our DB schema ────────────────────────────
const transformQuestion = (raw, subject, unitNumber) => {
  const options = [
    raw.option_1 ?? '',
    raw.option_2 ?? '',
    raw.option_3 ?? '',
    raw.option_4 ?? '',
  ];

  const correctAnswer = raw.correct_ans ?? raw.option_1;
  // Find index of correct option (case-insensitive trim match)
  let correctIndex = options.findIndex(
    (o) => o.trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
  );
  if (correctIndex === -1) correctIndex = 0; // fallback

  // Normalize question type
  const rawType = (raw.Question_type || 'MCQ').toUpperCase();
  let type = 'MCQ';
  if (rawType === 'IMG_MCQ') type = 'IMG_MCQ';
  else if (rawType === 'IMAGE_TAP') type = 'MCQ'; // treat as MCQ (no image assets)
  else if (rawType === 'TRUE_FALSE') type = 'TRUE_FALSE';

  return {
    subject,
    unitNumber,
    unitName: raw.unit_name || `Unit ${unitNumber}`,
    quizName: raw.quiz_name || `Quiz 1`,
    question: raw.question || '',
    type,
    options,
    correctAnswer: String(correctAnswer),
    correctIndex,
    imageAsset: raw.image || null,
    difficulty: 'easy',
  };
};

// ── Main import function ───────────────────────────────────────────────────────
const importQuestions = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB Atlas\n');

    // Clear existing quiz questions
    console.log('🗑️  Clearing existing quiz questions...');
    await QuizQuestion.deleteMany({});

    let totalInserted = 0;

    for (const subject of SUBJECTS) {
      console.log(`\n📚 Importing ${subject.name}...`);
      const subjectDocs = [];

      for (let unit = 1; unit <= 10; unit++) {
        const filePath = path.join(
          JSON_BASE,
          subject.folder,
          `${subject.prefix}${unit}.json`
        );

        if (!fs.existsSync(filePath)) {
          console.warn(`   ⚠️  File not found: ${subject.prefix}${unit}.json — skipping`);
          continue;
        }

        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const transformed = raw.map((q) =>
          transformQuestion(q, subject.name, unit)
        );
        subjectDocs.push(...transformed);

        // Count quizzes per unit
        const quizNames = [...new Set(transformed.map((q) => q.quizName))];
        console.log(
          `   Unit ${unit}: ${transformed.length} questions across ${quizNames.length} quizzes`
        );
      }

      const result = await QuizQuestion.insertMany(subjectDocs);
      totalInserted += result.length;
      console.log(`   ✅ ${result.length} ${subject.name} questions imported`);
    }

    console.log(`\n🎉 Import complete! Total: ${totalInserted} questions in MongoDB`);
    console.log('   You can now start the server: npm run dev\n');
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    if (err.message.includes('ENOENT')) {
      console.error('\n💡 JSON files not found. Make sure the Flutter project');
      console.error('   is at: ../../../../kiddo_app/assets/data/json_files/\n');
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

importQuestions();
