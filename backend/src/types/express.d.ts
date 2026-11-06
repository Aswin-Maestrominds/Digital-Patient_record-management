declare namespace Express {
  interface Request {
    requestId: string;
    auth?: { userId: string; sessionId: string; csrfToken: string };
  }
}
