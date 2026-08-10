-- Enable Row Level Security for the BigCat marketplace
-- Run this in the Supabase SQL Editor after the base schema scripts.
--
-- Important:
-- - This project currently uses the service role key in server-side code.
-- - Service role requests bypass RLS, so keep that key server-only.
-- - RLS still protects browser / anon access and any future session-based queries.

BEGIN;

DO $$
BEGIN
  -- auth_users: users can only read and update their own profile row.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'auth_users'
  ) THEN
    EXECUTE 'ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS auth_users_select_own ON public.auth_users';
    EXECUTE 'CREATE POLICY auth_users_select_own ON public.auth_users
      FOR SELECT TO authenticated
      USING (id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS auth_users_update_own ON public.auth_users';
    EXECUTE 'CREATE POLICY auth_users_update_own ON public.auth_users
      FOR UPDATE TO authenticated
      USING (id::text = auth.uid()::text)
      WITH CHECK (id::text = auth.uid()::text)';
  END IF;

  -- merchant_profiles: only the owning merchant can read or update this table.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'merchant_profiles'
  ) THEN
    EXECUTE 'ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS merchant_profiles_select_own ON public.merchant_profiles';
    EXECUTE 'CREATE POLICY merchant_profiles_select_own ON public.merchant_profiles
      FOR SELECT TO authenticated
      USING (user_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS merchant_profiles_update_own ON public.merchant_profiles';
    EXECUTE 'CREATE POLICY merchant_profiles_update_own ON public.merchant_profiles
      FOR UPDATE TO authenticated
      USING (user_id::text = auth.uid()::text)
      WITH CHECK (user_id::text = auth.uid()::text)';
  END IF;

  -- products: public can view active products; merchants can manage only their own.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS products_public_read ON public.products';
    EXECUTE 'CREATE POLICY products_public_read ON public.products
      FOR SELECT TO anon, authenticated
      USING (COALESCE(is_active, true) = true OR merchant_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS products_insert_own ON public.products';
    EXECUTE 'CREATE POLICY products_insert_own ON public.products
      FOR INSERT TO authenticated
      WITH CHECK (merchant_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS products_update_own ON public.products';
    EXECUTE 'CREATE POLICY products_update_own ON public.products
      FOR UPDATE TO authenticated
      USING (merchant_id::text = auth.uid()::text)
      WITH CHECK (merchant_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS products_delete_own ON public.products';
    EXECUTE 'CREATE POLICY products_delete_own ON public.products
      FOR DELETE TO authenticated
      USING (merchant_id::text = auth.uid()::text)';
  END IF;

  -- orders: buyers can view and manage only their own orders.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'buyer_id'
    ) THEN
      EXECUTE 'DROP POLICY IF EXISTS orders_select_own ON public.orders';
      EXECUTE 'CREATE POLICY orders_select_own ON public.orders
        FOR SELECT TO authenticated
        USING (buyer_id::text = auth.uid()::text)';

      EXECUTE 'DROP POLICY IF EXISTS orders_insert_own ON public.orders';
      EXECUTE 'CREATE POLICY orders_insert_own ON public.orders
        FOR INSERT TO authenticated
        WITH CHECK (buyer_id::text = auth.uid()::text)';

      EXECUTE 'DROP POLICY IF EXISTS orders_update_own ON public.orders';
      EXECUTE 'CREATE POLICY orders_update_own ON public.orders
        FOR UPDATE TO authenticated
        USING (buyer_id::text = auth.uid()::text)
        WITH CHECK (buyer_id::text = auth.uid()::text)';
    END IF;
  END IF;

  -- order_items: buyers can read items from their orders, and merchants can read their own line items.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_items'
  ) THEN
    EXECUTE 'ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'order_id'
    ) THEN
      EXECUTE 'DROP POLICY IF EXISTS order_items_select_related ON public.order_items';

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'merchant_id'
      ) THEN
        EXECUTE 'CREATE POLICY order_items_select_related ON public.order_items
          FOR SELECT TO authenticated
          USING (
            merchant_id::text = auth.uid()::text
            OR EXISTS (
              SELECT 1
              FROM public.orders o
              WHERE o.id::text = order_items.order_id::text
                AND o.buyer_id::text = auth.uid()::text
            )
          )';
      ELSE
        EXECUTE 'CREATE POLICY order_items_select_related ON public.order_items
          FOR SELECT TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.orders o
              WHERE o.id::text = order_items.order_id::text
                AND o.buyer_id::text = auth.uid()::text
            )
          )';
      END IF;
    END IF;
  END IF;

  -- conversations: only the buyer or merchant in the conversation can access it.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversations'
  ) THEN
    EXECUTE 'ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS conversations_select_participants ON public.conversations';
    EXECUTE 'CREATE POLICY conversations_select_participants ON public.conversations
      FOR SELECT TO authenticated
      USING (buyer_id::text = auth.uid()::text OR merchant_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS conversations_insert_participants ON public.conversations';
    EXECUTE 'CREATE POLICY conversations_insert_participants ON public.conversations
      FOR INSERT TO authenticated
      WITH CHECK (buyer_id::text = auth.uid()::text OR merchant_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS conversations_update_participants ON public.conversations';
    EXECUTE 'CREATE POLICY conversations_update_participants ON public.conversations
      FOR UPDATE TO authenticated
      USING (buyer_id::text = auth.uid()::text OR merchant_id::text = auth.uid()::text)
      WITH CHECK (buyer_id::text = auth.uid()::text OR merchant_id::text = auth.uid()::text)';
  END IF;

  -- messages: only conversation participants can see or send messages.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS messages_select_participants ON public.messages';
    EXECUTE 'CREATE POLICY messages_select_participants ON public.messages
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.conversations c
          WHERE c.id::text = messages.conversation_id::text
            AND (c.buyer_id::text = auth.uid()::text OR c.merchant_id::text = auth.uid()::text)
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS messages_insert_sender ON public.messages';
    EXECUTE 'CREATE POLICY messages_insert_sender ON public.messages
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id::text = auth.uid()::text
        AND EXISTS (
          SELECT 1
          FROM public.conversations c
          WHERE c.id::text = messages.conversation_id::text
            AND (c.buyer_id::text = auth.uid()::text OR c.merchant_id::text = auth.uid()::text)
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS messages_update_participants ON public.messages';
    EXECUTE 'CREATE POLICY messages_update_participants ON public.messages
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.conversations c
          WHERE c.id::text = messages.conversation_id::text
            AND (c.buyer_id::text = auth.uid()::text OR c.merchant_id::text = auth.uid()::text)
        )
      )';
  END IF;

  -- payment methods: users manage only their own cards.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_methods'
  ) THEN
    EXECUTE 'ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS payment_methods_select_own ON public.payment_methods';
    EXECUTE 'CREATE POLICY payment_methods_select_own ON public.payment_methods
      FOR SELECT TO authenticated
      USING (user_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS payment_methods_insert_own ON public.payment_methods';
    EXECUTE 'CREATE POLICY payment_methods_insert_own ON public.payment_methods
      FOR INSERT TO authenticated
      WITH CHECK (user_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS payment_methods_update_own ON public.payment_methods';
    EXECUTE 'CREATE POLICY payment_methods_update_own ON public.payment_methods
      FOR UPDATE TO authenticated
      USING (user_id::text = auth.uid()::text)
      WITH CHECK (user_id::text = auth.uid()::text)';

    EXECUTE 'DROP POLICY IF EXISTS payment_methods_delete_own ON public.payment_methods';
    EXECUTE 'CREATE POLICY payment_methods_delete_own ON public.payment_methods
      FOR DELETE TO authenticated
      USING (user_id::text = auth.uid()::text)';
  END IF;

  -- reviews: everyone can read; signed-in users can manage only their own reviews.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reviews'
  ) THEN
    EXECUTE 'ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS reviews_public_read ON public.reviews';
    EXECUTE 'CREATE POLICY reviews_public_read ON public.reviews
      FOR SELECT TO anon, authenticated
      USING (true)';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'DROP POLICY IF EXISTS reviews_insert_own ON public.reviews';
      EXECUTE 'CREATE POLICY reviews_insert_own ON public.reviews
        FOR INSERT TO authenticated
        WITH CHECK (user_id::text = auth.uid()::text)';

      EXECUTE 'DROP POLICY IF EXISTS reviews_update_own ON public.reviews';
      EXECUTE 'CREATE POLICY reviews_update_own ON public.reviews
        FOR UPDATE TO authenticated
        USING (user_id::text = auth.uid()::text)
        WITH CHECK (user_id::text = auth.uid()::text)';

      EXECUTE 'DROP POLICY IF EXISTS reviews_delete_own ON public.reviews';
      EXECUTE 'CREATE POLICY reviews_delete_own ON public.reviews
        FOR DELETE TO authenticated
        USING (user_id::text = auth.uid()::text)';
    END IF;
  END IF;

  -- escrow: buyers and recipient merchants can view related funds; writes stay backend-only.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'escrow'
  ) THEN
    EXECUTE 'ALTER TABLE public.escrow ENABLE ROW LEVEL SECURITY';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'escrow' AND column_name = 'order_id'
    ) THEN
      EXECUTE 'DROP POLICY IF EXISTS escrow_select_related ON public.escrow';

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'escrow' AND column_name = 'recipient_id'
      ) THEN
        EXECUTE 'CREATE POLICY escrow_select_related ON public.escrow
          FOR SELECT TO authenticated
          USING (
            recipient_id::text = auth.uid()::text
            OR EXISTS (
              SELECT 1
              FROM public.orders o
              WHERE o.id::text = escrow.order_id::text
                AND o.buyer_id::text = auth.uid()::text
            )
          )';
      ELSE
        EXECUTE 'CREATE POLICY escrow_select_related ON public.escrow
          FOR SELECT TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.orders o
              WHERE o.id::text = escrow.order_id::text
                AND o.buyer_id::text = auth.uid()::text
            )
          )';
      END IF;
    END IF;
  END IF;

  -- Backend-managed tables: enable RLS so they are locked down unless accessed by the server role.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'otp_verification'
  ) THEN
    EXECUTE 'ALTER TABLE public.otp_verification ENABLE ROW LEVEL SECURITY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'merchant_onboarding_requests'
  ) THEN
    EXECUTE 'ALTER TABLE public.merchant_onboarding_requests ENABLE ROW LEVEL SECURITY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agents'
  ) THEN
    EXECUTE 'ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

COMMIT;
