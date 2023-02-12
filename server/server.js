import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from 'openai'

dotenv.config()

let context = "";

const firebase = require('firebase');
firebase.initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "chatconversation-6a5aa.firebaseapp.com",
  projectId: "chatconversation-6a5aa",
  storageBucket: "chatconversation-6a5aa.appspot.com",
  messagingSenderId: "426205684711",
  appId: "1:426205684711:web:c3b7e54ef3af2964b65342",
  measurementId: "G-P8BHLYPPVJ"
});
const database = firebase.database();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express()
app.use(cors({
    origin: 'https://assistant.ivilson.com'
}));
app.use(express.json())

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from ivilson assistant !'
  })
})

app.post('/', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const userId = req.body.userId;

    // retrieve the context from Firebase
    let context = '';
    const contextRef = database.ref(`contexts/${userId}`);
    await contextRef.once('value', (snapshot) => {
      context = snapshot.val();
    });

    const response = await openai.createCompletion({
      // model: "text-davinci-003",
      model: "text-davinci-002-render-paid",
      prompt: `${prompt} ${context}`,
      temperature: 0.9, // Higher values means the model will take more risks.
      max_tokens: 4096, // The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).
      top_p: 1, // alternative to sampling with temperature, called nucleus sampling
      frequency_penalty: 0.0, // Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
      presence_penalty: 0.6, // Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
    });

    // update the context in Firebase
    await contextRef.set(response.data.choices[0].text);
    res.status(200).send({
      bot: response.data.choices[0].text
    });

  } catch (error) {
    console.error(error)
    res.status(500).send(error || 'Something went wrong');
  }
})

app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
