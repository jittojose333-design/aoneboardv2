import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Service URL (Env Var or Default Local)
        // For local dev, we assume the scraper service runs on port 10000
        let SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:10000';
        if (!SCRAPER_SERVICE_URL.endsWith('/scrape')) {
            SCRAPER_SERVICE_URL += '/scrape';
        }

        console.log(`Proxying request to Scraper Service: ${SCRAPER_SERVICE_URL}`);

        const res = await fetch(SCRAPER_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Scraper Service Error (${res.status}): ${errorText}`);
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('API Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Scraper Service Unavailable' }, { status: 500 });
    }
}
