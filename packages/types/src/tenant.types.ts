export interface BusinessKnowledgeCard {
  company_name: string;
  founded?: string;
  working_hours: string;
  cargo_companies: string[];
  payment_methods: string[];
  products: string[];
  return_policy?: string;
  faq: { question: string; answer: string }[];
  custom_info?: Record<string, string>;
}
