import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { DAILY_MESSAGE_LIMIT, todayUtc } from '@/lib/usage';

// GET /api/usage - Consumo de mensajes del comercio autenticado (últimos 30 días)
export async function GET(req: Request) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const since = todayUtc();
    since.setUTCDate(since.getUTCDate() - 29);

    const records = await prisma.dailyUsage.findMany({
      where: {
        merchantId: payload.userId,
        date: { gte: since },
      },
      orderBy: { date: 'asc' },
      select: {
        agentId: true,
        date: true,
        messages: true,
      },
    });

    // Totales por día (sumando todos los agentes del comercio)
    const byDay = new Map<string, number>();
    let totalMessages = 0;
    for (const record of records) {
      const day = record.date.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + record.messages);
      totalMessages += record.messages;
    }

    const today = todayUtc().toISOString().slice(0, 10);

    return NextResponse.json({
      totalMessages,
      todayMessages: byDay.get(today) ?? 0,
      dailyLimitPerAgent: DAILY_MESSAGE_LIMIT,
      days: Array.from(byDay, ([date, messages]) => ({ date, messages })),
      byAgent: records,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar el consumo' },
      { status: 500 }
    );
  }
}
