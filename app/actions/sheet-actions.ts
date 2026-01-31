'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';
import { sheets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function uploadSheet(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      throw new Error('No file provided');
    }

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Supported formats
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isCompressed = fileExtension === 'mxl';
    const isMusicXML = fileExtension === 'xml' || fileExtension === 'musicxml' || isCompressed;

    if (!isMusicXML) {
      throw new Error('Please upload a MusicXML (.xml, .musicxml) or Compressed MusicXML (.mxl) file');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sheetId = crypto.randomUUID();
    const filename = `${userId}/${sheetId}.${fileExtension}`;

    // Upload to Supabase Storage (bucket: musicxml-files)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('musicxml-files')
      .upload(filename, file, {
        contentType: isCompressed ? 'application/vnd.recordare.musicxml+xml' : 'text/xml',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create database record
    const [sheet] = await db.insert(sheets).values({
      id: sheetId,
      userId,
      title: file.name.replace(/\.(xml|musicxml|mxl)$/i, ''),
      originalFilename: file.name,
      musicxmlStoragePath: uploadData.path,
      musicxmlFormat: isCompressed ? 'mxl' : 'musicxml',
      status: 'completed', // Ready immediately since no AI conversion needed
    }).returning();

    return { success: true, sheetId: sheet.id };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

export async function getMusicXMLContent(sheetId: string) {
  try {
    const [sheet] = await db.select().from(sheets).where(eq(sheets.id, sheetId));
    
    if (!sheet) {
      throw new Error('Sheet not found');
    }

    const { data, error: downloadError } = await supabaseAdmin.storage
      .from('musicxml-files')
      .createSignedUrl(sheet.musicxmlStoragePath, 3600); // 1 hour access

    if (downloadError) {
      throw new Error(`Failed to get file URL: ${downloadError.message}`);
    }

    return { 
      success: true, 
      url: data.signedUrl, 
      format: sheet.musicxmlFormat,
      title: sheet.title 
    };
  } catch (error) {
    console.error('Failed to get MusicXML:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch content',
    };
  }
}

export async function getUserSheets(userId: string) {
  try {
    const userSheets = await db.select()
      .from(sheets)
      .where(eq(sheets.userId, userId))
      .orderBy(sheets.createdAt);

    return { success: true, sheets: userSheets };
  } catch (error) {
    console.error('Failed to fetch sheets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sheets',
    };
  }
}

export async function deleteSheet(sheetId: string, userId: string) {
  try {
    const [sheet] = await db.select().from(sheets).where(eq(sheets.id, sheetId));
    if (!sheet || sheet.userId !== userId) {
      throw new Error('Sheet not found or unauthorized');
    }

    // Delete from storage
    await supabaseAdmin.storage
      .from('musicxml-files')
      .remove([sheet.musicxmlStoragePath]);

    // Delete from DB
    await db.delete(sheets).where(eq(sheets.id, sheetId));

    return { success: true };
  } catch (error) {
    console.error('Delete failed:', error);
    return { success: false, error: 'Failed to delete sheet' };
  }
}

export async function renameSheet(sheetId: string, userId: string, newTitle: string) {
  try {
    const [sheet] = await db.select().from(sheets).where(eq(sheets.id, sheetId));
    if (!sheet || sheet.userId !== userId) {
      throw new Error('Sheet not found or unauthorized');
    }

    await db.update(sheets)
      .set({ title: newTitle })
      .where(eq(sheets.id, sheetId));

    return { success: true };
  } catch (error) {
    console.error('Rename failed:', error);
    return { success: false, error: 'Failed to rename sheet' };
  }
}
