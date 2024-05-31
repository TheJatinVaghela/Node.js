const express = require("express");
const { URL } = require("url");
const fs = require('fs');
const path = require("path");
const puppeteer = require("puppeteer");
const pa11y = require("pa11y");
const internal = require("stream");
const debug = require("debug");
const category_json = require("./category.json");
const shortid = require('shortid');
const uniqueId = shortid.generate();
const Log = require('./logger');
let imagesDir = path.join(__dirname, 'images');
let error_obj = {};
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}
// const axeCore = require("axe-core");
const app = express();
const fetch = (...args) =>
  import("node-fetch").then((mod) => mod.default(...args));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));

function generateFolderName(website) {
  try {
    const currentDateTime = new Date().toISOString().replace(/[-T:.Z]/g, '');
    const uniqueId = shortid.generate()
    return `${website}_${currentDateTime}_${uniqueId}`;
  } catch (error) {
    error_obj.generateFolderName = `->>> ERRO when generate Folder <<<-`;
    Log.error(`\n ->>> ERRO when generate Folder <<<- \n`);
    process.exit();
  }
};

async function createDirectory(directory) {
  if (!fs.existsSync(directory)) {
    await fs.mkdirSync(directory, { recursive: true });
  } else {
    error_obj.createDirectory = `->>> Folder with name = ${directory} Already Exitst <<<-`;
    Log.error(`\n ->>> Folder with name = ${directory} Already Exitst <<<- \n`);
    process.exit();
  }
}

async function crawlAndTestWebsite(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const visited = new Set();
  const results = {}; // Object to store results with URLs as keys
  const folderName = path.join(__dirname, 'images', generateFolderName(url.replace(/[^a-z0-9]/gi, '_')));
  await createDirectory(folderName);
  async function crawl(url) {
    try {
      if (!visited.has(url)) {
        visited.add(url);
        await page.goto(url);
        currentDateTime = new Date();
        formattedDateTime = currentDateTime.toISOString().replace(/[-T:.Z]/g, '');
        // Get the URL of the current page after any redirects
        const currentUrl = page.url();
        // console.log(`\n${imagesDir}/${run}_${formattedDateTime}_${currentUrl}_.png\,`);
        sanitizedUrl = currentUrl.replace(/[^a-z0-9]/gi, '_');
        // Test the current page URL using Pa11y
        const result = await pa11y(currentUrl, {
          userAgent: 'A11Y TESTS',
          runners: ['axe', 'htmlcs'],
          standard: 'WCAG2AA',
          screenCapture: `${folderName}/${formattedDateTime}_${sanitizedUrl}_.png`,
          axe: {
            runOnly: {
              type: 'tag',
              values: ['wcag***']
            },
            rules: {
              'link-in-text-block': { enabled: false },
              'color-contrast': { enabled: false }, // Enabled color-contrast rule
              'valid-lang': { enabled: false },     // Disabled valid-lang rule
            },

            resultTypes: ['violations', 'incomplete', 'inapplicable'],
          },
          log: {
            debug: console.log,
            error: console.error,
            info: console.info,
          },
          browser: browser,
          page: page,
        });

        Log.info(`Accessibility result for ${currentUrl}: ${JSON.stringify(result, null, 2)}`);
        results[currentUrl] = result;
        // Extract internal links from the page
        const internalLinks = await page.$$eval('a[href]', (links) =>
          links.map((link) => link.href)
        );

        // Crawl each internal link recursively
        for (const link of internalLinks) {
          if (new URL(link).origin === new URL(url).origin) {
            await crawl(link);
          }
        }
      }
    } catch (error) {
      error_obj.crawlAndTestWebsite = `Error occurred while crawling ${url}: ${error.toString()}`;
      console.error(`Error occurred while crawling ${url}:`, error);
      // Add error information to results object
      results[url] = { error: error.toString() };
      // Move to the next URL
      return;
    }
  }

  await crawl(url);

  await browser.close();

  return results;
}

async function getWCAGInfo(refId, issues_obj) {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/tenon-io/wcag-as-json/master/wcag.json'
    );
    const wcagData = await response.json();
    for (const wcagData_key of wcagData) {
      let title = [];
      title.push(wcagData_key.title);
      let guidelines = wcagData_key.guidelines;
      guidelines.forEach((success_criteria_key) => {
        title.push(success_criteria_key.title);
        success_criteria_key.success_criteria.forEach((obj) => {
          if (obj.ref_id == refId) {
            title.push(obj.title);
            issues_obj.wcag_title = title;
            issues_obj.code = obj.url;
            issues_obj.level = obj.level;
            issues_obj.references = obj.references;
            const matchingCategory = category_json.rules.find((rule) =>
              rule.code.replace(/_/g, '.') == refId ? rule : null
            );
            if (matchingCategory != null) {
              issues_obj.category = matchingCategory.category;
              issues_obj.subcategory = matchingCategory.subcategory;
            }
          }
        });
      });
    }
    return issues_obj;
  } catch (error) {
    error_obj.getWCAGInfo = `Error fetching WCAG data: ${JSON.stringify(error, null, 2)}`;
    Log.error(`Error fetching WCAG data: ${JSON.stringify(error, null, 2)}`);
    return null;
  }
}

async function enhancePa11yResponse(pa11yResponse) {
  try {
    // Iterate through each URL's results in pa11yResponse
    for (const [url, response] of Object.entries(pa11yResponse)) {
      const issues = response.issues;
      if (issues) {
        // Iterate through each issue object
        for (let i = 0; i < issues.length; i++) {
          let obj = issues[i];
          if (obj && obj.code) {
            const ref_id = obj.code.split('.');
            if (ref_id.length > 1) {
              obj.ref_id = ref_id[3].replace(/_/g, '.');
              // console.log("obj LEVEL = ", obj);
              issues[i] = await getWCAGInfo(obj.ref_id, obj);
            }
          }
        }
      }
      pa11yResponse[url].issues = issues;
    }
    return pa11yResponse;
  } catch (error) {
    error_obj.enhancePa11yResponse = `Error enhancing Pa11y response:${JSON.stringify(error, null, 2)}`;
    Log.error(`Error enhancing Pa11y response:${JSON.stringify(error, null, 2)}`);
    return null;
  }
}
async function getTotalIssuesCount(result) {
  let totalIssues = 0;
  Object.values(result).forEach((issues) => {
    console.log("issues = ", issues);
    if (issues.length > 0) {
      issues.issues.forEach((isu) => {
        console.log(isu);
      });
    }
  });
  totalIssues = await totalIssues;
  return Number(totalIssues)
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/sample", (req, res) => {
  res.render("sample");
});
app.get("/result", (req, res) => {
  res.render("sample");
});
app.post("/check", async (req, res) => {
  const url = req.body.url;
  try {
    let result2;
    let result = await crawlAndTestWebsite(url).then((results) => {
      console.log('Crawling results:', results);
      Log.info(`Crawling results:${JSON.stringify(results, null, 2)}`);
      return enhancePa11yResponse(results);
    }).then((enhancedResults) => {
      result2 = enhancedResults
      console.log('Enhanced results:', enhancedResults);
      Log.info(`Enhanced results:${JSON.stringify(enhancedResults, null, 2)}`);
    }).catch((error) => {
      error_obj.processingError = `Error occurred:${JSON.stringify(error, null, 2)}`;
      console.error('Error occurred:', error);
      Log.error(`Error occurred:${JSON.stringify(error, null, 2)}`);
    });
    // getTotalIssuesCount(result2);
    console.log("res2 = ", result2);
    result = result2;
    Log.error(`ERROR THOUGHOUR PROSSES = ${JSON.stringify(error_obj, null, 2)}`);
    res.render("result", { result, error_obj });
    // res.send("Accessibility testing completed for the entire website.");
  } catch (error) {
    error_obj.MAIN = `${error}`;
    Log.error(`ERROR THOUGHOUR PROSSES = ${JSON.stringify(error_obj, null, 2)}`);
    console.error(error);
    res.render("result", { error_obj });
    // res.status(500).send("Error checking accessibility");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});