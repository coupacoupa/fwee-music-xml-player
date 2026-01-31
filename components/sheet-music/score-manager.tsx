'use client';

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button'; // Assuming Button component exists or using standard button
import { Upload, FileMusic, Trash2, Edit2, X, Check, Loader2 } from 'lucide-react';
import { useSheetStore } from '@/lib/stores/sheet-store';
import { useAuth } from '@/lib/auth-context';
import { IconButton } from '@/components/ui/icon-button';

interface ScoreManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScoreManager({ open, onOpenChange }: ScoreManagerProps) {
  const { user } = useAuth();
  const { sheets, deleteSheet, renameSheet, uploadSheet, uploading, loading } = useSheetStore();
  
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleEditStart = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const handleEditSave = async (id: string) => {
    if (!user || !editValue.trim()) return;
    try {
      await renameSheet(id, user.id, editValue.trim());
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      setDeletingId(id);
      await deleteSheet(id, user.id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);
      await uploadSheet(formData, user.id);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className={cn(
            'fixed inset-0 bg-black/50 z-50',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
          )}
        />
        <BaseDialog.Popup
          className={cn(
            'fixed left-[50%] top-[50%] z-[60] translate-x-[-50%] translate-y-[-50%]',
            'w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'flex flex-col max-h-[85vh]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <BaseDialog.Title className="text-lg font-bold text-gray-900">
              Manage Library
            </BaseDialog.Title>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<X className="w-4 h-4" />}
              onClick={() => onOpenChange(false)}
              label="Close"
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {/* Upload Section */}
            <div className="mb-6">
              <label className={cn(
                "flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-gray-200 rounded-xl",
                "cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group",
                uploading && "opacity-50 pointer-events-none"
              )}>
                <input 
                  type="file" 
                  accept=".xml,.musicxml,.mxl" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleUpload}
                />
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 text-sm">Upload New Score</div>
                  <div className="text-xs text-gray-500">MusicXML or MXL files</div>
                </div>
              </label>
            </div>

            {/* List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Scores ({sheets.length})</h3>
              
              {loading && sheets.length === 0 ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                </div>
              ) : sheets.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No scores found. Upload one to get started!
                </div>
              ) : (
                sheets.map(sheet => (
                  <div key={sheet.id} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 text-gray-500">
                      <FileMusic className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {editingId === sheet.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave(sheet.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full px-2 py-1 text-sm border border-blue-500 rounded outline-none"
                        />
                      ) : (
                        <div className="font-medium text-sm text-gray-900 truncate" title={sheet.title}>
                          {sheet.title}
                        </div>
                      )}
                      {!editingId && (
                        <div className="text-[11px] text-gray-400 truncate">
                          Added {sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString() : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === sheet.id ? (
                        <>
                          <IconButton
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSave(sheet.id)}
                            icon={<Check className="w-3.5 h-3.5 text-green-600" />}
                            label="Save"
                            className="bg-green-50 hover:bg-green-100"
                          />
                          <IconButton
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            icon={<X className="w-3.5 h-3.5 text-red-600" />}
                            label="Cancel"
                            className="bg-red-50 hover:bg-red-100"
                          />
                        </>
                      ) : (
                        <>
                          <IconButton
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditStart(sheet.id, sheet.title)}
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                            label="Rename"
                          />
                          <IconButton
                            size="sm"
                            variant="ghost"
                            disabled={deletingId === sheet.id}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this score?')) {
                                handleDelete(sheet.id);
                              }
                            }}
                            icon={deletingId === sheet.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            label="Delete"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
