const mysql = require('mysql');
const config = require('dotenv').config();
const fs = require('fs');
var path = require('path');
const createPage = require('./create_page_site');
 
const pageType = process.argv[2];
const pageSlug = process.argv[3];
const mode = process.argv[4];
const limit = process.argv[5];

const conn = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PWD,
    database: process.env.MYSQL_DB
})
if ( !pageType ) {
    console.error('Please, enter the page type to create')
    process.exit()
}

conn.connect( (err) => {
    if (err) throw err.stack
    console.log('Database connect successfull');
    let query = `SELECT \`slug\`, \`title\` FROM ${pageType} WHERE \`slug\` != "test"`;
    if ( pageSlug ) {
        query += ` AND \`slug\`="${pageSlug}"`
    }
    if ( limit ) {
        query += ` limit 3`
    }
    conn.query(query, async function(err, results, fields) {
        if ( err ) throw err.stack;
        for( var i =0; i < results.length; i++ ) {
            var result = results[i];
            let exists = checkPageIsCreated(result.slug, pageType)
            console.log(`${pageType}:  ${result.slug} ==> ${exists}`)
            if ( !mode && !exists) {
                mode = 'update'
            }
            await createPage.createGooglePage(result.slug, result.title, pageType, mode);
        }
    });
})


function checkPageIsCreated(pageSlug, pageType) {
    let isExists = false;
    let filePath = path.resolve(__dirname)
    let successFilePath = `${filePath}/success_${pageType}.log`
    let getSuccessPage = readFileLog(successFilePath)
    if ( getSuccessPage.indexOf(pageSlug) >= 0 ) {
        isExists = true
    }
    return isExists
}

function readFileLog(path) {
    var retval = '[]';
    if (!fs.existsSync(path)) {
        return JSON.parse(retval);
    }
    contents = fs.readFileSync(path, 'utf8')
    if ( contents.length <= 0 ) {
        retval = '[]'
    } else {
        retval = contents
    }
    return JSON.parse(retval);
}