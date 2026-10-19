export type InteractionTarget = 'BLOG' | 'RECIPE';

export interface InteractionRating {
  targetType: InteractionTarget;
  targetId: string;
  averageStars: number | null;
  ratingCount: number;
  myRating: number | null;
}

export interface InteractionComment {
  id: string;
  targetType: InteractionTarget;
  targetId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ContentInteractions {
  rating: InteractionRating;
  comments: {
    items: InteractionComment[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
  };
}

export interface AdminInteractionRating {
  id: string;
  targetType: InteractionTarget;
  targetId: string;
  userId: string;
  userName: string;
  stars: number;
  updatedAt: string;
}
