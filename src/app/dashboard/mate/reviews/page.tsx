'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMyReviewsPage } from '@/lib/api/review.api';
import type { PaginatedReviews, Review } from '@/types/review.types';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { Pagination } from '@/components/ui/Pagination';
import { Star, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MateReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') === 'given' ? 'given' : 'received';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  
  const [data, setData] = useState<PaginatedReviews | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const resp = await getMyReviewsPage(activeTab, pageParam, 10);
        if (resp.success && resp.data) {
          setData(resp.data);
        } else {
          toast.error(resp.message || 'Failed to fetch reviews');
        }
      } catch (err) {
        toast.error('An error occurred while fetching reviews');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [activeTab, pageParam]);

  const setTab = (tab: 'received' | 'given') => {
    router.push(`/dashboard/mate/reviews?tab=${tab}&page=1`);
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/dashboard/mate/reviews?tab=${activeTab}&page=${newPage}`);
  };

  if (loading && !data) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
            My Reviews
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-1">
            See feedback from bosses and reviews you've written.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-1 w-full max-w-sm">
          <button
            onClick={() => setTab('received')}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
              activeTab === 'received' 
              ? 'bg-[var(--color-primary)] text-white shadow-sm' 
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            Received {data && activeTab === 'received' ? `(${data.total})` : ''}
          </button>
          <button
            onClick={() => setTab('given')}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
              activeTab === 'given' 
              ? 'bg-[var(--color-primary)] text-white shadow-sm' 
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            Given {data && activeTab === 'given' ? `(${data.total})` : ''}
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'received' && data && data.total > 0 && (
            <Card className="p-6 bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border-primary)] shadow-sm flex flex-col items-center justify-center">
              <Star className="h-8 w-8 text-amber-500 fill-amber-500 mb-2" />
              <h2 className="text-4xl font-black text-[var(--color-text-primary)]">
                {data.averageRating ? data.averageRating.toFixed(1) : '—'}
              </h2>
              <div className="mt-1">
                <StarRating rating={data.averageRating || 0} size="md" />
              </div>
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mt-2">
                Based on {data.total} Review{data.total !== 1 ? 's' : ''}
              </p>
            </Card>
          )}

          {loading ? (
            <div className="space-y-4">
               {[1,2,3].map(i => (
                 <Card key={i} className="h-32 animate-pulse bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)]" />
               ))}
            </div>
          ) : data?.reviews.length === 0 ? (
            <Card className="p-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/50">
              <MessageSquare className="h-10 w-10 text-[var(--color-text-muted)] opacity-30 mb-3" />
              <h3 className="font-bold text-sm text-[var(--color-text-primary)]">No reviews yet</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] max-w-sm mt-1">
                {activeTab === 'received' 
                  ? "When you complete jobs, bosses will leave feedback here."
                  : "You haven't left any reviews for bosses yet."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {data?.reviews.map((review: Review) => (
                <Card key={review._id} className="p-5 space-y-4 hover:border-[var(--color-primary)]/30 transition-colors shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={(activeTab === 'received' ? review.reviewerPhoto : null) || undefined}
                        name={activeTab === 'received' ? review.reviewerName : review.receiverId}
                        size="md"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                          {activeTab === 'received' ? review.reviewerName : 'Reviewed Boss'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="neutral" size="sm" className="text-[9px] py-0 h-4 uppercase tracking-wider font-bold">
                            {activeTab === 'received' ? review.reviewerRole : review.receiverRole}
                          </Badge>
                          <span className="text-[10px] text-[var(--color-text-tertiary)] font-bold">
                            {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>

                  <div className="pl-[52px]">
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed italic border-l-2 border-[var(--color-bg-tertiary)] pl-3 py-1">
                      &quot;{review.comment}&quot;
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                       <Badge variant="info" className="text-[9px] py-0 h-4 bg-blue-500/10 text-blue-500 border-none font-bold uppercase tracking-wider">JOB</Badge>
                       <span className="text-[11px] font-bold text-[var(--color-text-primary)]">
                         {review.jobName}
                       </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="pt-4 flex justify-center">
              <Pagination
                currentPage={data.page}
                totalPages={data.pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
