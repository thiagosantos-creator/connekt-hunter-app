import { Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

const logger = new Logger('ResumeTextExtractor');

export async function extractResumeTextFromBuffer(filename: string, buffer: Buffer) {
  const normalized = filename.toLowerCase();
  logger.log(`Extracting text from ${filename} (buffer size: ${buffer.length} bytes)`);

  let text = '';
  if (normalized.endsWith('.pdf')) {
    const result = await pdf(buffer);
    text = result.text;
  } else if (normalized.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (normalized.endsWith('.doc') || normalized.endsWith('.txt')) {
    text = buffer.toString('utf-8');
  } else {
    throw new Error(`resume_file_format_not_supported:${filename}`);
  }

  const normalizedText = normalizeExtractedText(text);
  logger.log(`Extraction completed for ${filename} (text length: ${normalizedText.length})`);
  return normalizedText;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
