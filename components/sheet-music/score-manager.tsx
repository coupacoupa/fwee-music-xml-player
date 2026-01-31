'use client';

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button'; // Assuming Button component exists or using standard button
import { Upload, FileMusic, Trash2, Edit2, X, Check, Loader2, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredSheets = React.useMemo(() => {
    if (!searchQuery.trim()) return sheets;
    const lowerQuery = searchQuery.toLowerCase();
    return sheets.filter(s => s.title.toLowerCase().includes(lowerQuery));
  }, [sheets, searchQuery]);

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
            'w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-gray-200',
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
            {/* Toolbar Section */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Library ({sheets.length})</h3>
              
              <div className="flex items-center gap-3">
                <label className={cn(
                  "flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm active:translate-y-[1px]",
                  uploading && "opacity-50 pointer-events-none"
                )}>
                  <input 
                    type="file" 
                    accept=".xml,.musicxml,.mxl" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleUpload}
                  />
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Upload</span>
                </label>

                {/* Search Bar */}
                <div className="relative w-56">
                   <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                     <Search className="w-3.5 h-3.5" />
                   </div>
                   <input 
                      type="text" 
                      placeholder="Search scores..." 
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
              </div>
            </div>

            {/* Library Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                       <tr>
                          <th className="px-4 py-3 font-medium">Title</th>
                          <th className="px-4 py-3 font-medium w-32">Date Added</th>
                          <th className="px-4 py-3 font-medium w-24 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading && sheets.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center pt-12">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                            <p className="text-gray-400">Loading library...</p>
                          </td>
                        </tr>
                      ) : filteredSheets.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-12 text-center text-gray-400">
                            {searchQuery ? "No matching scores found." : "Your library is empty."}
                          </td>
                        </tr>
                      ) : (
                        filteredSheets.map(sheet => (
                          <tr key={sheet.id} className="group hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
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
                                  className="w-full px-2 py-1 -ml-2 text-sm border border-blue-500 rounded outline-none shadow-sm"
                                />
                              ) : (
                                <div className="truncate max-w-[200px] sm:max-w-xs" title={sheet.title}>
                                  {sheet.title}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {editingId === sheet.id ? (
                                  <>
                                    <IconButton
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditSave(sheet.id)}
                                      icon={<Check className="w-3.5 h-3.5 text-green-600" />}
                                      label="Save"
                                      className="h-7 w-7 bg-green-50 hover:bg-green-100"
                                    />
                                    <IconButton
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingId(null)}
                                      icon={<X className="w-3.5 h-3.5 text-red-600" />}
                                      label="Cancel"
                                      className="h-7 w-7 bg-red-50 hover:bg-red-100"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <IconButton
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditStart(sheet.id, sheet.title)}
                                      icon={<Edit2 className="w-3.5 h-3.5 text-gray-500" />}
                                      label="Rename"
                                      className="h-7 w-7 hover:bg-white hover:shadow-sm"
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
                                      icon={deletingId === sheet.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-500" />}
                                      label="Delete"
                                      className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                 </table>
              </div>
           </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
