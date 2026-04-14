import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export async function extractResumeTextFromBuffer(filename: string, buffer: Buffer) {
  const normalized = filename.toLowerCase();

  if (normalized.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return normalizeExtractedText(result.text);
  }

  if (normalized.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeExtractedText(result.value);
  }

  if (normalized.endsWith('.doc') || normalized.endsWith('.txt')) {
    return normalizeExtractedText(buffer.toString('utf-8'));
  }

  throw new Error(`resume_file_format_not_supported:${filename}`);
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
