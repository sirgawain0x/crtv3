import '../styles/globals.scss';
import { Sidebar } from '../components/sidebar.component';
import { Footer } from '../components/footer.component';

import { CeramicWrapper } from '../context';
import { AppProps } from 'next/app';

import React, { useState, useEffect } from 'react';

import { useCeramicContext } from '../context';
import { authenticateCeramic } from '../utils';
import AuthPrompt from './did-select-popup';
import { Profile } from '../types';
import { FaGithub } from 'react-icons/fa/index.js';

interface ViewerResponse {
  data?: {
    viewer?: {
      id?: string;
      basicProfile?: Profile;
    };
  };
  errors?: Array<{ message: string }>;
}

const MyApp = ({ Component, pageProps }: AppProps) => {
  const clients = useCeramicContext();
  const { ceramic, composeClient } = clients;
  const [profile, setProfile] = useState<Profile | null>(null);

  const handleLogin = async () => {
    await authenticateCeramic(ceramic, composeClient);
    await getProfile();
  };

  const getProfile = async () => {
    const result = (await composeClient.executeQuery(`
      query {
        viewer {
          id
          basicProfile {
            id
            name
          }
        }
      }
    `)) as ViewerResponse;
    localStorage.setItem('viewer', result.data?.viewer?.id || '');
    setProfile(result.data?.viewer?.basicProfile || null);
  };

  useEffect(() => {
    if (localStorage.getItem('logged_in')) {
      handleLogin();
      getProfile();
    }
  }, []);

  return (
    <div>
      <AuthPrompt />
      <div className="container">
        <CeramicWrapper>
          <Sidebar
            name={profile?.name}
            username={profile?.username}
            id={profile?.id}
          />
          <div className="body">
            <Component {...pageProps} ceramic />
            <Footer />
          </div>
        </CeramicWrapper>
      </div>
    </div>
  );
};

export default MyApp;
