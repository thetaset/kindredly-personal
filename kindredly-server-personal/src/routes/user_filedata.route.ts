import {RequestContext} from '@/base/request_context';
import UserFileService from '@/services/user_file.service';
import {streamToBase64} from '@/utils/binary_utils';
import {Routes} from '@interfaces/routes.interface';
import express, {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {FileUploadRequest} from 'tset-sharedlib/shared.types';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import {v4 as uuidv4} from 'uuid';

import {container} from '@/inversify.config';
import ItemService from '@/services/item.service';

class UserFileDataRoute implements Routes {
  public router = Router();

  private userFileService = container.resolve(UserFileService);
  private itemService = new ItemService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
      const chunks: Buffer[] = [];
      return await new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    };

    // Used for public profile images and other public content
    // TODO: also used for deprecated post images
    this.router.get(
      '/content/:refType/:refId/:filename',
      errorHelper(async (req, res, next) => {
        try {
          const {filename, refType, refId} = req.params;

          const s = await this.userFileService.fileAccessProvider.getUserDataStream(refType, refId, filename);
          s.on('error', function (e) {
            next();
          });
          if (filename.endsWith('.jpeg')) {
            res.set('Content-Type', 'image/jpeg');
          }
          res.set('Cache-Control', 'public, max-age=31557600');
          s.pipe(res);
        } catch (error) {
          console.error('Error unable to get image', error);
        }
      }),
    );

    // NO AUTH
    // SCH-UNKNOWN
    // Public image access for unencrypted images
    this.router.get(
      '/image/get/:filename',
      errorHelper(async (req, res, next) => {
        try {
          const s = await this.userFileService.fileAccessProvider.getImageStream(req.params.filename);
          s.on('error', function (e) {
            next();
          });
          res.set('Content-Type', 'image/jpeg');
          res.set('Cache-Control', 'public, max-age=31557600');
          s.pipe(res);
        } catch (error) {
          console.error('Error unable to get image', error);
        }
      }),
    );

    // SCH-OK
    this.router.get(
      '/userfile/get/:id',
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        try {
          const {userFile, stream} = await this.userFileService.getUserFileStreamById(
            RequestContext.instance(req),
            req.params.id,
            req.query.previewId,
          );
          stream.on('error', function (e) {
            console.log('ERROR:', e);
            next();
          });

          res.set('Content-Type', userFile.fileType);
          // res.set('Cache-Control', 'public, max-age=31557600');
          stream.pipe(res);
        } catch (error) {
          console.error('Error unable to get image', error);
          throw error;
        }
      }),
    );

    this.router.post(
      '/userfile/getById',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/getById'>, res, next) => {
        try {
          const {userFile, stream} = await this.userFileService.getUserFileStreamById(
            RequestContext.instance(req),
            req.body.fileId,
            req.body.previewId,
          );

          const fileDataBase64 = await streamToBase64(stream);

          const result = {
            success: true,
            results: {
              userFile,
              fileDataBase64,
            },
          };

          res.json(result);
        } catch (error) {
          console.error('Error unable to get image', error);
          throw error;
        }
      }),
    );

    // SCH-OK
    // Metadata-only fetch for binary ciphertext downloads.
    this.router.post(
      '/userfile/getMetaById',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/getMetaById'>, res) => {
        const userFile = await this.userFileService.getUserFileMetaById(
          RequestContext.instance(req),
          req.body.fileId,
          req.body.previewId,
        );

        res.json({
          success: true,
          results: {userFile},
        });
      }),
    );

    this.router.post(
      '/userfile/updateEncInfo',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/updateEncInfo'>, res) => {
        await this.userFileService.updateUserFileEncInfo(
          RequestContext.instance(req),
          req.body.fileId,
          req.body.encInfo,
        );
        res.json({success: true, results: {success: true}});
      }),
    );

    // SCH-OK
    // Safe delete: detaches from editable items first, then deletes file bytes only if unreferenced.
    this.router.post(
      '/userfile/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/remove'>, res) => {
        const fileId = (req.body as any)?.fileId;
        const results = await this.itemService.removeUserFileById(RequestContext.instance(req), fileId);
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    // Scans for unused (unreferenced) user files and optionally deletes them.
    this.router.post(
      '/userfile/cleanupUnused',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/cleanupUnused'>, res) => {
        const results = await this.itemService.cleanupUnusedUserFiles(RequestContext.instance(req), req.body);
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    // Streams raw ciphertext bytes (Content-Type always octet-stream).
    this.router.get(
      '/userfile/getCiphertext/:id',
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        try {
          const {userFile, stream} = await this.userFileService.getUserFileStreamById(
            RequestContext.instance(req),
            req.params.id,
            req.query.previewId,
          );

          stream.on('error', function (e) {
            next(e);
          });

          res.set('Content-Type', 'application/octet-stream');
          res.set('X-UserFile-Encrypted', userFile.encInfo ? 'true' : 'false');
          stream.pipe(res);
        } catch (error) {
          console.error('Error unable to get user file ciphertext', error);
          throw error;
        }
      }),
    );

    // SCH-OK
    // Streams metadata + ciphertext in a single response using multipart/mixed.
    // Part 1: application/json (userFile)
    // Part 2: application/octet-stream (ciphertext bytes)
    this.router.get(
      '/userfile/getWithMeta/:id',
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        try {
          const {userFile, stream} = await this.userFileService.getUserFileStreamById(
            RequestContext.instance(req),
            req.params.id,
            req.query.previewId,
          );

          stream.on('error', function (e) {
            next(e);
          });

          const boundary = `userfile_${uuidv4()}`;
          res.set('Content-Type', `multipart/mixed; boundary=${boundary}`);

          // Part 1: JSON metadata
          res.write(`--${boundary}\r\n`);
          res.write(`Content-Type: application/json; charset=utf-8\r\n\r\n`);
          res.write(JSON.stringify({userFile}));
          res.write(`\r\n`);

          // Part 2: ciphertext bytes
          res.write(`--${boundary}\r\n`);
          res.write(`Content-Type: application/octet-stream\r\n\r\n`);

          stream.pipe(res, {end: false});
          stream.on('end', () => {
            res.write(`\r\n--${boundary}--\r\n`);
            res.end();
          });
        } catch (error) {
          console.error('Error streaming multipart userfile', error);
          throw error;
        }
      }),
    );

    // SCH-OK
    // Chunked upload init: creates/updates the UserFile record and stores chunking metadata.
    // Actual ciphertext chunks are uploaded separately via /userfile/uploadChunk.
    this.router.post(
      '/userfile/uploadChunkedInit',
      express.json({limit: '5mb'}),
      authenticateJWT,
      errorHelper(async (req, res) => {
        const fileRef = await this.userFileService.initChunkedUpload(RequestContext.instance(req), req.body);
        res.json({
          success: true,
          results: fileRef,
        });
      }),
    );

    // SCH-OK
    // Upload a single ciphertext chunk as raw bytes.
    this.router.post(
      '/userfile/uploadChunk',
      express.raw({type: 'application/octet-stream', limit: '70mb'}),
      authenticateJWT,
      errorHelper(async (req, res) => {
        const fileId = req.headers['x-userfile-id'];
        const chunkIndex = req.headers['x-chunk-index'];
        if (typeof fileId !== 'string') {
          throw new Error('Missing x-userfile-id header');
        }
        if (typeof chunkIndex !== 'string') {
          throw new Error('Missing x-chunk-index header');
        }
        const index = Number(chunkIndex);
        if (!Number.isFinite(index) || index < 0) {
          throw new Error('Invalid x-chunk-index');
        }

        const chunkBytes = req.body as Buffer;
        await this.userFileService.uploadChunkBytes(RequestContext.instance(req), fileId, index, chunkBytes);

        res.json({
          success: true,
          results: {ok: true},
        });
      }),
    );

    // SCH-OK
    // Streams a range of ciphertext chunks using a simple framing protocol:
    // [u32be length][bytes] repeated for each chunk.
    this.router.post(
      '/userfile/getCiphertextChunkRange',
      express.json({limit: '2mb'}),
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        try {
          const fileId = req.body?.fileId;
          const startChunk = Number(req.body?.startChunk);
          const chunkCount = Number(req.body?.chunkCount);

          if (typeof fileId !== 'string') {
            throw new Error('Missing fileId');
          }
          if (!Number.isFinite(startChunk) || startChunk < 0) {
            throw new Error('Invalid startChunk');
          }
          if (!Number.isFinite(chunkCount) || chunkCount <= 0 || chunkCount > 256) {
            throw new Error('Invalid chunkCount');
          }

          res.set('Content-Type', 'application/octet-stream');

          for (let i = 0; i < chunkCount; i++) {
            const idx = startChunk + i;
            const {stream} = await this.userFileService.getUserFileChunkStreamById(
              RequestContext.instance(req),
              fileId,
              idx,
            );
            stream.on('error', function (e) {
              next(e);
            });

            const buf = await streamToBuffer(stream);
            const len = Buffer.alloc(4);
            len.writeUInt32BE(buf.length, 0);
            res.write(len);
            res.write(buf);
          }

          res.end();
        } catch (error) {
          console.error('Error streaming ciphertext chunk range', error);
          throw error;
        }
      }),
    );

    // SCH-OK
    this.router.post(
      '/userfile/upload',
      express.urlencoded({
        limit: '70mb',
        extended: true,
        parameterLimit: 50000,
      }),
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/upload'>, res) => {
        const fileInfo: FileUploadRequest = {
          ufId: req.body.ufId,
          refId: req.body.refId,
          refType: req.body.refType,
          fileType: req.body.fileType || 'image/jpeg',
          filename: req.body.filename,
          encInfo: req.body.encInfo,
          fileData: req.body.fileData,
        };
        if (req.body.previews) {
          fileInfo.previews = req.body.previews;
        }

        const fileRef = await this.userFileService.uploadFile(RequestContext.instance(req), fileInfo);
        res.json({
          success: true,
          results: fileRef,
        });
      }),
    );

    // SCH-OK
    // Binary upload endpoint: accepts raw bytes in request body, with JSON metadata in header.
    // Backward compatible: legacy /userfile/upload remains.
    this.router.post(
      '/userfile/uploadBinary',
      express.raw({
        type: 'application/octet-stream',
        limit: '70mb',
      }),
      authenticateJWT,
      errorHelper(async (req, res) => {
        const fileInfoHeader = req.headers['x-userfile-info'];
        if (typeof fileInfoHeader !== 'string') {
          throw new Error('Missing x-userfile-info header');
        }

        const parsed = JSON.parse(fileInfoHeader);
        const fileBytes = req.body as Buffer;
        const fileRef = await this.userFileService.uploadFileBinary(RequestContext.instance(req), parsed, fileBytes);

        res.json({
          success: true,
          results: fileRef,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/userfile/listFilesByRef',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/listFilesByRef'>, res) => {
        const results = await this.userFileService.listFilesByRef(
          RequestContext.instance(req),
          req.body.refType,
          req.body.refId,
        );
        res.json({
          success: true,
          results: results,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/userfile/listByUser',

      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userfile/listByUser'>, res) => {
        const results = await this.userFileService.listFilesForUser(RequestContext.instance(req), getTargetUserId(req));
        res.json({
          success: true,
          results: results,
        });
      }),
    );
  }
}

export default UserFileDataRoute;
