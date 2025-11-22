// components/content/EditContentDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Content } from '@/lib/utils/types';
import { contentApi } from '@/lib/api/content';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui-base/Dialog';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { Label } from '@/components/ui-base/Label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { TagSelector } from '../shared/TagSelector';

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
});

type ContentFormData = z.infer<typeof contentSchema>;

interface EditContentDialogProps {
  content: Content;
  dashboardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditContentDialog({ content, dashboardId, open, onOpenChange }: EditContentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const updateContent = useDashboardStore((state) => state.updateContent);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: content.title,
      body: content.body || '',
      tags: content.tags?.map(t => t.name) || [],
      links: content.links || [],
    },
  });

  const links = watch('links') || [];

  useEffect(() => {
    if (open) {
      reset({
        title: content.title,
        body: content.body || '',
        tags: content.tags?.map(t => t.name) || [],
        links: content.links || [],
      });
    }
  }, [open, content, reset]);

  const handleAddLink = () => {
    if (linkInput.trim()) {
      setValue('links', [...links, linkInput.trim()]);
      setLinkInput('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setValue('links', links.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ContentFormData) => {
    setIsLoading(true);
    try {
      const response = await contentApi.update(content._id, {
        ...data,
        DashId: dashboardId,
      });
      if (response.success && response.data) {
        updateContent(dashboardId, content._id, response.data);
        toast.success('Note updated', {
          description: 'Your note has been updated successfully.',
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error('Failed to update', {
        description: error.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>
            Update your note's content, tags, and links.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              {...register('title')}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Controller
              name="body"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  content={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagSelector
                  selectedTags={field.value || []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Links</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="https://example.com"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
              <Button type="button" onClick={handleAddLink} variant="outline">
                Add
              </Button>
            </div>
            {links.length > 0 && (
              <div className="space-y-1 mt-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm truncate flex-1">{link}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLink(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}