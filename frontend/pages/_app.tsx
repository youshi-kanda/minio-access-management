import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../hooks/useAuth';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>MinIO Access Management</title>
        <meta name="description" content="MinIO バケットとユーザーの管理システム" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <AuthProvider>
        <Component {...pageProps} />
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'text-sm',
            success: {
              style: {
                background: '#10b981',
                color: 'white',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: 'white',
              },
            },
          }}
        />
      </AuthProvider>
    </>
  );
}