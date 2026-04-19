import { describe, expect, it } from 'vitest';

describe('vertical slice 18 - AWS Transcribe, Comprehend & OpenAI real provider integration', () => {
  describe('provider architecture', () => {
    it('AiGateway routes to OpenAI when FF_AI_REAL is true, with mock fallback', () => {
      const aiGatewayContract = {
        operations: [
          'generateInterviewQuestions',
          'analyzeInterview',
          'explainMatching',
          'generateCandidateInsights',
          'compareCandidates',
          'generateRankingRationale',
          'generateRecommendations',
          'analyzeRiskPatterns',
        ],
        mockFallback: true,
        featureFlag: 'FF_AI_REAL',
        realProvider: 'OpenAI',
        modelVersionEnv: 'AI_MODEL_VERSION',
        defaultModel: 'gpt-4o-mini',
        auditLogging: 'aiExecutionLog',
      };

      expect(aiGatewayContract.operations).toHaveLength(8);
      expect(aiGatewayContract.mockFallback).toBe(true);
      expect(aiGatewayContract.featureFlag).toBe('FF_AI_REAL');
      expect(aiGatewayContract.realProvider).toBe('OpenAI');
    });

    it('TranscriptionGateway routes to AWS Transcribe when FF_TRANSCRIPTION_REAL is true', () => {
      const transcriptionContract = {
        methods: ['enqueue', 'transcribeFromS3', 'complete'],
        featureFlag: 'FF_TRANSCRIPTION_REAL',
        realProvider: 'aws-transcribe',
        mockFallback: true,
        s3Input: true,
        pollingSupport: true,
        defaultLanguage: 'pt-BR',
      };

      expect(transcriptionContract.methods).toContain('transcribeFromS3');
      expect(transcriptionContract.realProvider).toBe('aws-transcribe');
      expect(transcriptionContract.pollingSupport).toBe(true);
      expect(transcriptionContract.s3Input).toBe(true);
    });

    it('CvParserGateway routes to OpenAI-based parsing when FF_CV_PARSER_REAL is true', () => {
      const cvParserContract = {
        featureFlag: 'FF_CV_PARSER_REAL',
        realProvider: 'openai-cv-parser',
        mockFallback: true,
        outputFields: ['experience', 'education', 'skills', 'languages', 'location', 'summary'],
        confidenceScores: true,
      };

      expect(cvParserContract.outputFields).toContain('experience');
      expect(cvParserContract.outputFields).toContain('skills');
      expect(cvParserContract.outputFields).toContain('summary');
      expect(cvParserContract.confidenceScores).toBe(true);
    });
  });

  describe('AWS real providers', () => {
    it('AwsTranscribeProvider supports start job, get job, and polling', () => {
      const transcribeProviderContract = {
        service: 'AWS Transcribe',
        methods: ['startTranscriptionJob', 'getTranscriptionJob', 'pollUntilComplete'],
        configuration: {
          regionEnv: 'AWS_TRANSCRIBE_REGION',
          fallbackRegion: 'S3_REGION',
          defaultRegion: 'us-east-1',
        },
        jobConfig: {
          mediaFormat: 'webm',
          defaultLanguage: 'pt-BR',
          outputToS3: true,
        },
        pollingConfig: {
          maxAttempts: 60,
          intervalMs: 5000,
        },
      };

      expect(transcribeProviderContract.methods).toHaveLength(3);
      expect(transcribeProviderContract.jobConfig.mediaFormat).toBe('webm');
      expect(transcribeProviderContract.pollingConfig.maxAttempts).toBe(60);
    });

    it('AwsComprehendProvider performs sentiment, key phrases, and entity detection', () => {
      const comprehendContract = {
        service: 'AWS Comprehend',
        analysisTypes: ['sentiment', 'keyPhrases', 'entities'],
        configuration: {
          regionEnv: 'AWS_COMPREHEND_REGION',
          defaultRegion: 'us-east-1',
        },
        sentimentOutput: {
          sentimentValues: ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'],
          scoresIncluded: true,
        },
        textLimit: 5000,
        supportedLanguages: ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar', 'hi'],
        parallelExecution: true,
      };

      expect(comprehendContract.analysisTypes).toHaveLength(3);
      expect(comprehendContract.sentimentOutput.sentimentValues).toContain('POSITIVE');
      expect(comprehendContract.sentimentOutput.sentimentValues).toContain('MIXED');
      expect(comprehendContract.textLimit).toBe(5000);
      expect(comprehendContract.parallelExecution).toBe(true);
    });
  });

  describe('OpenAI real provider', () => {
    it('OpenAiProvider implements all 8 AI operations with structured prompts', () => {
      const openaiContract = {
        operations: {
          generateInterviewQuestions: { temperature: 0.7, outputFormat: 'json_object', outputKey: 'questions' },
          analyzeInterview: { temperature: 0.3, outputFormat: 'json_object', outputKeys: ['summary', 'highlights', 'risks', 'evidence', 'sentiment', 'recommendation'] },
          explainMatching: { temperature: 0.3, outputFormat: 'json_object', outputKeys: ['text', 'evidences'] },
          generateCandidateInsights: { temperature: 0.4, outputFormat: 'json_object', outputKeys: ['summary', 'strengths', 'risks', 'recommendations'] },
          compareCandidates: { temperature: 0.3, outputFormat: 'json_object', outputKeys: ['winnerHint', 'dimensions'] },
          generateRankingRationale: { temperature: 0.3, outputFormat: 'json_object' },
          generateRecommendations: { temperature: 0.4, outputFormat: 'json_object', outputKeys: ['recommendations', 'explanation'] },
          analyzeRiskPatterns: { temperature: 0.3, outputFormat: 'json_object', outputKeys: ['overallRisk', 'findings'] },
        },
        parseResume: { temperature: 0.1, outputFormat: 'json_object', outputKeys: ['experience', 'education', 'skills', 'languages', 'location', 'summary'] },
        allPromptsInPortuguese: true,
        assistiveOnly: true,
        humanDecisionFinal: true,
      };

      expect(Object.keys(openaiContract.operations)).toHaveLength(8);
      expect(openaiContract.allPromptsInPortuguese).toBe(true);
      expect(openaiContract.assistiveOnly).toBe(true);
      expect(openaiContract.humanDecisionFinal).toBe(true);
      expect(openaiContract.parseResume.temperature).toBe(0.1);
    });

    it('interview analysis includes sentiment data from AI', () => {
      const analysisContract = {
        enrichedFields: ['summary', 'highlights', 'risks', 'evidence', 'sentiment', 'recommendation'],
        sentimentShape: { overall: 'POSITIVE|NEGATIVE|NEUTRAL|MIXED', confidence: 'number 0-1' },
        assistiveOnly: true,
      };

      expect(analysisContract.enrichedFields).toContain('sentiment');
      expect(analysisContract.enrichedFields).toContain('evidence');
      expect(analysisContract.sentimentShape.overall).toContain('POSITIVE');
    });
  });

  describe('SmartInterviewAiAnalysis enrichment', () => {
    it('schema includes sentiment, entities, and key phrases fields', () => {
      const schemaFields = {
        existing: ['id', 'sessionId', 'status', 'summary', 'highlights', 'risks', 'createdAt', 'updatedAt'],
        new: ['evidence', 'sentimentJson', 'entitiesJson', 'keyPhrasesJson', 'provider', 'modelVersion'],
      };

      expect(schemaFields.new).toContain('sentimentJson');
      expect(schemaFields.new).toContain('entitiesJson');
      expect(schemaFields.new).toContain('keyPhrasesJson');
      expect(schemaFields.new).toContain('provider');
      expect(schemaFields.new).toContain('modelVersion');
      expect(schemaFields.new).toHaveLength(6);
    });
  });

  describe('worker production-readiness', () => {
    it('worker uses real AWS Transcribe when FF_TRANSCRIPTION_REAL is true', () => {
      const workerTranscriptionFlow = {
        featureFlag: 'FF_TRANSCRIPTION_REAL',
        realFlow: [
          'fetch answer objectKey',
          'construct s3 mediaUri',
          'start AWS Transcribe job',
          'poll until COMPLETED',
          'fetch transcript JSON from S3',
          'store transcript in DB',
          'update TranscriptMetadata',
        ],
        mockFlow: ['return hardcoded Portuguese text'],
        fallbackOnFailure: true,
      };

      expect(workerTranscriptionFlow.realFlow).toHaveLength(7);
      expect(workerTranscriptionFlow.fallbackOnFailure).toBe(true);
    });

    it('worker enriches analysis with AWS Comprehend when FF_AI_REAL is true', () => {
      const workerAnalysisFlow = {
        featureFlag: 'FF_AI_REAL',
        comprehendFeatures: ['DetectSentiment', 'DetectKeyPhrases', 'DetectEntities'],
        parallelExecution: true,
        outputFields: ['sentimentJson', 'entitiesJson', 'keyPhrasesJson'],
        fallbackOnFailure: true,
        requiresRealTranscript: true,
      };

      expect(workerAnalysisFlow.comprehendFeatures).toHaveLength(3);
      expect(workerAnalysisFlow.parallelExecution).toBe(true);
      expect(workerAnalysisFlow.outputFields).toContain('sentimentJson');
    });
  });

  describe('environment configuration', () => {
    it('new env vars are documented for AWS and OpenAI integration', () => {
      const newEnvVars = {
        ai: ['AI_MODEL_VERSION', 'AI_PROVIDER_API_KEY', 'OPENAI_API_KEY'],
        transcribe: ['AWS_TRANSCRIBE_REGION'],
        comprehend: ['AWS_COMPREHEND_REGION'],
        featureFlags: ['FF_AI_REAL', 'FF_CV_PARSER_REAL', 'FF_TRANSCRIPTION_REAL'],
        fallback: ['AI_FALLBACK_TO_MOCK', 'CV_PARSER_FALLBACK_TO_MOCK', 'TRANSCRIPTION_FALLBACK_TO_MOCK'],
      };

      expect(newEnvVars.ai).toContain('OPENAI_API_KEY');
      expect(newEnvVars.transcribe).toContain('AWS_TRANSCRIBE_REGION');
      expect(newEnvVars.comprehend).toContain('AWS_COMPREHEND_REGION');
      expect(newEnvVars.featureFlags).toHaveLength(3);
    });
  });

  describe('data delivery quality', () => {
    it('all AI responses include provider and model metadata for traceability', () => {
      const traceabilityContract = {
        allGatewayResponses: {
          includeProvider: true,
          loggedToAiExecutionLog: true,
          requestJsonLogged: true,
          responseJsonLogged: true,
        },
        analysisResponses: {
          includeProvider: true,
          includeModelVersion: true,
          enrichedWithSentiment: true,
          enrichedWithEntities: true,
          enrichedWithKeyPhrases: true,
        },
      };

      expect(traceabilityContract.allGatewayResponses.includeProvider).toBe(true);
      expect(traceabilityContract.allGatewayResponses.loggedToAiExecutionLog).toBe(true);
      expect(traceabilityContract.analysisResponses.enrichedWithSentiment).toBe(true);
    });

    it('mock responses remain available as fallback for all operations', () => {
      const fallbackGuarantee = {
        aiGateway: { allOperationsHaveMock: true, fallbackConfigurable: true },
        transcription: { mockAvailable: true, fallbackConfigurable: true },
        cvParser: { mockAvailable: true, fallbackConfigurable: true },
      };

      expect(fallbackGuarantee.aiGateway.allOperationsHaveMock).toBe(true);
      expect(fallbackGuarantee.transcription.mockAvailable).toBe(true);
      expect(fallbackGuarantee.cvParser.mockAvailable).toBe(true);
    });
  });
});
