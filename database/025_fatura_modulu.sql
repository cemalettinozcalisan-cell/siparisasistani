-- Invoice module — company name for customers
alter table customers add column if not exists company_name text;
