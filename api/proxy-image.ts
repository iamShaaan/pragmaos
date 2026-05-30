import https from 'https';

export default function handler(req: any, res: any) {
    // Standard CORS headers for client-side drawing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing image url parameter' });
    }

    const decodedUrl = decodeURIComponent(url as string);

    // Stream image binary directly using native https.get to bypass any Vercel Node runtime fetch issues
    https.get(decodedUrl, (remoteRes) => {
        if (remoteRes.statusCode !== 200) {
            return res.status(remoteRes.statusCode || 500).json({ error: 'Failed to retrieve image from remote storage' });
        }

        res.setHeader('Content-Type', remoteRes.headers['content-type'] || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
        
        // Pipe the binary stream directly to the response
        remoteRes.pipe(res);
    }).on('error', (err) => {
        console.error('[Image Proxy Error]:', err);
        return res.status(500).json({ error: err.message });
    });
}
