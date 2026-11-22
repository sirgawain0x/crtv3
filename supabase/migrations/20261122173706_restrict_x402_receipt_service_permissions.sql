-- Remove inherited default grants; retain only append/read access.
REVOKE ALL ON TABLE public.platform_api_payment_receipts FROM service_role;
GRANT SELECT, INSERT ON TABLE public.platform_api_payment_receipts TO service_role;
