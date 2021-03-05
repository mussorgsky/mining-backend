require('dotenv').config()
const express = require('express')
const bodyparser = require('body-parser')
const fs = require('fs');
const app = express()
const port = 8078

app.use(bodyparser.urlencoded({ extended: true }))

const database = JSON.parse(fs.readFileSync('data.json').toString())
let lastShareId = database.shares.map(s => s.id).sort((a, b) => b - a)[0] || 0

let databaseChanged = false;

const logWithDate = (message) => {
    const date = new Date(Date.now()).toISOString()
    console.log(`[${date}] ${message}`)
}


const addShare = (userId) => {
    const newShare = {
        id: (++lastShareId),
        user: userId,
        date: new Date(Date.now()).toISOString()
    }
    database.shares.push(newShare)
    databaseChanged = true

    logWithDate(`Added new share for user ${userId}`)
    return
}

const checkUserId = (id) => {
    ids = database.users.map(u => Number(u.id))
    return ids.includes(id)
}

const saveJob = setInterval(() => {
    if (databaseChanged) {
        fs.writeFile('data.json', JSON.stringify(database), () => {
            logWithDate('Data saved to file')
            databaseChanged = false
        })
    }
}, 1000);

app.get('/api/users', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(JSON.stringify(database.users)).end()
    logWithDate('Request for /users')
    return
})

app.get('/api/all', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(JSON.stringify(database)).end()
    logWithDate('Request for /all')
    return
})

app.get('/api/user-shares', (req, res) => {
    let userId
    if (!req.query.id) {
        logWithDate('Malformed user share request, no id')
        res.status(400).end()
        return
    } else {
        userId = Number(req.query.id)
    }
    logWithDate(`Request for /user-shares with id=${userId}`)
    if (checkUserId(userId)) {
        res.setHeader('Content-Type', 'application/json')
        res.status(200).send(JSON.stringify(database.shares.filter(s => s.user == userId).map(s => { return { 'id': s.id, 'date': s.date } }))).end();
        return;
    }
    res.status(400).end()
    return
})

app.post('/api/share', (req, res) => {
    const userId = Number(req.body.id) || null
    const pass = req.body.pass || null

    if (userId === null || pass === null) {
        logWithDate('Malformed share submitted')
        res.status(400).end()
        return
    }

    if (checkUserId(userId) && pass == process.env.SHARE_PASS) {
        logWithDate(`Post for /share with id=${userId}`)
        addShare(userId)
        res.status(200).end()
        return;
    }
    logWithDate(`Failed adding share for user ${userId}`)
    res.status(400).end()
    return
})

app.listen(port, () => {
    logWithDate(`mining-backend listening at http://localhost:${port}`)
})
