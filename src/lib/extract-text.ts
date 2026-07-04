import mammoth from 'mammoth';
import { extractText as extractPdfText } from 'unpdf';

// Límite de Vercel para el body de una función serverless: 4.5 MB.
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = '4MB';

// Tope de caracteres guardados por documento para no inflar el prompt del RAG.
export const MAX_CONTENT_LENGTH = 100_000;

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'csv'] as const;

export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

export function isSupportedFile(filename: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(getFileExtension(filename));
}

/**
 * Extrae el texto plano de un archivo subido (PDF, DOCX, TXT, MD o CSV)
 * para guardarlo como documento RAG. Lanza error si el formato no está
 * soportado o si el archivo no contiene texto extraíble.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = getFileExtension(file.name);
  const buffer = await file.arrayBuffer();

  let text: string;

  switch (extension) {
    case 'pdf': {
      const result = await extractPdfText(new Uint8Array(buffer), { mergePages: true });
      text = result.text;
      break;
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      text = result.value;
      break;
    }
    case 'txt':
    case 'md':
    case 'csv':
      text = Buffer.from(buffer).toString('utf-8');
      break;
    default:
      throw new Error(`Formato de archivo no soportado: .${extension}`);
  }

  // PostgreSQL no acepta bytes nulos en columnas de texto.
  const cleaned = text.replace(/\u0000/g, '').trim();

  if (!cleaned) {
    throw new Error(
      'No se pudo extraer texto del archivo. Si es un PDF escaneado (solo imágenes), copia el texto manualmente.'
    );
  }

  if (cleaned.length > MAX_CONTENT_LENGTH) {
    return cleaned.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Contenido truncado por exceder el límite de tamaño]';
  }

  return cleaned;
}
