/**
 * Generates a Gmail compose URL with prefilled parameters.
 * Uses standard Gmail URL parameter schema:
 * - to: primary recipients (comma-separated)
 * - su: subject line
 * - body: plain text body
 * - cc: cc recipients (comma-separated)
 * - bcc: bcc recipients (comma-separated)
 */
export const getGmailComposeUrl = (params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
}): string => {
    const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
    const queryParams = new URLSearchParams();
    
    queryParams.append('to', params.to);
    queryParams.append('su', params.subject);
    queryParams.append('body', params.body);
    
    if (params.cc) {
        queryParams.append('cc', params.cc);
    }
    if (params.bcc) {
        queryParams.append('bcc', params.bcc);
    }
    
    return `${baseUrl}&${queryParams.toString()}`;
};
