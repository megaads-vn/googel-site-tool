const puppeteer = require('puppeteer');
const htmlToText = require('html-to-text');
const fs = require('fs');
const path = require('path');
const config = require('dotenv').config();
const timeout = 10000;

var createGooglePage = async function(pageSlug, pageTitle, pageType, mode) {
    let browser;
    let page;
    try {
        browser = await puppeteer.launch({headless: true});
        page = await browser.newPage();
        let htmlService = process.env.APP_SERVICE_CATEGORY_HTML + '' + pageSlug;
        if ( pageType == 'store' ) {
            htmlService = process.env.APP_SERVICE_STORE_HTML + '' + pageSlug;
        }
        console.log('GenerateURL: ', htmlService);
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3835.0 Safari/537.36')
        console.log('Generate html content')
        await page.goto(htmlService);
        const navigationPromise = page.waitForNavigation()
        const pageBodyContent = await page.evaluateHandle(() => {
            const element = document.getElementsByTagName("body");
            return element;
        });
        var generatedContent = await page.evaluate((e) => e[0].innerHTML, pageBodyContent);
        generatedContent = htmlToText.fromString(generatedContent, {
            wordwrap: 130
        });
        let gotoCreatePage;
        
        console.log('Go to google site')
        if ( !mode ) {
            gotoCreatePage = `https://sites.google.com/site/paylesscouponssite/system/app/pages/createPage?source=/home/${pageType}`
        } else {
            gotoCreatePage = 'https://sites.google.com/site/?usp=sites_home'
        }
        await page.goto(gotoCreatePage)

        await navigationPromise
        await page.screenshot({path: 'example.png'});
        // Type to email input
        await page.waitForSelector('input[type="email"]')
        await page.type('input[type="email"]', process.env.GOOGLE_USER)
        await page.click('#identifierNext')
        
        // Type to password input
        await page.waitForSelector('input[type="password"]', { visible: true })
        await page.type('input[type="password"]',process.env.GOOGLE_PWD)
        await page.waitForSelector('#passwordNext', { visible: true })
        await page.click('#passwordNext')

        await navigationPromise
        if ( !mode ) {
            console.log('Create new subpage')
            await page.waitForSelector('input[id="jot-ui-pageName"]', { visible: true})
            await page.type('input[id="jot-ui-pageName"]', pageTitle)
            await page.click('#pageLocSelectedPath')
            await page.click('#createPageButton')
        } else {
            console.log('Go to page update')
            delay(10000)
            await page.waitForSelector('.goog-ws-dash-main')
            let gotoUpdatePage = `https://sites.google.com/site/paylesscouponssite/home/${pageType}/${pageSlug}`
            await page.goto(gotoUpdatePage)
            delay(10000)
            const editButton = await page.$x('//*[@id="sites-collaborator-bar-edit-page-icon"]')
            if ( editButton.length > 0 ) {
                editButton[0].click()
            }
        }
        // Create sub-page
        console.log('Show HTML code')
        await delay(timeout)
        await page.waitForSelector('.jot-editorToolbar')
        const showCodeButton = await page.$x('//*[@id=":258m"]')
        if ( showCodeButton.length > 0 ) {
            showCodeButton[0].click()
        }
        console.log('Find textarea to paste text')
        await delay(timeout)
        const jsHandle = await page.evaluateHandle(() => {
        const element = document.getElementsByTagName("textarea");
        return element;
        });
        const result = await page.evaluate( (e, c, m) => {
            if ( !m ) {
                e[1].value = c
            } else {
                if ( e[1] ) {
                    e[1].value = c
                } else if ( e[0] ) {
                    e[0].value = c
                }
            }
            
        }, jsHandle, generatedContent, mode);
        console.log('Update HTML text')
        const updateHtmBtn = await page.$x("//button[contains(text(), 'Update')]")
        if ( updateHtmBtn.length > 0 ) {
            await updateHtmBtn[0].click()
        }
        await delay(timeout)
        console.log('Save site content')
        const saveAll = await page.$x('//*[@id="sites-editor-button-sites-save"]');
        if ( saveAll.length > 0 ) {
            await saveAll[0].click();
        }

        if ( !mode ) {
            // Change sub-page setting 
            console.log('Change page setting')
            await delay(timeout)
            await page.waitForSelector('#more-actions-btn')
            await page.click('#more-actions-btn')
            
            await page.waitForXPath('//*[@id="showPageSettings"]/div')
            const pageSettingButton = await page.$x('//*[@id="showPageSettings"]/div/span')
            if ( pageSettingButton.length > 0 ) {
                await pageSettingButton[0].click()
                await page.waitForSelector('#COMP_dialog')
                const showPageTitleBtn = await page.$x('//*[@id="COMP_dialog"]/p[1]/label[1]/input')
                if ( showPageTitleBtn.length > 0 ) {
                    await showPageTitleBtn[0].click()
                }
                const allowAttachBtn = await page.$x('//*[@id="COMP_dialog"]/p[1]/label[3]/input')
                if ( allowAttachBtn.length > 0 ) {
                    await allowAttachBtn[0].click()
                }
                const allowCommnetBtn = await page.$x('//*[@id="COMP_dialog"]/p[1]/label[4]/input')
                if ( allowCommnetBtn.length > 0 ) {
                    await allowCommnetBtn[0].click()
                }
                const saveBtn = await page.$x('//*[@id=":n.okBtn"]/div')
                if ( saveBtn.length > 0 ) {
                    await saveBtn[0].click()
                }
            }
        }
        await delay(10000)
        console.log('Write to log success file')
        let successFile = `success_${pageType}.log`
        writeToLog(successFile, pageSlug)
        await browser.close()
        if ( mode && mode == 'update' ) {
            process.exit()
        }
    } catch (exception) {
        if (browser) {
            await browser.close();
        }
        let errorFile = `error_${pageType}.log`
        console.error('Error! ' , exception.message)
        writeToLog(errorFile, pageSlug)
    }
}

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

 function writeToLog(type, msg) {
    let filePath = path.resolve(__dirname)
    let fullPath = filePath + '/' + type;
    const result = readFileLog(fullPath)
    if ( result.length > 0 ) {
        if ( result.indexOf(msg) < 0) {
            result.push(msg)
        }
    } else {
        result.push(msg)
    }
    fs.writeFile(fullPath, JSON.stringify(result), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("Log file save!");
    }); 
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

module.exports.createGooglePage = createGooglePage;