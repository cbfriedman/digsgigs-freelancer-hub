-- Fix security warnings by setting search_path on all functions

CREATE OR REPLACE FUNCTION public.update_digger_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.digger_profiles
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.ratings
      WHERE digger_id = COALESCE(NEW.digger_id, OLD.digger_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.ratings
      WHERE digger_id = COALESCE(NEW.digger_id, OLD.digger_id)
    )
  WHERE id = COALESCE(NEW.digger_id, OLD.digger_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'consumer')
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_lead_price(gig_budget_min numeric, gig_budget_max numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  calculated_price NUMERIC;
BEGIN
  -- If no budget is set, return minimum
  IF gig_budget_min IS NULL OR gig_budget_min = 0 THEN
    RETURN 50;
  END IF;
  
  -- Calculate 0.5% of lower budget range
  calculated_price := gig_budget_min * 0.005;
  
  -- Return the higher of $50 or 0.5% of budget
  RETURN GREATEST(50, calculated_price);
END;
$function$;