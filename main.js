const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
require("dotenv").config();

const locationArr = [
  "Barrhaven, ON",
  "Ajax, ON",
  "Scarborough, ON",
  "Brampton, ON",
  "Etobicoke, ON",
  "Toronto, ON",
  "Mississauga, ON",
  "Bolton, ON",
  "Hamilton, ON",
  "Oakville, ON",
  "Milton, ON",
  "Cambridge, ON",
  "Kitchener, ON",
  "Windsor, ON",
  "Ottawa, ON",
  "Brantford, ON",
  "Fairbanks, AK",
];

const jobSearchURL = "https://hiring.amazon.com/app#/jobSearch";

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_PASSWORD,
  },
});

// Function to send an email notification
async function sendEmail(subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: process.env.RECEIVER_EMAIL,
      subject,
      html: `<p>${text}</p>`,
    });
    console.log("📧 Email sent!");
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

// Function to launch a Puppeteer browser
async function launchBrowser() {
  return await puppeteer.launch({
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

// Function to search for jobs
async function searchJobs(page) {
  console.log("🔍 Opening job search page...");
  await page.goto(jobSearchURL, { waitUntil: "networkidle2", timeout: 60000 });

  return await checkJobListings(page);
}

// Function to check job listings
async function checkJobListings(page) {
  console.log("🔍 Checking for job listings...");

  try {
    // Expand search if possible
    await page.evaluate(() => {
      const expandLink = document.querySelector(
        '[data-test-id="expand-your-search-link"]'
      );
      if (expandLink) expandLink.click();
    });

    // Wait for job listings to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get job listings
    const jobCards = await page.$$('.jobCardItem[role="link"]');

    for (let jobCard of jobCards) {
      let locationText = await jobCard.evaluate(
        (el) =>
          el.querySelector("div .hvh-careers-emotion-1lp5dlv")?.textContent ||
          ""
      );

      if (
        locationText &&
        locationArr.some((loc) => locationText.includes(loc))
      ) {
        console.log(`✅ Found job in ${locationText}`);
        await sendEmail("Amazon Job Found", `Job found in ${locationText}`);
        await jobCard.click();
        return true; // Job found
      }
    }
  } catch (error) {
    console.error("❌ Error during job search:", error);
  }

  return false; // No job found
}

// Main function
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  const jobFound = await searchJobs(page);

  if (!jobFound) {
    console.log("❌ No matching jobs found. Exiting...");
    await browser.close();
    return;
  }

  console.log("✅ Job matched and clicked! Exiting...");
  await browser.close();
})();
