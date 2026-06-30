const path = require('path')
const dbPath = path.resolve(__dirname, '..', '.local-db').split('\\').join('/')
console.log(dbPath)
