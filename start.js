const puppeteer = require('puppeteer');
const htmlToText = require('html-to-text');
const fs = require('fs');
const path = require('path');
const config = require('dotenv').config();
const timeout = 5000;

var createGoogleSites = async function() {
    let browser;
    let page;
    try {

    } catch( error ) {
        if (browser) {
            await browser.close();
        }
        // let errorFile = `error_${pageType}.log`
        // console.error('Error! ' , exception.message)
        // writeToLog(errorFile, pageSlug)
    }
}