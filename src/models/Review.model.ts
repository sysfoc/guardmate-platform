import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '@/types/enums';

export interface IReview extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    reviewerId: { type: String, required: true },
    reviewerName: { type: String, required: true },
    reviewerPhoto: { type: String, default: null },
    reviewerRole: { type: String, enum: Object.values(UserRole), required: true },
    receiverId: { type: String, required: true, index: true },
    receiverRole: { type: String, enum: Object.values(UserRole), required: true },
    jobId: { type: String, required: true, index: true },
    jobName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 500 },
    isPublic: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple reviews for the same job by the same reviewer
ReviewSchema.index({ reviewerId: 1, jobId: 1 }, { unique: true });

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
