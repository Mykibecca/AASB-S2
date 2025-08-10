// Minimal Express server with Puppeteer PDF rendering (CommonJS)
// Run with: node server/export-server.cjs
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// PDF export endpoint
app.post('/api/export/pdf', async (req, res) => {
  const { sections, company, classification, answers, eligibility, origin } = req.body || {};
  if (!Array.isArray(sections)) {
    return res.status(400).json({ error: 'sections required' });
  }
  const appOrigin = origin || 'http://localhost:8080';
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    const query = encodeURIComponent(JSON.stringify(sections));
    // Ensure company profile section renders when requested
    const ensuredSections = Array.isArray(sections) ? sections : [];
    const candidateOrigins = [
      appOrigin,
      process.env.APP_ORIGIN,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173', // vite preview
      'http://127.0.0.1:4173',
      'http://localhost:8080'
    ].filter(Boolean);
    let navigated = false;
    for (const originCandidate of candidateOrigins) {
      try {
        // First navigate to the app origin to get the correct localStorage origin scope
        await page.goto(`${originCandidate}/`, { waitUntil: 'domcontentloaded' });
        // Seed localStorage for this origin
        await page.evaluate(({ company, classification, answers, eligibility }) => {
          try {
            if (company) localStorage.setItem('companyProfileData', JSON.stringify(company));
            if (classification) localStorage.setItem('classificationResult', JSON.stringify(classification));
            if (answers) localStorage.setItem('questionnaireAnswers', JSON.stringify(answers));
            if (eligibility) localStorage.setItem('disclosureEligibilityAnswers', JSON.stringify(eligibility));
          } catch {}
        }, { company, classification, answers, eligibility });
        // Ensure app knows storage changed in this context
        await page.evaluate(() => {
          try {
            window.dispatchEvent(new CustomEvent('questionnaire:updated'));
            window.dispatchEvent(new StorageEvent('storage', { key: 'companyProfileData' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'classificationResult' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'questionnaireAnswers' }));
          } catch {}
        });
        // Now navigate to the print route with the requested sections
        const tryUrl = `${originCandidate}/print?sections=${encodeURIComponent(JSON.stringify(ensuredSections))}`;
        await page.goto(tryUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.cover-page, .print-section', { timeout: 20000 });
        navigated = true;
        break;
      } catch (navErr) {
        // try next origin
      }
    }
    if (!navigated) {
      throw new Error('Unable to reach app origin to render /print');
    }
    await page.emulateMediaType('print');

    const dateStr = new Date().toLocaleDateString();
    const headerTemplate = `
      <div style="font-size:10px; text-align:left; width:100%; padding-left:10mm; color:#444;">
        AASB S2 Readiness Report — ${dateStr}
      </div>`;
    const footerTemplate = `
      <div style="font-size:10px; width:100%; text-align:center; color:#444;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`;

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' }
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="AASB_S2_Readiness_Report.pdf"');
    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error('PDF export error', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.EXPORT_SERVER_PORT || 8787;
app.listen(PORT, () => console.log(`Export server listening on :${PORT}`));


