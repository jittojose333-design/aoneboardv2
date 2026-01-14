const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass SSL strictness for NIC sites
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Helper to resolve relative URLs
const resolveUrl = (base, relative) => {
    try {
        return new URL(relative, base).href;
    } catch (e) {
        return relative;
    }
};

// Helper to find link by approximate text
const findLink = ($, text) => {
    if (!text) return null;
    const search = text.toLowerCase().trim();

    // Try exact match first
    let el = $(`a`).filter((i, el) => $(el).text().toLowerCase().trim() === search).first();

    // Try contains if no exact match
    if (el.length === 0) {
        el = $(`a`).filter((i, el) => $(el).text().toLowerCase().includes(search)).first();
    }

    return el.length > 0 ? el.attr('href') : null;
};

const axios = require('axios');
const https = require('https');

// Create an Axios instance with SSL verification disabled via httpsAgent
const client = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false, // CRITICAL: This allows connection even if Govt cert is invalid/expired
        keepAlive: true
    }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    },
    timeout: 300000 // 5 minutes
});

// Helper to extract hostname for Host header
const getHeaders = (urlStr) => {
    try {
        const u = new URL(urlStr);
        return {
            'Host': u.hostname,
            'Referer': `${u.protocol}//${u.hostname}/`,
            'Origin': `${u.protocol}//${u.hostname}`
        };
    } catch (e) { return {}; }
};

// Retry logic helper
const fetchWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const dynamicHeaders = getHeaders(url);
            console.log(`Attempt ${i + 1} fetching: ${url}`);

            const response = await client.get(url, {
                headers: { ...client.defaults.headers, ...dynamicHeaders }
            });
            return response.data;
        } catch (error) {
            console.log(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, 3000));
        }
    }
};

app.get('/', (req, res) => {
    res.send('NREGA Scraper Service is Running 🚀 (Axios + Retry)');
});

app.post('/scrape', async (req, res) => {
    try {
        const { url, district, block, panchayat } = req.body;

        if (!url) return res.status(400).json({ error: 'Initial URL is required' });

        const fetchPage = async (pageUrl) => {
            console.log('Fetching (Axios+Retry):', pageUrl);
            return await fetchWithRetry(pageUrl);
        };

        // Step 1: Loading State Page (Provided URL)
        let currentUrl = url;
        let html = await fetchPage(currentUrl);
        let $ = cheerio.load(html);

        // If district provided, click it
        if (district) {
            const districtLink = findLink($, district);
            if (!districtLink) throw new Error(`District '${district}' not found in the list.`);
            currentUrl = resolveUrl(currentUrl, districtLink);

            // Step 2: Fetch District Page
            html = await fetchPage(currentUrl);
            $ = cheerio.load(html);
        }

        // If block provided, click it
        if (block) {
            const blockLink = findLink($, block);
            if (!blockLink) throw new Error(`Block '${block}' not found inside ${district}.`);
            currentUrl = resolveUrl(currentUrl, blockLink);

            // Step 3: Fetch Block Page
            html = await fetchPage(currentUrl);
            $ = cheerio.load(html);
        }

        // If panchayat provided, click specific column
        if (panchayat) {
            // Find the row containing the Panchayat Name
            let targetRow = null;
            const searchP = panchayat.toLowerCase().trim();

            $('tr').each((i, row) => {
                const rowText = $(row).text().toLowerCase();
                if (rowText.includes(searchP)) {
                    targetRow = $(row);
                    return false; // Break loop
                }
            });

            if (!targetRow) throw new Error(`Panchayat '${panchayat}' not found in the table rows.`);

            // Find the link in this row that is NOT the panchayat name itself, but looks like a number (No. of Vendors)
            const links = $(targetRow).find('a');
            let targetLink = null;

            // Logic: Pick the link that is entirely numeric or ends with a number
            links.each((i, link) => {
                const txt = $(link).text().trim();
                if (/^\d+$/.test(txt)) {
                    targetLink = $(link).attr('href');
                    return false; // Found the number link
                }
            });

            // Fallback: If no numeric link, take the last link
            if (!targetLink && links.length > 0) {
                targetLink = links.last().attr('href');
            }

            if (!targetLink) throw new Error(`Could not find 'No. of Vendors' link for '${panchayat}'.`);

            currentUrl = resolveUrl(currentUrl, targetLink);

            // Step 4: Fetch Final Panchayat Page
            html = await fetchPage(currentUrl);
            $ = cheerio.load(html);
        }

        // Step 5: Scrape Table Data
        let tableData = '';
        $('tr').each((i, row) => {
            const cells = $(row).find('td, th');
            if (cells.length > 0) {
                const rowText = cells.map((j, cell) => $(cell).text().trim().replace(/\s+/g, ' ')).get().join('\t');
                if (rowText.length > 10) {
                    tableData += rowText + '\n';
                }
            }
        });

        if (tableData.length < 50) {
            throw new Error("No data table found on the final page.");
        }

        res.json({ data: tableData, currentUrl });

    } catch (error) {
        console.error('Crawler Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
