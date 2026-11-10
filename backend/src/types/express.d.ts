declare namespace Express {
  interface Request {
    requestId: string;
    auth?: {
      userId: string;
      workspaceId: string;
      role: 'administrator' | 'doctor' | 'staff';
      sessionId: string;
      csrfToken: string;
    };
  }
}
