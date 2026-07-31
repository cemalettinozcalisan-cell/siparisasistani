-- Fix user_role enum — add manager and staff
alter type user_role add value 'manager';
alter type user_role add value 'staff';
