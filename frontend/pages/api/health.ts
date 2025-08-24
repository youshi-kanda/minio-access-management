import { NextApiRequest, NextApiResponse } from 'next';

// Health check data interface
interface HealthData {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    adminApi: boolean;
    fileApi: boolean;
    minio: boolean;
  };
  version: string;
}

// API Handler
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthData: HealthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      adminApi: true,
      fileApi: true,
      minio: false, // Will be checked dynamically in production
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  res.status(200).json(healthData);
}