-- Actualización de la tabla citas para la Agenda Veterinaria Inteligente
-- Ejecutar en el SQL Editor de Supabase

-- Agregar campos base si la tabla es antigua o nueva
ALTER TABLE public.citas 
ADD COLUMN IF NOT EXISTS cliente_id uuid,
ADD COLUMN IF NOT EXISTS paciente_id uuid,
ADD COLUMN IF NOT EXISTS fecha_hora timestamp with time zone,
ADD COLUMN IF NOT EXISTS duracion_minutos integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS tipo_cita character varying,
ADD COLUMN IF NOT EXISTS estado character varying DEFAULT 'Agendada',
ADD COLUMN IF NOT EXISTS motivo text,
ADD COLUMN IF NOT EXISTS hora_llegada_real timestamp with time zone,
ADD COLUMN IF NOT EXISTS motivo_cancelacion text,
ADD COLUMN IF NOT EXISTS notas_clinicas_preparacion text;

-- Agregar índices para mejorar la velocidad de carga en la agenda diaria
CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora ON public.citas (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON public.citas (estado);
CREATE INDEX IF NOT EXISTS idx_citas_sucursal ON public.citas (sucursal_id);
