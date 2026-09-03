/**
 * seed.js — Populates MongoDB with:
 *   - 25 quiz questions (ported from quiz_model.dart)
 *   - 7 shop items (ported from shop_item_model.dart)
 *
 * Run: node src/scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const QuizQuestion = require('../models/QuizQuestion');
const ShopItem = require('../models/ShopItem');

// ── Quiz Questions ─────────────────────────────────────────────────────────────
const quizQuestions = [
  // ── Math ──────────────────────────────────────────────────────────────────
  {
    subject: 'Math',
    question: 'What is 2 + 3?',
    type: 'textOnly',
    options: [{ text: '4' }, { text: '5' }, { text: '6' }, { text: '7' }],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'Math',
    question: 'What is 10 - 4?',
    type: 'textOnly',
    options: [{ text: '5' }, { text: '6' }, { text: '7' }, { text: '8' }],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'Math',
    question: 'What is 3 × 3?',
    type: 'textOnly',
    options: [{ text: '6' }, { text: '8' }, { text: '9' }, { text: '12' }],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'Math',
    question: 'Which is the largest number?',
    type: 'textOnly',
    options: [{ text: '45' }, { text: '54' }, { text: '39' }, { text: '42' }],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'Math',
    question: 'What is 20 ÷ 4?',
    type: 'textOnly',
    options: [{ text: '4' }, { text: '5' }, { text: '6' }, { text: '8' }],
    correctIndex: 1,
    difficulty: 'easy',
  },

  // ── GK ────────────────────────────────────────────────────────────────────
  {
    subject: 'GK',
    question: 'What is the capital of India?',
    type: 'textOnly',
    options: [
      { text: 'Mumbai' },
      { text: 'New Delhi' },
      { text: 'Chennai' },
      { text: 'Kolkata' },
    ],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'GK',
    question: 'How many days are in a week?',
    type: 'textOnly',
    options: [{ text: '5' }, { text: '6' }, { text: '7' }, { text: '8' }],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'GK',
    question: 'Which animal is known as the King of the Jungle?',
    type: 'textOnly',
    options: [
      { text: 'Tiger' },
      { text: 'Elephant' },
      { text: 'Lion' },
      { text: 'Bear' },
    ],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'GK',
    question: 'Which planet is closest to the Sun?',
    type: 'textOnly',
    options: [
      { text: 'Earth' },
      { text: 'Venus' },
      { text: 'Mars' },
      { text: 'Mercury' },
    ],
    correctIndex: 3,
    difficulty: 'easy',
  },
  {
    subject: 'GK',
    question: 'What is the national bird of India?',
    type: 'textOnly',
    options: [
      { text: 'Sparrow' },
      { text: 'Parrot' },
      { text: 'Peacock' },
      { text: 'Eagle' },
    ],
    correctIndex: 2,
    difficulty: 'easy',
  },

  // ── Science ───────────────────────────────────────────────────────────────
  {
    subject: 'Science',
    question: 'What do plants need to make food?',
    type: 'textOnly',
    options: [
      { text: 'Milk' },
      { text: 'Sunlight' },
      { text: 'Sand' },
      { text: 'Ice' },
    ],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'Science',
    question: 'How many legs does an insect have?',
    type: 'textOnly',
    options: [{ text: '4' }, { text: '6' }, { text: '8' }, { text: '10' }],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'Science',
    question: 'What is the boiling point of water?',
    type: 'textOnly',
    options: [
      { text: '90°C' },
      { text: '100°C' },
      { text: '110°C' },
      { text: '80°C' },
    ],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'Science',
    question: 'Which gas do plants absorb from the air?',
    type: 'textOnly',
    options: [
      { text: 'Oxygen' },
      { text: 'Nitrogen' },
      { text: 'Carbon Dioxide' },
      { text: 'Hydrogen' },
    ],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'Science',
    question: 'What is the largest organ in the human body?',
    type: 'textOnly',
    options: [
      { text: 'Heart' },
      { text: 'Liver' },
      { text: 'Brain' },
      { text: 'Skin' },
    ],
    correctIndex: 3,
    difficulty: 'easy',
  },

  // ── English ───────────────────────────────────────────────────────────────
  {
    subject: 'English',
    question: 'Which of these is a vowel?',
    type: 'textOnly',
    options: [{ text: 'B' }, { text: 'C' }, { text: 'E' }, { text: 'D' }],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'English',
    question: 'What is the plural of "child"?',
    type: 'textOnly',
    options: [
      { text: 'Childs' },
      { text: 'Childes' },
      { text: 'Children' },
      { text: 'Childrens' },
    ],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'English',
    question: 'Which word means "happy"?',
    type: 'textOnly',
    options: [
      { text: 'Sad' },
      { text: 'Angry' },
      { text: 'Joyful' },
      { text: 'Tired' },
    ],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'English',
    question: 'Which sentence is correct?',
    type: 'textOnly',
    options: [
      { text: 'He go to school' },
      { text: 'He goes to school' },
      { text: 'He going school' },
      { text: 'He goed school' },
    ],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'English',
    question: 'What is an antonym of "hot"?',
    type: 'textOnly',
    options: [
      { text: 'Warm' },
      { text: 'Cold' },
      { text: 'Boiling' },
      { text: 'Sunny' },
    ],
    correctIndex: 1,
    difficulty: 'easy',
  },

  // ── Computer ──────────────────────────────────────────────────────────────
  {
    subject: 'Computer',
    question: 'What does CPU stand for?',
    type: 'textOnly',
    options: [
      { text: 'Central Power Unit' },
      { text: 'Computer Personal Unit' },
      { text: 'Central Processing Unit' },
      { text: 'Control Processing Unit' },
    ],
    correctIndex: 2,
    difficulty: 'easy',
  },
  {
    subject: 'Computer',
    question: 'Which device is used for input?',
    type: 'textOnly',
    options: [
      { text: 'Monitor' },
      { text: 'Printer' },
      { text: 'Speaker' },
      { text: 'Keyboard' },
    ],
    correctIndex: 3,
    difficulty: 'easy',
  },
  {
    subject: 'Computer',
    question: 'What does "www" stand for?',
    type: 'textOnly',
    options: [
      { text: 'World Wide Web' },
      { text: 'World Web Wide' },
      { text: 'Wide World Web' },
      { text: 'Web World Wide' },
    ],
    correctIndex: 0,
    difficulty: 'easy',
  },
  {
    subject: 'Computer',
    question: 'Which of these is a storage device?',
    type: 'textOnly',
    options: [
      { text: 'Mouse' },
      { text: 'Pen Drive' },
      { text: 'Monitor' },
      { text: 'Keyboard' },
    ],
    correctIndex: 1,
    difficulty: 'easy',
  },
  {
    subject: 'Computer',
    question: 'What is the full form of RAM?',
    type: 'textOnly',
    options: [
      { text: 'Random Access Memory' },
      { text: 'Read Access Memory' },
      { text: 'Run Access Memory' },
      { text: 'Rapid Access Memory' },
    ],
    correctIndex: 0,
    difficulty: 'easy',
  },
];

// ── Shop Items ─────────────────────────────────────────────────────────────────
const shopItems = [
  {
    _id: 'avatar_star',
    name: 'Star Hero',
    description: 'Shine bright with this golden star avatar!',
    imageAsset: 'assets/images/avatar_star.png',
    coinCost: 200,
    category: 'avatar',
    emoji: '⭐',
  },
  {
    _id: 'avatar_fire',
    name: 'Flame Champ',
    description: 'Show off your hot streak with this fire avatar!',
    imageAsset: 'assets/images/avatar_fire.png',
    coinCost: 350,
    category: 'avatar',
    emoji: '🔥',
  },
  {
    _id: 'avatar_robot',
    name: 'Robo Brain',
    description: 'A super-smart robot for the tech genius in you!',
    imageAsset: 'assets/images/avatar_robot.png',
    coinCost: 500,
    category: 'avatar',
    emoji: '🤖',
  },
  {
    _id: 'theme_dark',
    name: 'Dark Mode',
    description: 'Easy on the eyes — switch to dark theme!',
    imageAsset: 'assets/images/kido_character.png',
    coinCost: 500,
    category: 'theme',
    emoji: '🌙',
  },
  {
    _id: 'theme_ocean',
    name: 'Ocean Theme',
    description: 'Dive deep with this cool ocean colour palette.',
    imageAsset: 'assets/images/kido_character.png',
    coinCost: 400,
    category: 'theme',
    emoji: '🌊',
  },
  {
    _id: 'powerup_xp2',
    name: 'XP Booster',
    description: '2× IQ points for your next quiz session!',
    imageAsset: 'assets/images/kido_character.png',
    coinCost: 100,
    category: 'powerUp',
    emoji: '⚡',
  },
  {
    _id: 'powerup_hint',
    name: 'Hint Token',
    description: 'Skip one tricky question in any quiz!',
    imageAsset: 'assets/images/kido_character.png',
    coinCost: 75,
    category: 'powerUp',
    emoji: '💡',
  },
];

// ── Seed Function ──────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('\n🗑️  Clearing existing quiz questions and shop items...');
    await QuizQuestion.deleteMany({});
    await ShopItem.deleteMany({});

    // Insert quiz questions
    console.log('📝 Seeding 25 quiz questions...');
    const insertedQuestions = await QuizQuestion.insertMany(quizQuestions);
    console.log(`   ✅ Inserted ${insertedQuestions.length} quiz questions`);

    // Insert shop items
    console.log('🛒 Seeding 7 shop items...');
    const insertedItems = await ShopItem.insertMany(shopItems);
    console.log(`   ✅ Inserted ${insertedItems.length} shop items`);

    // Seed Games
    const seedGames = require('./seed_games');
    await seedGames();

    console.log('\n🎉 Database seeding complete!');
    console.log('   You can now start the server: npm run dev\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    if (err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
      console.error('\n💡 Is MongoDB running? Try:');
      console.error('   brew services start mongodb-community\n');
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seed();
