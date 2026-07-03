import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { ai } from '@/lib/gemini';

// POST /api/orchestrate
export async function POST(req: Request) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { rawInstruction } = body;

    if (!rawInstruction || typeof rawInstruction !== 'string') {
      return NextResponse.json(
        { error: 'Falta la instrucción cruda (rawInstruction)' },
        { status: 400 }
      );
    }

    if (!ai) {
      return NextResponse.json(
        { error: 'Gemini no está configurado en el servidor' },
        { status: 500 }
      );
    }

    const systemPrompt = `
Eres un "Orquestador de IA" experto (Prompt Engineer). 
Tu trabajo es tomar las instrucciones sencillas de un usuario inexperto y transformarlas en un "System Prompt" robusto, profesional y detallado para que otra IA actúe como un Chatbot perfecto.

El usuario te dará una frase simple (ej: "Quiero vender zapatos y agendar citas").

Debes devolver EXCLUSIVAMENTE un objeto JSON válido con las siguientes dos propiedades:
1. "prompt": El system prompt complejo generado. Debe incluir: personalidad, tono, reglas de comportamiento, manejo de objeciones, y qué hacer si no sabe una respuesta. (Mínimo 3 párrafos estructurados).
2. "summary": Un resumen muy corto (1 línea) y amigable dirigido al usuario diciéndole qué configuraste. (Ej: "He configurado un asistente de ventas experto y persuasivo para tu negocio.")

No incluyas markdown como \`\`\`json, devuelve únicamente el JSON directo.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: rawInstruction,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    if (!response.text) {
      throw new Error('Respuesta vacía de la IA');
    }

    let result;
    try {
      result = JSON.parse(response.text.trim());
    } catch (parseError) {
      // Intento limpiar si vino con markdown
      const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanText);
    }

    if (!result.prompt || !result.summary) {
      throw new Error('El JSON devuelto no tiene el formato correcto');
    }

    return NextResponse.json({
      prompt: result.prompt,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Error in orchestrate API:', error);
    return NextResponse.json(
      { error: 'Error interno al orquestar la instrucción. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}
