import https from 'https';
import http from 'http';
import { URL } from 'url';

function getStream(targetUrl: string, callback: (res: any) => void, errorCallback: (err: any) => void) {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol.get(targetUrl, (res) => {
        // Automatically follow 301, 302, 307 redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let nextUrl = res.headers.location;
            // Handle relative redirect locations
            if (!nextUrl.startsWith('http')) {
                nextUrl = new URL(nextUrl, targetUrl).href;
            }
            return getStream(nextUrl, callback, errorCallback);
        }
        callback(res);
    }).on('error', errorCallback);
}

export default function handler(req: any, res: any) {
    // CORS headers to enable secure canvas reading
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing image url parameter' });
    }

    const decodedUrl = url as string;

    // Call redirect-following stream getter
    getStream(decodedUrl, (remoteRes) => {
        if (remoteRes.statusCode !== 200) {
            return res.status(remoteRes.statusCode || 500).json({ error: `Failed to retrieve image: Status ${remoteRes.statusCode}` });
        }

        res.setHeader('Content-Type', remoteRes.headers['content-type'] || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
        
        // Pipe the binary straight to Vercel response
        remoteRes.pipe(res);
    }, (err) => {
        console.error('[Image Proxy Error]:', err);
        return res.status(500).json({ error: err.message });
    });
}
