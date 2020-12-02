require('dotenv').config();
const firebaseAdmin = require('firebase-admin');
const { App } = require('@slack/bolt');

const port = process.env.PORT || 3000;

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

// Store for the data from the Firebase DB. TODO: Refresh the snapshot periodically
const store = {
  terms: []
};

// Message handler
app.message(async ({ payload, message, client, say }) => {
  if (message.hidden === true) return;

  const response = {};

  switch (message.subtype) {
    // Whitelist message subtypes to respond to
    case undefined: // respond in thread
      Object.assign(response, {
        thread_ts: message.ts,
      });
      break;
    case 'message_replied': // respond to parent message
      Object.assign(response, {
        thread_ts: message.thread_ts
      });
      break;
    default:
      // Do nothing if subtype is not whitelisted
      return;
  }

  const matches = [];
  store.terms.acronyms.forEach((term) => {
    if (message.text.toLowerCase().includes(term.term.toLowerCase())) {
      matches.push(term);
    }
  });

  store.terms.buzzwords.forEach((term) => {
    if (message.text.toLowerCase().includes(term.term.toLowerCase())) {
      matches.push(term);
    }
  });

  if (matches.length > 0) {
    console.log('matches found:', matches);

    const textBase = `*Whoa there!* Looks like you're making alphabet soup.`;

    const meaningList = matches.reduce((acc, cur) => {
      if (cur.definition) {
        const definition = `\n• ${cur.term}: *${cur.definition}*`;
        const learnMore = cur.link ? ` (<${cur.link}|learn more>)` : '';
        return acc + definition + learnMore;
      }

      return '';
    }, '');

    const meaningListIntro = meaningList ? `\nI can help translate:` : '';

    const donatePrompt = `\nThose acronyms are going to cost you -- <https://donate.givedirectly.org/|*consider donating to people in need with GiveDirectly*>.`;

    Object.assign(response, {
      unfurl_links: false,
      text: textBase + meaningListIntro + meaningList + donatePrompt,
    });

    await say(response);
  }

  // try {
  //   // Call the chat.postEphemeral method using the built-in WebClient
  //   // The client uses the token you used to initialize the app
  //   const result = await app.client.chat.postEphemeral({
  //     // Payload message should be posted in the channel where original message was heard
  //     channel: payload.channel,
  //     // The user the message should appear for
  //     user: payload.user,
  //     text: "Shhhh only you can see this :shushing_face:"
  //   });
  //   console.log(payload)
  //   console.log(result);
  // }
  // catch (error) {
  //   console.error(error);
  // }
});

(async () => {
  // Start the app
  await app.start(port);

  // Get data from firebase
  store.terms = await getTerms();

  console.log('Jargon Jar is running at port', port);
})();

async function getTerms () {
  try {
    // Couldn't we have used the firebase rest API? --> Yes.
    const snapshot = await database.ref().once('value');
    console.log('Terms fetched from Firebase');
    return snapshot.val();
  }
  catch (error) {
    console.error(error);
    console.error('Failed to get terms from Firebase');
    return [];
  }
}