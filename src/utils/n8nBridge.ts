import { addDoc } from 'firebase/firestore';
import { col, serverTimestamp } from '../firebase/firestore';

const VALID_ACTION_TYPES = [
    'send_meeting_reminder',
    'send_task_due_alert',
] as const;

type N8nActionType = typeof VALID_ACTION_TYPES[number];

export const triggerN8n = async (
    actionType: N8nActionType,
    payload: Record<string, unknown>
) => {
    if (JSON.stringify(payload).length > 10_000) {
        console.error('[n8n bridge] Payload too large, action dropped');
        return;
    }
    try {
        await addDoc(col('actions'), {
            action_type: actionType,
            payload,
            status: 'pending',
            result: null,
            created_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('[n8n bridge] Failed to write action doc:', err);
    }
};

export const triggerMeetingReminder = (meetingId: string, email: string, meetingTitle: string, startTime: Date) => {
    return triggerN8n('send_meeting_reminder', { meeting_id: meetingId, email, title: meetingTitle, time: startTime.toISOString() });
};

export const triggerTaskDueAlert = (taskId: string, email: string, taskTitle: string, dueDate: Date) => {
    return triggerN8n('send_task_due_alert', { task_id: taskId, email, title: taskTitle, due_date: dueDate.toISOString() });
};
