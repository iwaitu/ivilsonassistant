import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';

import { Configuration, OpenAIApi } from 'openai';

import { v4 as uuid } from 'uuid';
import admin from 'firebase-admin';
import fs from 'fs';
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));


admin.initializeApp({
  credential:admin.credential.cert(serviceAccount)
});

dotenv.config();

const db = admin.firestore();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function saveContext(userId, context,totaltokens) {
  await db.collection("contexts").doc(userId).set({
    context: context,
    totaltokens: totaltokens
  });
}

async function getContext(userId) {
  const contextsRef = db.collection("contexts");
  const data = await contextsRef.doc(userId).get().then(doc => doc.data());
  if(data)
    return data.context;
  return '';
}

async function clearContext(userId) {
  await db.collection("contexts").doc(userId).set({
    context: '',
    totaltokens: 0
  });
}

// const sessionId = uuid();

const app = express();
app.use(cors({
  origin: process.env.Client_URL,
}));
// app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Hello from ivilson assistant!'
  });
});

app.post('/clear',async (req,res) => {
  try {
    const userId = req.body.userId;
    await clearContext(userId);
    res.status(200).send();
  } catch (error) {
    console.error(error.code);
    console.error(error.message);
    res.status(500).send(error.message || 'Something went wrong');
  }
});

app.post('/', async (req, res) => {
  try {
    const prompt = "\nHuman:" + req.body.prompt;
    const userId = req.body.userId;
    
    
    let context = await getContext(userId);
    if(context == '') {
      context = "\nHuman:你好\nAI:你也好";
    }
    context = context+prompt;
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `${context}`,
      temperature: 0.9,
      max_tokens: 3000,
      top_p: 0.9,
      stop:[" Human:", " AI:"],
      frequency_penalty: 0.5,
      presence_penalty: 0,
    });

    // let answer = response.data.choices[0].text.substring(response.data.choices[0].text.indexOf('\nAI:')).replace(/\nAI:/g,'');
    let answer = response.data.choices[0].text.replace(/AI:/g,'');
    if(answer != '') {
      context = context + response.data.choices[0].text;
      await saveContext(userId, context,response.data.usage.total_tokens);
    }
    
    res.status(200).send({
      bot: answer
    });
  } catch (error) {
    console.error(error.code);
    console.error(error.message);
    res.status(500).send(error.message || 'Something went wrong');
  }
});

app.listen(5000, () => console.log('AI server started'));