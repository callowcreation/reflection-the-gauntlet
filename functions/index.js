const functions = require("firebase-functions");

const firebase = require('firebase-admin');
const express = require('express');

const serviceAccount = require('../serviceAccountKey.json');

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: 'https://reflection-the-gauntlet-default-rtdb.firebaseio.com'
});

const app = express();
/*app.use(cors({ origin: true }))
    .use(bodyParser.json());*/

/*app.get('/', async (req, res) => {

    const refRaw = firebase.database().ref('raw_array');

    const refKeyed = firebase.database().ref('full_keyed');

    const snapshot = await refRaw.once('value');

    snapshot.forEach(snap => {
        refKeyed.push(snap.val());
    });

    res.end();
});*/

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

app.get('/random-poem', async (req, res) => {

    const refKeyed = firebase.database().ref('full_keyed');
    const refRhymes = firebase.database().ref('rhymes');

    const refLastWords = firebase.database().ref('last_words');
    const lastWords = await refLastWords.once('value').then(snap => snap.val());

    shuffle(lastWords);

    const couplets = 5;
    const lines = [];

    let i = 0;
    while (lines.length < couplets * 2) {

        const lastWord = lastWords[i];
        const rhymes = await refRhymes.child(lastWord).once('value').then(snap => snap.val());
        i++;
        if (!rhymes) continue;

        shuffle(rhymes);
        const rhyme = rhymes[0];

        const snap1 = await refKeyed.orderByChild('last_word').equalTo(lastWord).limitToFirst(1).once('value');
        const snap2 = await refKeyed.orderByChild('last_word').equalTo(rhyme).limitToFirst(1).once('value');

        const line1 = Object.values(snap1.val())[0].line;
        const line2 = Object.values(snap2.val())[0].line;

        lines.push(...[line1, line2, '<br />']);
        console.log({ i, lastWord, rhyme, rhymes });
        if (i === lastWords.length) break;
    }

    const ol = `<ul style="list-style-type:none;">${lines.map(x => `<li>${x}</li>`).join('')}</ul>`;

    res.send(`Welcome to Terra!<hr />${ol}`);
    /*const words1 = 'astray,way, pay,day,away,stairway,decay,today,everyday,say,may,gray,play,stay'.split(',');
    const words2 = 'conspiracy,discovery,graciously,hypocrisy,jealousy'.split(',');
    
    shuffle(words1);

    shuffle(words2);

    const item1a = words1[0];
    const item1b = words1[1];
    const item2a = words2[0];
    const item2b = words2[1];

    const refKeyed = firebase.database().ref('full_keyed');

    const snap1a = await refKeyed.orderByChild('last_word').equalTo(item1a).limitToFirst(1).once('value');
    const snap1b = await refKeyed.orderByChild('last_word').equalTo(item1b).limitToFirst(1).once('value');
    const snap2a = await refKeyed.orderByChild('last_word').equalTo(item2a).limitToFirst(1).once('value');
    const snap2b = await refKeyed.orderByChild('last_word').equalTo(item2b).limitToFirst(1).once('value');

    const fields1a = snap1a.val();
    const fields1b = snap1b.val();
    const fields2a = snap2a.val();
    const fields2b = snap2b.val();

    const lines_li = [
        Object.values(fields1a)[0].line,
        Object.values( fields1b)[0].line,
        Object.values(fields2a)[0].line,
        Object.values(fields2b)[0].line,
    ];
    
    const ol = `<ol>${lines_li.map(x => `<li>${x}</li>`)}</ol>`;
    res.send(`${ol}`);*/
});




exports.app = functions.https.onRequest(app);
