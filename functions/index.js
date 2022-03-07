// NFG Pleads32 http://dumbideas.xyz/billy/week-52/myNFG.html?id=v8YwH6Nq2s
/*const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { getDatabase } = require('firebase-admin/database');*/

const functions = require("firebase-functions");

const firebase = require('firebase-admin');
const express = require('express');
const cors = require('cors');

const serviceAccount = require('./serviceAccountKey.json');
const e = require("cors");

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: 'https://reflection-the-gauntlet-default-rtdb.firebaseio.com',
    storageBucket: 'reflection-the-gauntlet.appspot.com'
});

const database = firebase.database();
const storage = firebase.storage();

const app = express();
app.use(cors({ origin: true }));

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

async function generate(couplets) {
    const refKeyed = database.ref('full_keyed');
    const refRhymes = database.ref('rhymes');

    const refLastWords = database.ref('last_words');
    const lastWords = (await refLastWords.once('value').then(snap => snap.val())).filter(x => x);

    shuffle(lastWords);

    const poemLines = [];

    let i = 0;
    while (poemLines.length < couplets * 2) {

        const lastWord = lastWords[i];
        const rhymes = await refRhymes.child(lastWord).once('value').then(snap => snap.val());
        i++;
        if (!rhymes) continue;

        shuffle(rhymes);
        const rhyme = rhymes[0];

        const snap1 = await refKeyed.orderByChild('last_word').equalTo(lastWord).once('value').then(s => s.val());
        const snap2 = await refKeyed.orderByChild('last_word').equalTo(rhyme).once('value').then(s => s.val());

        const lines1 = Object.values(snap1);
        const lines2 = Object.values(snap2);
        shuffle(lines1);
        shuffle(lines2);

        poemLines.push(...[lines1[0], lines2[0]]);
        if (i === lastWords.length) break;
    }

    return poemLines;
}

app.get('/get-poem', async (req, res) => {
    
    const topic = req.query.topic;
    const bucket = storage.bucket();

    const poemFile = bucket.file(`poems/${topic}.txt`);
    const poemImage = bucket.file(`images/${topic}.png`);
    const poemImageUrl = poemImage.publicUrl();
    try {
        const data = await poemFile.download({ validation: false }).then(file => {
            const text = file.toString('utf8');
            return {
                topic,
                text,
                imageUrl: poemImageUrl
            };
        });
        if (data) {
            res.json(data);
        } else {
            res.status(404).send(`The poem for The Gauntlet ${topic} was not found.`);
        }
    } catch (err) {
        res.status(500).send(error.message);
    }
});

app.get('/poems-info', async (req, res) => {
    const refKeyed = database.ref('full_keyed');
    const linesCount = await refKeyed.once('value').then(s => s.numChildren());

    const refLastWords = database.ref('last_words');
    const lastWords = (await refLastWords.once('value').then(snap => snap.val())).filter(x => x);

    res.json({ linesCount, lastWords });
});

app.get('/poems', async (req, res) => {

    const couplets = +req.query.couplets || 5;
    const items = await generate(couplets);

    res.json({ items });
});

app.get('/random-poem', async (req, res) => {

    const couplets = 5;
    const items = await generate(couplets);

    const ol = `<ul style="list-style-type:none;">${items.map(x => `<li>${x.line}</li>`).join('')}</ul>`;

    res.send(`Welcome to Terra!<hr />${ol}`);
});

exports.app = functions.https.onRequest(app);
