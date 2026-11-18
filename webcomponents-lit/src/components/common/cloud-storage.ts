/**
 * Cloud Storage Integration for FZL Web Components.
 *
 * Supports multiple cloud storage providers with zero external dependencies:
 * - Google Drive / Google Docs (direct multipart upload or REST proxy, with auto-conversion of .docx to native Google Docs)
 * - Amazon S3 / S3-compatible (direct presigned URL upload or REST proxy)
 * - Microsoft OneDrive / SharePoint (direct Microsoft Graph API upload or REST proxy)
 * - REST / Custom backend proxy (forwards destination metadata to serverless or backend service)
 * - Custom uploader function (fully customizable client-side uploader)
 */

export type FzlStorageProvider =
  | 'rest'
  | 'google-drive'
  | 's3'
  | 'onedrive'
  | 'custom';

export interface FzlCloudStorageConfig {
  /** Target storage provider. Defaults to `'rest'`. */
  provider?: FzlStorageProvider;

  /** REST endpoint for backend proxy or default REST upload. */
  endpoint?: string;

  // --- Google Drive / Google Docs ---
  /** Optional Google Drive folder ID to store the document into. */
  googleDriveFolderId?: string;
  /** When true and file is .docx, converts into native Google Docs format. */
  googleDriveConvertToDocs?: boolean;
  /** Static OAuth2 Bearer token for Google Drive API. */
  googleAuthToken?: string;
  /** Dynamic token provider function (e.g. from Google Identity Services / gapi). */
  googleTokenProvider?: () => Promise<string> | string;

  // --- Amazon S3 / S3-Compatible ---
  /** Direct S3 Presigned URL or bucket upload URL. */
  s3UploadUrl?: string;
  /** S3 Bucket name (passed in proxy metadata or presigned provider). */
  s3Bucket?: string;
  /** S3 Region (e.g. 'us-east-1', 'sa-east-1'). */
  s3Region?: string;
  /** Dynamic presigned URL resolver callback. */
  s3PresignedUrlProvider?: (
    file: File,
    metadata?: Record<string, unknown>
  ) => Promise<{ uploadUrl: string; fileUrl?: string; headers?: Record<string, string> }>;

  // --- Microsoft OneDrive / MS Graph ---
  /** Target OneDrive / SharePoint parent folder ID. */
  oneDriveFolderId?: string;
  /** Target OneDrive drive ID (optional, defaults to default drive). */
  oneDriveDriveId?: string;
  /** Static OAuth2 Bearer token for Microsoft Graph API. */
  oneDriveAuthToken?: string;
  /** Dynamic token provider function for Microsoft MSAL / Graph. */
  oneDriveTokenProvider?: () => Promise<string> | string;

  // --- Custom ---
  /** Custom uploader function for proprietary storage systems. */
  customUploader?: (
    file: File,
    context?: Record<string, unknown>
  ) => Promise<FzlUploadResult>;
}

export interface FzlUploadResult {
  success: boolean;
  provider: FzlStorageProvider;
  fileId?: string;
  fileUrl?: string;
  externalViewerUrl?: string;
  externalViewerLabel?: string;
  response?: unknown;
  error?: string;
}

/**
 * Returns human-friendly label for opening the document in the respective cloud viewer.
 */
export function getExternalViewerLabel(
  provider: FzlStorageProvider,
  convertToDocs = false
): string {
  switch (provider) {
    case 'google-drive':
      return convertToDocs ? 'Abrir no Google Docs ↗' : 'Abrir no Google Drive ↗';
    case 'onedrive':
      return 'Abrir no OneDrive ↗';
    case 's3':
      return 'Ver no S3 ↗';
    default:
      return 'Visualizar na Nuvem ↗';
  }
}

/**
 * Uploads a file directly to Google Drive v3 API using multipart/related upload.
 */
export async function uploadToGoogleDrive(
  file: File,
  opts: {
    folderId?: string;
    convertToDocs?: boolean;
    token: string;
  }
): Promise<FzlUploadResult> {
  const isDocx =
    file.name.toLowerCase().endsWith('.docx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const shouldConvert = Boolean(opts.convertToDocs && isDocx);

  const boundary = `-------FzlCloudUpload${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: Record<string, unknown> = {
    name: file.name,
  };
  if (opts.folderId) {
    metadata.parents = [opts.folderId];
  }
  if (shouldConvert) {
    metadata.mimeType = 'application/vnd.google-apps.document';
  }

  const metadataPart =
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n`;

  const fileType = file.type || 'application/octet-stream';
  const fileHeader = `Content-Type: ${fileType}\r\n\r\n`;

  const multipartBlob = new Blob(
    [
      delimiter,
      metadataPart,
      `--${boundary}\r\n`,
      fileHeader,
      file,
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBlob,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    id: string;
    name?: string;
    mimeType?: string;
    webViewLink?: string;
    webContentLink?: string;
  };

  const isGoogleDoc =
    data.mimeType === 'application/vnd.google-apps.document' || shouldConvert;
  const externalViewerUrl =
    data.webViewLink ||
    (isGoogleDoc
      ? `https://docs.google.com/document/d/${data.id}/edit`
      : `https://drive.google.com/file/d/${data.id}/view`);

  return {
    success: true,
    provider: 'google-drive',
    fileId: data.id,
    fileUrl: data.webContentLink || externalViewerUrl,
    externalViewerUrl,
    externalViewerLabel: getExternalViewerLabel('google-drive', isGoogleDoc),
    response: data,
  };
}

/**
 * Uploads a file to Amazon S3 via Presigned PUT URL.
 */
export async function uploadToS3Presigned(
  file: File,
  uploadUrl: string,
  headers: Record<string, string> = {},
  fileUrl?: string
): Promise<FzlUploadResult> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
    ...headers,
  };

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: reqHeaders,
    body: file,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Amazon S3 upload error (${res.status}): ${errorText}`);
  }

  const finalUrl = fileUrl || uploadUrl.split('?')[0];

  return {
    success: true,
    provider: 's3',
    fileUrl: finalUrl,
    externalViewerUrl: finalUrl,
    externalViewerLabel: getExternalViewerLabel('s3'),
    response: { status: res.status, url: finalUrl },
  };
}

/**
 * Uploads a file to Microsoft OneDrive / SharePoint via Microsoft Graph API.
 */
export async function uploadToOneDrive(
  file: File,
  opts: {
    folderId?: string;
    driveId?: string;
    token: string;
  }
): Promise<FzlUploadResult> {
  const driveBase = opts.driveId
    ? `https://graph.microsoft.com/v1.0/drives/${opts.driveId}`
    : `https://graph.microsoft.com/v1.0/me/drive`;

  const itemPath = opts.folderId
    ? `${driveBase}/items/${opts.folderId}:/${encodeURIComponent(file.name)}:/content`
    : `${driveBase}/root:/${encodeURIComponent(file.name)}:/content`;

  const res = await fetch(itemPath, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Microsoft OneDrive API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    id: string;
    name?: string;
    webUrl?: string;
    '@microsoft.graph.downloadUrl'?: string;
  };

  return {
    success: true,
    provider: 'onedrive',
    fileId: data.id,
    fileUrl: data['@microsoft.graph.downloadUrl'] || data.webUrl,
    externalViewerUrl: data.webUrl,
    externalViewerLabel: getExternalViewerLabel('onedrive'),
    response: data,
  };
}

/**
 * Uploads via Backend REST proxy endpoint with cloud provider destination metadata.
 */
export async function uploadToRestBackend(
  file: File,
  endpoint: string,
  config: FzlCloudStorageConfig,
  context?: Record<string, unknown>
): Promise<FzlUploadResult> {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const provider = config.provider || 'rest';
  formData.append('storageProvider', provider);

  if (config.googleDriveFolderId) {
    formData.append('googleDriveFolderId', config.googleDriveFolderId);
  }
  if (config.googleDriveConvertToDocs !== undefined) {
    formData.append(
      'googleDriveConvertToDocs',
      String(config.googleDriveConvertToDocs)
    );
  }
  if (config.s3Bucket) {
    formData.append('s3Bucket', config.s3Bucket);
  }
  if (config.s3Region) {
    formData.append('s3Region', config.s3Region);
  }
  if (config.oneDriveFolderId) {
    formData.append('oneDriveFolderId', config.oneDriveFolderId);
  }
  if (context) {
    formData.append('metadata', JSON.stringify(context));
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`REST backend error (${res.status}): ${errorText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? ((await res.json()) as Record<string, unknown>)
    : { message: await res.text() };

  const fileId = (data.fileId || data.id) as string | undefined;
  const fileUrl = (data.fileUrl || data.url || data.downloadUrl) as
    | string
    | undefined;
  const externalViewerUrl = (data.externalViewerUrl ||
    data.webViewLink ||
    data.webUrl ||
    data.googleDocsUrl ||
    fileUrl) as string | undefined;

  const isDocx = file.name.toLowerCase().endsWith('.docx');
  const isGoogleDoc = Boolean(
    provider === 'google-drive' && (config.googleDriveConvertToDocs || isDocx)
  );

  return {
    success: true,
    provider,
    fileId,
    fileUrl,
    externalViewerUrl,
    externalViewerLabel: getExternalViewerLabel(provider, isGoogleDoc),
    response: data,
  };
}

/**
 * Universal dispatcher that uploads a file according to the configured cloud storage provider.
 */
export async function uploadToCloudStorage(
  file: File,
  config: FzlCloudStorageConfig,
  context?: Record<string, unknown>
): Promise<FzlUploadResult> {
  const provider = config.provider || 'rest';

  // 1. Custom uploader function takes precedence
  if (config.customUploader) {
    return await config.customUploader(file, context);
  }

  // 2. Google Drive direct upload
  if (provider === 'google-drive') {
    let token = config.googleAuthToken;
    if (!token && config.googleTokenProvider) {
      token = await config.googleTokenProvider();
    }
    if (token) {
      return await uploadToGoogleDrive(file, {
        folderId: config.googleDriveFolderId,
        convertToDocs: config.googleDriveConvertToDocs,
        token,
      });
    }
    // If no direct token, forward to REST proxy if endpoint is present
    if (config.endpoint) {
      return await uploadToRestBackend(file, config.endpoint, config, context);
    }
    throw new Error(
      'Google Drive upload requer "google-auth-token" ou "googleTokenProvider()", ou um "endpoint" de backend proxy.'
    );
  }

  // 3. Amazon S3 upload
  if (provider === 's3') {
    if (config.s3PresignedUrlProvider) {
      const presigned = await config.s3PresignedUrlProvider(file, context);
      return await uploadToS3Presigned(
        file,
        presigned.uploadUrl,
        presigned.headers,
        presigned.fileUrl
      );
    }
    if (config.s3UploadUrl) {
      return await uploadToS3Presigned(file, config.s3UploadUrl);
    }
    if (config.endpoint) {
      return await uploadToRestBackend(file, config.endpoint, config, context);
    }
    throw new Error(
      'S3 upload requer "s3-upload-url" ou "s3PresignedUrlProvider()", ou um "endpoint" de backend proxy.'
    );
  }

  // 4. Microsoft OneDrive upload
  if (provider === 'onedrive') {
    let token = config.oneDriveAuthToken;
    if (!token && config.oneDriveTokenProvider) {
      token = await config.oneDriveTokenProvider();
    }
    if (token) {
      return await uploadToOneDrive(file, {
        folderId: config.oneDriveFolderId,
        driveId: config.oneDriveDriveId,
        token,
      });
    }
    if (config.endpoint) {
      return await uploadToRestBackend(file, config.endpoint, config, context);
    }
    throw new Error(
      'OneDrive upload requer "one-drive-auth-token" ou "oneDriveTokenProvider()", ou um "endpoint" de backend proxy.'
    );
  }

  // 5. REST default
  if (config.endpoint) {
    return await uploadToRestBackend(file, config.endpoint, config, context);
  }

  throw new Error('Nenhum endpoint ou provedor de nuvem configurado para envio do arquivo.');
}

// ---------------------------------------------------------------------------
// Remote delete / update (used by FzlCrudBaseController remote adapters)
// ---------------------------------------------------------------------------

/** Error raised by the remote helpers below, carrying the HTTP status. */
export class FzlCloudStorageError extends Error {
  readonly status: number;
  readonly provider: FzlStorageProvider;

  constructor(provider: FzlStorageProvider, status: number, message: string) {
    super(message);
    this.name = 'FzlCloudStorageError';
    this.provider = provider;
    this.status = status;
  }

  /** `true` when the remote file no longer exists (404/410). */
  get isNotFound(): boolean {
    return this.status === 404 || this.status === 410;
  }
}

async function ensureOk(res: Response, provider: FzlStorageProvider, label: string): Promise<void> {
  if (res.ok) return;
  const text = await res.text().catch(() => '');
  throw new FzlCloudStorageError(provider, res.status, `${label} (${res.status}): ${text}`);
}

/**
 * Removes a Google Drive file. By default it is moved to the trash (recoverable for
 * 30 days); pass `permanent: true` to delete it for good.
 * With the `drive.file` scope only files created by the app can be touched.
 */
export async function deleteFromGoogleDrive(
  fileId: string,
  opts: { token: string; permanent?: boolean }
): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
  const res = opts.permanent
    ? await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${opts.token}` } })
    : await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${opts.token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ trashed: true }),
      });
  await ensureOk(res, 'google-drive', 'Google Drive API error');
}

/**
 * Replaces the content of an existing Google Drive file (`uploadType=media`).
 */
export async function updateGoogleDriveFile(
  fileId: string,
  file: Blob,
  opts: { token: string }
): Promise<FzlUploadResult> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,mimeType,webViewLink,webContentLink`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    }
  );
  await ensureOk(res, 'google-drive', 'Google Drive API error');
  const data = (await res.json()) as { id: string; webViewLink?: string; webContentLink?: string };
  return {
    success: true,
    provider: 'google-drive',
    fileId: data.id,
    fileUrl: data.webContentLink || data.webViewLink,
    externalViewerUrl: data.webViewLink,
    externalViewerLabel: getExternalViewerLabel('google-drive'),
    response: data,
  };
}

function oneDriveBase(driveId?: string): string {
  return driveId
    ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}`
    : 'https://graph.microsoft.com/v1.0/me/drive';
}

/**
 * Removes a OneDrive item (personal OneDrive moves it to the recycle bin).
 */
export async function deleteFromOneDrive(
  itemId: string,
  opts: { token: string; driveId?: string }
): Promise<void> {
  const res = await fetch(`${oneDriveBase(opts.driveId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  await ensureOk(res, 'onedrive', 'Microsoft OneDrive API error');
}

/**
 * Replaces the content of an existing OneDrive item.
 */
export async function updateOneDriveFile(
  itemId: string,
  file: Blob,
  opts: { token: string; driveId?: string }
): Promise<FzlUploadResult> {
  const res = await fetch(
    `${oneDriveBase(opts.driveId)}/items/${encodeURIComponent(itemId)}/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    }
  );
  await ensureOk(res, 'onedrive', 'Microsoft OneDrive API error');
  const data = (await res.json()) as { id: string; webUrl?: string; '@microsoft.graph.downloadUrl'?: string };
  return {
    success: true,
    provider: 'onedrive',
    fileId: data.id,
    fileUrl: data['@microsoft.graph.downloadUrl'] || data.webUrl,
    externalViewerUrl: data.webUrl,
    externalViewerLabel: getExternalViewerLabel('onedrive'),
    response: data,
  };
}
