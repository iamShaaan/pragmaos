export default async function handler(req: any, res: any) {
    // CORS headers to allow client-side canvas reading
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing image url parameter' });
    }

    try {
        const decodedUrl = decodeURIComponent(url as string);
        const response = await fetch(decodedUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to retrieve image from remote storage' });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/png';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
        return res.send(buffer);
    } catch (err) {
        console.error('[Image Proxy Error]:', err);
        return res.status(500).json({ error: (err as Error).message });
    }
}
