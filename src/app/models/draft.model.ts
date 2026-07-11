/**
 * Anonymous menu drafts created through the NexMenus MCP (ChatGPT).
 * Shapes mirror the API DTOs in NexMenusAPI `domain/dto/draft`.
 */

export interface DraftBusiness {
  businessName: string;
  menuName?: string | null;
  description?: string | null;
  about?: string | null;
  cuisines?: string[] | null;
}

export interface DraftLocationContact {
  phone?: string | null;
  address?: string | null;
  showEmail?: boolean | null;
}

export interface DraftOrdering {
  phoneContactMethod?: 'text' | 'call' | null;
}

export interface DraftItem {
  clientReference?: string | null;
  name: string;
  description?: string | null;
  priceAmount: string | number;
  available?: boolean | null;
  sortOrder?: number | null;
}

export interface DraftCategory {
  clientReference?: string | null;
  name: string;
  sortOrder?: number | null;
  items?: DraftItem[] | null;
}

export interface DraftFaq {
  question: string;
  answer: string;
}

export interface DraftContent {
  business?: DraftBusiness | null;
  location?: DraftLocationContact | null;
  ordering?: DraftOrdering | null;
  operatingHours?: string | null;
  categories?: DraftCategory[] | null;
  faqs?: DraftFaq[] | null;
}

/** GET /api/v1/draft-previews/{token} */
export interface DraftPreview {
  businessName: string | null;
  menuName: string | null;
  status: string;
  expiresAt: string;
  content: DraftContent;
}

/** GET /api/v1/draft-claims/{token} — status values: unclaimed | claimed | expired */
export interface DraftClaimStatus {
  status: 'unclaimed' | 'claimed' | 'expired' | string;
  businessName: string | null;
  menuName: string | null;
  expiresAt: string;
}

/** POST /api/v1/draft-claims/{token} */
export interface DraftClaimResult {
  menuId: string;
  slug: string;
}
