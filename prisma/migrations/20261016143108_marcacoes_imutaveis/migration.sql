-- Marcações de ponto são imutáveis (Portaria MTE 671/2021).
-- Correções acontecem por ajuste, registrado à parte, preservando a marcação original.
CREATE OR REPLACE FUNCTION prevent_time_entry_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Marcações de ponto não podem ser alteradas nem excluídas.'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_immutable
  BEFORE UPDATE OR DELETE ON "time_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_time_entry_change();

-- TRUNCATE não dispara triggers de linha; bloqueia também.
CREATE TRIGGER time_entries_no_truncate
  BEFORE TRUNCATE ON "time_entries"
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_time_entry_change();

-- Linha única do contador de NSR.
INSERT INTO "nsr_counter" ("id", "value") VALUES (1, 0) ON CONFLICT ("id") DO NOTHING;
