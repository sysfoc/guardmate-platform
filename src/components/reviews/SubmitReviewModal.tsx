import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { submitReview } from '@/lib/api/review.api';
import { UserRole } from '@/types/enums';

interface SubmitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rating: number, comment: string) => void;
  jobId: string;
  jobTitle: string;
  receiverName: string;
  receiverRole: UserRole;
  receiverPhoto: string | null;
}

export function SubmitReviewModal({
  isOpen,
  onClose,
  onSuccess,
  jobId,
  jobTitle,
  receiverName,
  receiverRole,
  receiverPhoto,
}: SubmitReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }
    if (comment.trim().length === 0) {
      setError('Please provide a comment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resp = await submitReview({ jobId, rating, comment });
      if (resp.success) {
        toast.success('Review submitted successfully!');
        onSuccess(rating, comment);
        onClose();
      } else {
        throw new Error(resp.message || 'Failed to submit review');
      }
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--color-bg-primary)] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-bg-elevated)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Leave a Review</h2>
            <p className="text-[10px] text-[var(--color-text-secondary)] font-medium mt-0.5 truncate max-w-[250px]">
              {jobTitle}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors rounded-full hover:bg-[var(--color-bg-elevated)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center gap-4 bg-[var(--color-card-bg)] p-4 rounded-lg border border-[var(--color-card-border)] mb-6">
            <Avatar src={receiverPhoto || undefined} name={receiverName} size="lg" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-[var(--color-text-primary)]">{receiverName}</span>
                <Badge variant={receiverRole === UserRole.BOSS ? 'boss' : 'mate'} className="text-[9px] uppercase">
                  {receiverRole}
                </Badge>
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-medium">
                How was your experience working with them?
              </p>
            </div>
          </div>

          <form id="review-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-[var(--color-danger-light)] text-[var(--color-danger)] p-3 rounded-lg text-xs font-bold">
                {error}
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-4 bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-card-border)]">
              <span className="text-[11px] font-bold text-[var(--color-input-label)] mb-3 uppercase tracking-wider">
                Select Rating
              </span>
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onChange={(val) => setRating(val)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-[var(--color-input-label)]">
                  Your Comment
                </label>
                <span className={`text-[10px] font-medium ${comment.length > 500 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-tertiary)]'}`}>
                  {comment.length} / 500
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                placeholder="Share your experience working with this user... (min. 10 chars)"
                className="w-full h-32 px-3 py-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-md text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none placeholder:text-[var(--color-text-muted)] p-2"
                required
              />
            </div>
          </form>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] flex justify-end gap-3 rounded-b-xl">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="review-form" 
            size="sm" 
            disabled={isSubmitting || rating === 0 || comment.length === 0}
            leftIcon={<Send className="h-4 w-4" />}
            loading={isSubmitting}
          >
            Submit Review
          </Button>
        </div>

      </div>
    </div>
  );
}
