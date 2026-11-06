import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { HttpError } from '../utils/http';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  let status = 500;
  let message = 'Unable to complete the request.';
  let issues: { field: string; message: string }[] | undefined;
  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof ZodError) {
    status = 400;
    message = 'Please check the supplied fields.';
    issues = error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (error instanceof MulterError) {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds the configured upload limit.'
        : 'Invalid multipart upload.';
  } else if (error?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body.';
  } else if (error?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  } else if (error?.code === 11000) {
    status = 409;
    message = 'A record with that identifier already exists.';
  }
  if (status >= 500) {
    // Do not log request bodies, passwords, patient details or provider error URLs.
    console.error(
      JSON.stringify({
        event: 'request_failed',
        requestId: req.requestId,
        errorType: error?.name ?? 'Error',
        errorCode: error?.code,
        ...(process.env.NODE_ENV === 'test' ? { testDiagnostic: error?.message } : {}),
      }),
    );
  }
  res.status(status).json({ success: false, message, issues, requestId: req.requestId });
};
