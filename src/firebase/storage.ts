import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, APP_ID, auth } from './config';

export const uploadFile = async (
    file: File,
    entityType: string,
    entityId: string
): Promise<{ name: string; url: string; type: string; size: number }> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Must be signed in to upload files');
    const path = `apps/${APP_ID}/${uid}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { name: file.name, url, type: file.type, size: file.size };
};

export const deleteFile = async (url: string) => {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
};
