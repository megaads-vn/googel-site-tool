const mysql = require('mysql');
const config = require('dotenv').config();
const fs = require('fs');
var path = require('path');
const createPage = require('./create_page_site');

let params = process.argv[2];
if ( !params ) {
    console.error('Please, enter the page type to create')
    process.exit()
}
params = JSON.parse(params);

const conn = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PWD,
    database: process.env.MYSQL_DB
})
if ( !params.page_type ) {
    console.error('Please, enter the page type to create')
    process.exit()
}

conn.connect( (err) => {
    if (err) throw err.stack
    console.log('Database connect successfull');
    let query = `SELECT \`slug\`, \`title\` FROM ${params.page_type} WHERE \`slug\` != "test" AND status ="enable" `;
    if ( params.page_slug && params.page_slug != ' ') {
        query += ` AND \`slug\`="${params.page_slug}"`
    }
    query += ' ORDER BY `title` ASC'
    if ( params.limit && params.limit != ' ') {
        query += ` limit ${params.limit}`
        
        let offset = (params.offset) ? params.offset : 0;
        offset = ( offset != ' ' && offset > 0 ) ? params.limit * offset : 0;
        query += ` offset ${offset}`
    }
    conn.query(query, async function(err, results, fields) {
        if ( err ) throw err.stack;
        console.log('Result length= ', results.length);
        for( var i =0; i < results.length; i++ ) {
            let mode = params.mode;
            var result = results[i];
            let exists = checkPageIsCreated(result.slug, params.page_type)
            console.log(`${i}> ${params.page_type}:  ${result.slug} ==> ${exists}`)
            if ( !mode && exists) {
                mode = 'update'
               continue;
            }
            await createPage.createGooglePage(result.slug, result.title, params.page_type, mode);
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