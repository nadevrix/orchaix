import { prisma } from './prisma';

// Tope diario de mensajes por agente (intercambios usuario+IA cuentan como 1).
export const DAILY_MESSAGE_LIMIT = parseInt(
  process.env.MAX_MESSAGES_PER_AGENT_PER_DAY || '500',
  10
);

/** Fecha de hoy en UTC truncada a día, para la columna @db.Date. */
export function todayUtc(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

/**
 * Devuelve true si el agente todavía tiene cupo de mensajes hoy.
 */
export async function isWithinDailyLimit(agentId: string): Promise<boolean> {
  const usage = await prisma.dailyUsage.findUnique({
    where: {
      agentId_date: { agentId, date: todayUtc() },
    },
    select: { messages: true },
  });
  return (usage?.messages ?? 0) < DAILY_MESSAGE_LIMIT;
}

/**
 * Registra un intercambio de mensajes (pregunta del cliente + respuesta IA)
 * en el contador diario del agente.
 */
export async function recordUsage(agentId: string, merchantId: string): Promise<void> {
  const date = todayUtc();
  await prisma.dailyUsage.upsert({
    where: {
      agentId_date: { agentId, date },
    },
    create: { agentId, merchantId, date, messages: 1 },
    update: { messages: { increment: 1 } },
  });
}
