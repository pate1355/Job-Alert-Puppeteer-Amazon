const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");

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
];

const jobSearchURL = "https://hiring.amazon.ca/app#/jobSearch";

// Configure the email settings
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use any email service like Gmail, Outlook, etc.
  auth: {
    user: process.env.SENDER_EMAIL, // Replace with your email
    pass: process.env.SENDER_PASSWORD, // Replace with your email password or app-specific password
  },
});

// Function to send the email
async function sendEmail(subject, text) {
  const mailOptions = {
    from: process.env.SENDER_EMAIL, // Replace with your name and email
    to: process.env.RECEIVER_EMAIL, // Replace with your recipient email address
    subject: subject,
    text: text,
    html: `<p>${text}</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-popup-blocking", // Disable popup blocking
      "--disable-notifications", // Disable notifications
      "--disable-infobars", // Disable information bars
    ],
  });
  const page = await browser.newPage();

  console.log("Opening job search page...");
  await page.goto(jobSearchURL, { waitUntil: "networkidle2" });

  let jobFound = false;

  while (!jobFound) {
    console.log("Checking for job listings...");

    try {
      // Inject the 'Expand your search' link FIRST before checking jobs
      await page.evaluate(() => {
        if (
          document.querySelector('[data-test-id="expand-your-search-link"]')
        ) {
          console.log("Expand search link already exists");
          //click on the expand search link
          document
            .querySelector('[data-test-id="expand-your-search-link"]')
            .click();
          return;
        } else {
          let expandSearchLink = document.createElement("a");
          expandSearchLink.setAttribute(
            "data-test-id",
            "expand-your-search-link"
          );
          expandSearchLink.setAttribute("href", "#");
          expandSearchLink.textContent = "Expand your search";

          let pageRouter = document.querySelector("#pageRouter");
          if (pageRouter) {
            pageRouter.insertBefore(expandSearchLink, pageRouter.firstChild);
          }
        }
      });

      // Wait for job listings to appear
      //   await page.waitForSelector('.jobCardItem[role="link"]', {
      //     timeout: 3000,
      //   });
      const jobCards = await page.$$('.jobCardItem[role="link"]');

      let foundMatchingJob = false;
      console.log("Found job cards:", jobCards);

      for (let jobCard of jobCards) {
        let locationText = await jobCard.evaluate((el) => {
          return (
            el.querySelector("div .hvh-careers-emotion-1lp5dlv")?.textContent ||
            ""
          );
        });

        console.log("Found Job Location:", locationText);
        // return;

        if (locationText) {
          locationArr.forEach((loc) => {
            console.log("Location:", loc);

            if (locationText.includes(loc)) {
              console.log(`✅ Found match: ${locationText}`);

              sendEmail("Amazon Job Found", locationText);

              console.log("Clicking job card...");
              jobCard.click();
              console.log("Job card clicked!");

              jobFound = true;
              foundMatchingJob = true;
            }
          });
        }

        // if (
        //   locationArr.some(
        //     (loc) => console.log("Location:", loc) && locationText.includes(loc)
        //     //   && locationText.includes("Flex Time")
        //   )
        // ) {
        //   console.log(`✅ Found match: ${locationText}`);
        //   await jobCard.click();
        //   jobFound = true;
        //   foundMatchingJob = true;
        //   break;
        // }
      }

      if (!foundMatchingJob) {
        console.log("❌ No matching jobs found, trying to expand search...");

        // Click the "Expand your search" link if no job was found
        const expandLink = await page.$(
          '[data-test-id="expand-your-search-link"]'
        );
        if (expandLink) {
          console.log("Clicking 'Expand your search' link...");
          await expandLink.click();
        } else {
          console.log("Failed to insert or find 'Expand your search' link.");
        }

        // Wait for new results to load before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log("error", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("✅ Job matched and clicked! Exiting...");
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await browser.close();
})();
