// Minimal Express server with Puppeteer PDF rendering
// Run with: node server/export-server.cjs
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// PDF export endpoint
app.post('/api/export/pdf', async (req, res) => {
  const { sections, company, classification, answers, origin } = req.body || {};
  if (!Array.isArray(sections)) {
    return res.status(400).json({ error: 'sections required' });
  }
  const appOrigin = origin || 'http://localhost:8080';
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Seed localStorage before navigation so app has data
    await page.goto('about:blank');
    await page.evaluate(({ company, classification, answers }) => {
      try {
        if (company) localStorage.setItem('companyProfileData', JSON.stringify(company));
        if (classification) localStorage.setItem('classificationResult', JSON.stringify(classification));
        if (answers) localStorage.setItem('questionnaireAnswers', JSON.stringify(answers));
      } catch {}
    }, { company, classification, answers });

  const query = encodeURIComponent(JSON.stringify(sections));
  // Ensure company profile section renders when requested
  const ensuredSections = Array.isArray(sections) ? sections : [];
  const candidateOrigins = [
    appOrigin,
    process.env.APP_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:8080'
  ].filter(Boolean);
  let navigated = false;
  for (const originCandidate of candidateOrigins) {
    const tryUrl = `${originCandidate}/print?sections=${encodeURIComponent(JSON.stringify(ensuredSections))}`;
    try {
      await page.goto(tryUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.cover-page, .print-section', { timeout: 15000 });
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
    let finalBytes = pdf;

    // Merge external AASB S2 PDF at the end for offline visibility
    try {
      const mainDoc = await PDFDocument.load(finalBytes);
      const aasbResp = await fetch('https://standards.aasb.gov.au/sites/default/files/2025-01/AASBS2_09-24.pdf');
      const aasbBytes = await aasbResp.arrayBuffer();
      const aasbDoc = await PDFDocument.load(aasbBytes);
      const copied = await mainDoc.copyPages(aasbDoc, aasbDoc.getPageIndices());
      copied.forEach(p => mainDoc.addPage(p));
      finalBytes = await mainDoc.save();
    } catch (mergeErr) {
      console.warn('Append AASB PDF failed (continuing with main PDF):', mergeErr?.message);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="AASB_S2_Readiness_Report.pdf"');
    res.send(Buffer.from(finalBytes));
  } catch (err) {
    console.error('PDF export error', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.EXPORT_SERVER_PORT || 8787;
app.listen(PORT, () => console.log(`Export server listening on :${PORT}`));


