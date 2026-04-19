import { Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

const logger = new Logger('ResumeTextExtractor');

export async function extractResumeTextFromBuffer(filename: string, buffer: Buffer) {
  const normalized = filename.toLowerCase();
  logger.log(`Extracting text from ${filename} (buffer size: ${buffer.length} bytes)`);

  let text = '';
  try {
    if (normalized.endsWith('.pdf')) {
      const result = await pdf(buffer);
      text = result.text;
    } else if (normalized.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (normalized.endsWith('.doc')) {
      // .doc is binary, utf-8 string conversion will likely produce garbage
      // We log a warning but try to extract any readable strings
      text = buffer.toString('utf-8');
      logger.warn(`File ${filename} is a legacy .doc format. Text extraction might be unreliable.`);
    } else if (normalized.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      throw new Error(`resume_file_format_not_supported:${filename}`);
    }
  } catch (err) {
    logger.error(`Failed to extract text from ${filename}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }

  const normalizedText = normalizeExtractedText(text);
  const snippet = normalizedText.substring(0, 100).replace(/\n/g, ' ');
  
  if (!normalizedText || normalizedText.length < 10) {
    logger.warn(`Extracted text for ${filename} is suspiciously short or empty (${normalizedText.length} chars).`);
  } else {
    logger.log(`Extraction completed for ${filename} (${normalizedText.length} chars). Snippet: "${snippet}..."`);
  }

  return normalizedText;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
