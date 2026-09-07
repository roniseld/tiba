export type Role = "volunteer" | "answerer" | "manager";
export type UserStatus = "pending" | "active" | "blocked";
export type QuestionStatus = "new" | "claimed" | "answered" | "closed";
export type Channel = "sms" | "email" | "whatsapp";

export interface User {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  team: string | null;
  role: Role;
  status: UserStatus;
  notify_sms: boolean;
  notify_email: boolean;
  notify_whatsapp: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface Question {
  id: string;
  asker_id: string;
  category: string;
  title: string;
  body: string;
  status: QuestionStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  answered_at: string | null;
  in_kb: boolean;
  notify_sms: boolean;
  notify_email: boolean;
  reminder_sent_at: string | null;
  escalated_at: string | null;
  created_at: string;
  asker?: Pick<User, "id" | "name" | "team">;
  claimer?: Pick<User, "id" | "name"> | null;
}

export interface Message {
  id: string;
  question_id: string;
  author_id: string;
  kind: "answer" | "followup";
  body: string;
  consulted_with: string | null;
  created_at: string;
  author?: Pick<User, "id" | "name" | "role">;
}

export const APP_NAME = "אני רק שאלה...";

export const CATEGORIES = [
  "החייאה",
  "קרדיאלי",
  "נשימתי",
  "נוירולוגי",
  "ילדים",
  "הריון ולידה",
  "מונחים רפואיים",
  "ציוד",
  "אחר",
] as const;

export const CATEGORY_HINT: Partial<Record<(typeof CATEGORIES)[number], string>> = {
  "ילדים": "כלל המקרים הנוגעים לילד",
};

export const TEAMS = ["רעננה", "הרצליה", "רמת השרון", "חוף השרון"] as const;

export const ROLE_LABEL: Record<Role, string> = {
  volunteer: "מתנדב/ת",
  answerer: "עונה מוסמך/ת",
  manager: "מנהל/ת אזור",
};

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  new: "ממתינה למענה",
  claimed: "בטיפול",
  answered: "נענתה",
  closed: "סגורה",
};
