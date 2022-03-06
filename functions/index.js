// NFG Pleads32 http://dumbideas.xyz/billy/week-52/myNFG.html?id=v8YwH6Nq2s

const functions = require("firebase-functions");

const firebase = require('firebase-admin');
const express = require('express');
const cors = require('cors');

const serviceAccount = require('./serviceAccountKey.json');

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: 'https://reflection-the-gauntlet-default-rtdb.firebaseio.com'
});

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
    const refKeyed = firebase.database().ref('full_keyed');
    const refRhymes = firebase.database().ref('rhymes');

    const refLastWords = firebase.database().ref('last_words');
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
