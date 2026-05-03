-- Migration 016 — Staff Departments
-- Adds department and job_title columns to profiles so super admin can
-- organise admin users into departments with labelled roles.

alter table public.profiles
  add column if not exists department text
    check (department in ('management','sales','finance','technical','marketing','support','operations')),
  add column if not exists job_title text,
  add column if not exists phone text;

comment on column public.profiles.department is 'Staff department — null for regular users';
comment on column public.profiles.job_title  is 'Job title shown in staff panel';
