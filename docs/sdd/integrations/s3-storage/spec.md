# S3 Storage Integration Spec

- Provider principal: AWS S3 (`FF_STORAGE_REAL=true`).
- Fallback local: MinIO (`FF_STORAGE_REAL=false`).
- Upload: presigned URL por tenant namespace (`{tenantId}/{namespace}/{uuid}-{filename}`).
- Metadados persistidos em `StorageAssetMetadata`.
- Observabilidade: `ProviderExecutionLog` operação `create-presigned-upload`.
