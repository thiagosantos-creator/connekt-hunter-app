import { Injectable, Logger } from '@nestjs/common';
import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectKeyPhrasesCommand,
  DetectEntitiesCommand,
  type SentimentType,
  type LanguageCode as ComprehendLanguageCode,
} from '@aws-sdk/client-comprehend';

export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  scores: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
}

export interface KeyPhraseResult {
  text: string;
  score: number;
  beginOffset: number;
  endOffset: number;
}

export interface EntityResult {
  text: string;
  type: string;
  score: number;
  beginOffset: number;
  endOffset: number;
}

export interface ComprehendAnalysis {
  sentiment: SentimentResult;
  keyPhrases: KeyPhraseResult[];
  entities: EntityResult[];
  languageCode: string;
}

@Injectable()
export class AwsComprehendProvider {
  private readonly logger = new Logger(AwsComprehendProvider.name);
  private readonly client: ComprehendClient;

  constructor() {
    this.client = new ComprehendClient({
      region: process.env.AWS_COMPREHEND_REGION ?? process.env.S3_REGION ?? 'us-east-1',
    });
  }

  async analyzeText(text: string, languageCode?: string): Promise<ComprehendAnalysis> {
    const lang = this.normalizeLanguage(languageCode ?? 'pt-BR');
    const truncated = text.slice(0, 5000);

    const [sentimentResult, keyPhrasesResult, entitiesResult] = await Promise.all([
      this.detectSentiment(truncated, lang),
      this.detectKeyPhrases(truncated, lang),
      this.detectEntities(truncated, lang),
    ]);

    this.logger.log(
      JSON.stringify({
        event: 'comprehend_analysis_complete',
        sentiment: sentimentResult.sentiment,
        keyPhrasesCount: keyPhrasesResult.length,
        entitiesCount: entitiesResult.length,
        languageCode: lang,
      }),
    );

    return {
      sentiment: sentimentResult,
      keyPhrases: keyPhrasesResult,
      entities: entitiesResult,
      languageCode: lang,
    };
  }

  private async detectSentiment(text: string, languageCode: string): Promise<SentimentResult> {
    const command = new DetectSentimentCommand({
      Text: text,
      LanguageCode: languageCode as ComprehendLanguageCode,
    });

    const response = await this.client.send(command);

    return {
      sentiment: (response.Sentiment as SentimentType) ?? 'NEUTRAL',
      scores: {
        positive: response.SentimentScore?.Positive ?? 0,
        negative: response.SentimentScore?.Negative ?? 0,
        neutral: response.SentimentScore?.Neutral ?? 0,
        mixed: response.SentimentScore?.Mixed ?? 0,
      },
    };
  }

  private async detectKeyPhrases(text: string, languageCode: string): Promise<KeyPhraseResult[]> {
    const command = new DetectKeyPhrasesCommand({
      Text: text,
      LanguageCode: languageCode as ComprehendLanguageCode,
    });

    const response = await this.client.send(command);

    return (response.KeyPhrases ?? []).map((phrase) => ({
      text: phrase.Text ?? '',
      score: phrase.Score ?? 0,
      beginOffset: phrase.BeginOffset ?? 0,
      endOffset: phrase.EndOffset ?? 0,
    }));
  }

  private async detectEntities(text: string, languageCode: string): Promise<EntityResult[]> {
    const command = new DetectEntitiesCommand({
      Text: text,
      LanguageCode: languageCode as ComprehendLanguageCode,
    });

    const response = await this.client.send(command);

    return (response.Entities ?? []).map((entity) => ({
      text: entity.Text ?? '',
      type: entity.Type ?? 'OTHER',
      score: entity.Score ?? 0,
      beginOffset: entity.BeginOffset ?? 0,
      endOffset: entity.EndOffset ?? 0,
    }));
  }

  /** Normalize BCP-47 tags to Comprehend-supported language codes */
  private normalizeLanguage(lang: string): string {
    const normalized = lang.toLowerCase().replace('_', '-');
    if (normalized.startsWith('pt')) return 'pt';
    if (normalized.startsWith('en')) return 'en';
    if (normalized.startsWith('es')) return 'es';
    if (normalized.startsWith('fr')) return 'fr';
    if (normalized.startsWith('de')) return 'de';
    if (normalized.startsWith('it')) return 'it';
    if (normalized.startsWith('ja')) return 'ja';
    if (normalized.startsWith('ko')) return 'ko';
    if (normalized.startsWith('zh')) return 'zh';
    if (normalized.startsWith('ar')) return 'ar';
    if (normalized.startsWith('hi')) return 'hi';
    return 'pt';
  }
}
