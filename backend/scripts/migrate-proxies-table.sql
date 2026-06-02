-- Migration: Atualizar tabela proxies para o novo modelo com providers dinâmicos (Webshare/IPRoyal)
-- Data: 2026-05-28

-- 1. Adicionar coluna 'provider' (webshare, iproyal, etc.)
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'webshare';

-- 2. Adicionar coluna 'assignedInstanceId' para vincular o proxy a um chip
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS "assignedInstanceId" UUID NULL;

-- 3. Adicionar coluna 'expirationDate' para controle de validade
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS "expirationDate" TIMESTAMP NULL;

-- 4. Adicionar coluna 'updatedAt' para tracking de alterações
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- 5. Alterar coluna port de integer para varchar (a entidade espera string)
ALTER TABLE proxies ALTER COLUMN port TYPE VARCHAR(10) USING port::VARCHAR;

-- Verificação final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'proxies' 
ORDER BY ordinal_position;
