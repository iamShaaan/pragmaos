import { addDoc } from 'firebase/firestore';
import { col, serverTimestamp } from '../firebase/firestore';

const VALID_ACTION_TYPES = [
    'send_meeting_reminder',
    'send_task_due_alert',
    'send_meeting_invitation',
    'send_invoice_email',
] as const;

type N8nActionType = typeof VALID_ACTION_TYPES[number];

export const triggerN8n = async (
    actionType: N8nActionType,
    payload: Record<string, unknown>
) => {
    if (JSON.stringify(payload).length > 10_000) {
        console.error('[email bridge] Payload too large, action dropped');
        return;
    }

    let actionStatus = 'pending';
    let actionResult: any = null;

    // Direct background sending via our secure Vercel Serverless Function
    try {
        let recipient = (payload.email as string) || '';
        let subject = (payload.title as string) || '';
        let body = (payload.body as string) || '';

        // Auto-generate standard bodies/subjects for reminders and due alerts if they aren't provided
        if (actionType === 'send_meeting_reminder') {
            const timeStr = payload.time ? new Date(payload.time as string).toLocaleString() : 'scheduled time';
            subject = `Meeting Reminder: ${payload.title}`;
            body = `Hello,\n\nThis is a friendly reminder for your upcoming meeting:\n\nEvent: ${payload.title}\nScheduled Time: ${timeStr}\n\nI look forward to our conversation.\n\nBest regards,\nPragmaOS Team`;
        } else if (actionType === 'send_task_due_alert') {
            const dueStr = payload.due_date ? new Date(payload.due_date as string).toLocaleDateString() : 'due date';
            subject = `Task Due Alert: ${payload.title}`;
            body = `Hello,\n\nThis is a friendly notification that your task "${payload.title}" is due on ${dueStr}.\n\nPlease visit your PragmaOS dashboard to manage or mark it complete.\n\nBest regards,\nPragmaOS Team`;
        }

        if (recipient && subject && body) {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: recipient,
                    subject: subject,
                    body: body,
                }),
            });

            if (res.ok) {
                const resText = await res.text();
                let data: any = {};
                try {
                    data = JSON.parse(resText);
                } catch {
                    data = { rawText: resText };
                }
                actionStatus = 'success';
                actionResult = { success: true, message: 'Email sent successfully via Resend serverless function', resendData: data };
            } else {
                const resText = await res.text();
                let errData: any = {};
                try {
                    errData = JSON.parse(resText);
                } catch {
                    errData = { error: resText || 'Server returned a non-JSON error response.' };
                }
                actionStatus = 'failed';
                actionResult = { success: false, error: errData.error || 'Serverless send failed' };
                console.error('[email bridge] Failed to send email via API:', errData);
            }
        } else {
            actionStatus = 'failed';
            actionResult = { success: false, error: 'Missing recipient, subject, or body in trigger payload' };
        }
    } catch (err) {
        actionStatus = 'failed';
        actionResult = { success: false, error: (err as Error).message };
        console.error('[email bridge] Network error triggering serverless send:', err);
    }

    try {
        // Keep writing to the Firestore actions collection as a durable audit log
        await addDoc(col('actions'), {
            action_type: actionType,
            payload,
            status: actionStatus,
            result: actionResult,
            created_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('[email bridge] Failed to write action log to database:', err);
    }
};

export const triggerMeetingReminder = (meetingId: string, email: string, meetingTitle: string, startTime: Date) => {
    return triggerN8n('send_meeting_reminder', { meeting_id: meetingId, email, title: meetingTitle, time: startTime.toISOString() });
};

export const triggerTaskDueAlert = (taskId: string, email: string, taskTitle: string, dueDate: Date) => {
    return triggerN8n('send_task_due_alert', { task_id: taskId, email, title: taskTitle, due_date: dueDate.toISOString() });
};

