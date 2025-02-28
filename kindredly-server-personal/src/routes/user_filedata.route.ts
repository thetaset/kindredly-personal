import { RequestContext } from '@/base/request_context';
import UserFileService from '@/services/user_file.service';
import { streamToBase64 } from "@/utils/binary_utils";
import { Routes } from '@interfaces/routes.interface';
import express, { Router } from 'express';
import { FileUploadInfo } from 'tset-sharedlib/shared.types';
import { authenticateJWT, errorHelper, getTargetUserId } from '../utils/auth_utils';
import * as UserFileDataPaths from 'tset-sharedlib/api/UserFileDataPaths';

import { container } from '@/inversify.config';

class UserFileDataRoute implements Routes {
  public router = Router();

  private userFileService = container.resolve(UserFileService);


  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {


    // Used for public profile images and other public content
    // TODO: also used for deprecated post images 
    this.router.get(
      UserFileDataPaths.CONTENT,
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
      UserFileDataPaths.IMAGE_GET,
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
      UserFileDataPaths.USERFILE_GET,
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
      UserFileDataPaths.USERFILE_GET_BY_ID,
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        try {
          const {userFile, stream} = await this.userFileService.getUserFileStreamById(
            RequestContext.instance(req),
            req.body.id,
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
    this.router.post(
      UserFileDataPaths.USERFILE_UPLOAD,
      express.urlencoded({
        limit: '70mb',
        extended: true,
        parameterLimit: 50000,
      }),
      authenticateJWT,
      errorHelper(async (req, res) => {

        const fileInfo: FileUploadInfo = {
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

        const results = await this.userFileService.uploadFile(RequestContext.instance(req), fileInfo);
        res.json({
          success: true,
          results: results,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      UserFileDataPaths.USERFILE_LIST_FILES_BY_REF,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserFileDataPaths.USERFILE_LIST_BY_USER,

      authenticateJWT,
      errorHelper(async (req, res) => {
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
