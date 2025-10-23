export type SecretGroupStatus = 'draft' | 'locked' | 'drawn' | 'closed';
export type SecretGroupType = 'classe' | 'custom';

export interface SecretGroup {
  id: string;
  owner_id: string;
  name: string;
  type: SecretGroupType;
  budget: number | null;
  reveal_at: string | null; // ISO
  message: string | null;
  rules: string | null;
  allow_wishlist: boolean;
  allow_exclusions: boolean;
  status: SecretGroupStatus;
  created_at: string;
  updated_at: string;
  _meta?: { participantsCount?: number; acceptedCount?: number };
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'participant';
  state: 'invited' | 'accepted' | 'declined';
  wishlist: string | null;
  wishlist_links: string[] | null;
  exclusions: string[] | null; // uuid[]
  created_at: string;
  updated_at: string;
}

export interface DrawRow {
  id: string;
  group_id: string;
  giver_member_id: string;
  receiver_member_id: string;
  revealed: boolean;
  created_at: string;
}

export interface MyAssignment {
  receiverName?: string | null;
  receiverEmail?: string | null;
  wishlist?: string | null;
  wishlist_links?: string[] | null;
}
