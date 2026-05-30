import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('[send-email api] Missing RESEND_API_KEY environment variable.');
        return res.status(500).json({ error: 'Server Configuration Error: RESEND_API_KEY is not configured on the host.' });
    }

    const resend = new Resend(apiKey);
    // CORS headers for secure serverless API execution
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
        }

        // Split comma-separated emails and trim whitespace
        const toEmails = to
            .split(',')
            .map((email: string) => email.trim())
            .filter(Boolean);

        if (toEmails.length === 0) {
            return res.status(400).json({ error: 'No valid recipient email addresses' });
        }

        // Send email via Resend
        const response = await resend.emails.send({
            from: 'PragmaOS <onboarding@resend.dev>',
            to: toEmails,
            subject: subject,
            text: body,
        });

        if (response.error) {
            console.error('[Resend SDK Error]:', response.error);
            return res.status(400).json({ error: response.error.message });
        }

        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error('[Serverless Handler Error]:', error);
        return res.status(500).json({ error: (error as Error).message });
    }
}
