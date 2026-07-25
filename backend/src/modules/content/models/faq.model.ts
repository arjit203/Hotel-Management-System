import { Schema, model, Document, Types } from "mongoose";

export type FaqApplicableTo = "hotel" | "hall" | "restaurant" | "general";

export interface IFaq extends Document {
  applicableTo: FaqApplicableTo;
  ownerId?: Types.ObjectId | null; // null when applicableTo === 'general'
  question: string;
  answer: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    applicableTo: { type: String, enum: ["hotel", "hall", "restaurant", "general"], required: true },
    ownerId: { type: Schema.Types.ObjectId, default: null, index: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Faq = model<IFaq>("Faq", faqSchema);
