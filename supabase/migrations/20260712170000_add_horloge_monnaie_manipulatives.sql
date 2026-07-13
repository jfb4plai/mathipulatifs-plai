-- Élargit la contrainte manipulative pour accepter 'horloge' et 'monnaie'.
-- Utilise un bloc dynamique plutôt qu'un nom de contrainte codé en dur :
-- la table a été renommée (exercises -> mathip_exercises) par une migration
-- précédente sans que Postgres ne renomme la contrainte associée, son nom
-- réel n'est donc pas garanti.
--
-- Appliquée manuellement via le SQL Editor du dashboard Supabase (projet
-- partagé Flashfwb) le 2026-07-13, `supabase db push` étant inutilisable
-- ici : l'historique de migrations distant contient des entrées d'autres
-- apps PLAI partageant ce projet, absentes du dossier local par convention.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.mathip_exercises'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%manipulative%'
  LOOP
    EXECUTE format('ALTER TABLE public.mathip_exercises DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.mathip_exercises
  ADD CONSTRAINT mathip_exercises_manipulative_check
  CHECK (manipulative IN ('base10', 'droite-numerique', 'fractions', 'cuisenaire', 'cadres10', 'grille100', 'horloge', 'monnaie'));
