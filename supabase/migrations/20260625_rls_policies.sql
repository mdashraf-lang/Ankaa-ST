-- ============================================================
-- Ankaa ERP — Row Level Security Policies
-- Applied to: hvsbvmfvdphfahtbuekl.supabase.co
-- Date: 2026-06-25
--
-- NOTE: The application backend uses the service_role key for
-- all database operations, so these RLS policies act as
-- defense-in-depth for any direct database access.
-- The primary access control layer is the API route handlers.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = id );

-- Users can update their own non-sensitive fields
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = id )
  WITH CHECK ( (select auth.uid()) = id );

-- ============================================================
-- leave_requests
-- ============================================================

-- Users can read their own leave requests
CREATE POLICY "leave_requests_select_own"
  ON public.leave_requests FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

-- Users can insert their own leave requests
CREATE POLICY "leave_requests_insert_own"
  ON public.leave_requests FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

-- ============================================================
-- leave_balances
-- ============================================================

CREATE POLICY "leave_balances_select_own"
  ON public.leave_balances FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

-- ============================================================
-- invoices
-- ============================================================

CREATE POLICY "invoices_select_own"
  ON public.invoices FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "invoices_insert_own"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

-- ============================================================
-- todos
-- ============================================================

CREATE POLICY "todos_select_own"
  ON public.todos FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "todos_insert_own"
  ON public.todos FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "todos_update_own"
  ON public.todos FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "todos_delete_own"
  ON public.todos FOR DELETE
  TO authenticated
  USING ( (select auth.uid()) = user_id );

-- ============================================================
-- projects
-- ============================================================

CREATE POLICY "projects_select_member"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id
        AND pm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "projects_insert_authenticated"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = created_by );

-- ============================================================
-- project_members
-- ============================================================

CREATE POLICY "project_members_select"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_id
        AND pm2.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- project_lists
-- ============================================================

CREATE POLICY "project_lists_select_member"
  ON public.project_lists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id
        AND pm.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- project_cards
-- ============================================================

CREATE POLICY "project_cards_select_member"
  ON public.project_cards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id
        AND pm.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- notifications
-- ============================================================

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

-- ============================================================
-- org_chart — public read
-- ============================================================

CREATE POLICY "org_chart_select_authenticated"
  ON public.org_chart FOR SELECT
  TO authenticated
  USING ( true );

-- ============================================================
-- roster_attendance
-- ============================================================

CREATE POLICY "roster_select_own"
  ON public.roster_attendance FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

-- ============================================================
-- cost_centers — public read for authenticated
-- ============================================================

CREATE POLICY "cost_centers_select_authenticated"
  ON public.cost_centers FOR SELECT
  TO authenticated
  USING ( active = true );
