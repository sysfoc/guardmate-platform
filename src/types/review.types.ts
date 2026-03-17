import { UserRole } from './enums';

export interface Review {
  _id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto: string | null;
  reviewerRole: UserRole;
  receiverId: string;
  receiverRole: UserRole;
  jobId: string;
  jobName: string;
  rating: number;
  comment: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface PaginatedReviews {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
}
