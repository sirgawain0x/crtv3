
import { createHelia } from 'helia';
import { createLibp2p } from 'libp2p';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { webSockets } from '@libp2p/websockets';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import type { Helia } from 'helia';

export async function createNode(): Promise<Helia> {
    const libp2p = await createLibp2p({
        transports: [
            webSockets()
        ],
        connectionEncrypters: [
            noise()
        ],
        streamMuxers: [
            yamux()
        ],
        peerDiscovery: [
            bootstrap({
                list: [
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTeq5udZKDTP2CRuMcU',
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjdEP8kQ2LP'
                ]
            })
        ],
        services: {
            identify: identify()
        }
    });

    return createHelia({
        libp2p
    });
}
