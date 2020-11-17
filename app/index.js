require('dotenv').config();
const firebaseAdmin = require('firebase-admin');
const { App } = require('@slack/bolt');

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

// Why are we using this SDK? --> Who knows.
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(getFirebaseServiceAccount()),
  databaseURL: "https://jargon-jar.firebaseio.com"
});
const database = firebaseAdmin.database();

// This is as scuffed as it is because of Heroku's constraints.
function getFirebaseServiceAccount () {
  if (process.env.FIREBASE_KEY_PATH) {
    return require(process.env.FIREBASE_KEY_PATH);
  }
  if (process.env.FIREBASE_KEY) {
    return JSON.parse(process.env.FIREBASE_KEY);
  }
}

// Stores the data from the Firebase DB. TODO: Refresh the snapshot periodically
const terms = getTerms();

async function getTerms () {
  try {
    // Couldn't we have used the firebase rest API? --> Yes.
    const snapshot = await database.ref().once('value');
    // console.log('snapshot:', snapshot.val());
    return snapshot.val();
  }
  catch (error) {
    console.error('Failed to get terms from Firebase');
    throw error;
  }
}

// Message handler
app.message(async ({ message, say }) => {
  // await say('something');
});

(async () => {
  // Start the app
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();