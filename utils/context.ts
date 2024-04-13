export const SITE_LOGO = '/grant-logo.png'
export const CREATIVE_LOGO_BLK = '/Blog-Logo_blk.png'
export const CREATIVE_LOGO_WHT = '/Blog-Logo_wht.png'
export const CREATIVE_ICON = '/creative_logo_only.png'
export const SITE_NAME = 'CREATIVE TV'

export const ACCOUNT_FACTORY_ADDRESS = {
    "sepolia": '0xE90DebFD907F5B655f22bfC16083E45994d708bE',
    "polygon": '0xE90DebFD907F5B655f22bfC16083E45994d708bE',
}

export const ROLES = {
    "sepolia": {
        "test": "0xbc20b339c0dc2793ab4ecece98567f65632015b7",
    },
    "polygon": {
        "contributor": "0xb9c69af58109927cc2dcce8043f82158f7b96ca7",
        "creator": "0x480c5081793506ffb8e4a85390e4ac7c19f2d717",
        "investor": "0xace23c0669bf52c50d30c33c7e4adc78cc8754ec",
        "brand": "0x480c5081793506ffb8e4a85390e4ac7c19f2d717",
        "fan": "0xe174caa294999ec622988242641a27c11e6c22d8",
    }
}

// FOOTER
const currentYear = new Date().getFullYear();

export const FOOTER_LINKS = {
    whitepaper: 'https://creativeplatform.xyz/docs/resources/whitepaper',
    blog: 'https://blog.creativeplatform.xyz',
    about_us: 'https://creativeplatform.xyz/docs/intro',
    releases: 'https://creative-org-dao.canny.io/changelog',
    pricing: 'https://app.unlock-protocol.com/checkout?id=cac7160c-260b-467b-9012-0864039df0e3',
    tutorial: 'https://crew3.xyz/c/thecreativedao/questboard',
    cookie_policy: 'https://creativeplatform.xyz/docs/cookie-policy',
    privacy_policy: 'https://creativeplatform.xyz/docs/privacy-policy',
    terms_and_conditions: 'https://creativeplatform.xyz/docs/terms-and-conditions',
    status: 'https://thecreative.grafana.net/public-dashboards/0d59c3754efd4cf5be8298ff3b24b685?orgId=1',
    terminal: 'https://app.creativeplatform.xyz',
}
  
export const SITE_COPYRIGHT = `© ${currentYear} Creative Organization DAO, LLC. All rights reserved.`
  
// LINKS
export const SOCIAL_LINKS = {
    twitter: 'https://twitter.com/creativecrtv',
    github: 'https://github.com/creativeplatform',
    discord: 'https://discord.com/servers/creative-779364937503604777',
    lens: 'https://lensfrens.xyz/thecreative',
    linkedin: 'https://www.linkedin.com/company/creativeplatform',
    instagram: 'https://www.instagram.com/creativecrtv/',
    warpcast: 'https://warpcast.com/thecreative.eth',
    email: 'mailto:creatives@creativeplatform.xyz',
}

// Profile.tsx
export const PFP = '/0.png'

export const PROFILE_VIDEOS = {
  tooltip: 'list of your uploaded videos',
  tooltip_position: 'bottom',
}

export const PROFILE_CAMPAIGNS = {
  tooltip: 'list of your campaigns',
  tooltip_position: 'bottom',
}

// Livepeer API
export const LIVEPEER_API_URL = 'https://livepeer.com/api'
export const LIVEPEER_HERO_PLAYBACK_ID = 'cbd1dw72qst9xmps' // Welcome To Creative Organization DAO
export const LIVEPEER_FEATURED_PLAYBACK_ID = '5c2bzf537qbq0r7o' // The Creative Podcast Episode 03

// HERO SECTION
export const HERO_NAME = {
  top: 'Record Once,',
  bottom: 'Use Everywhere!',
}
  
export const HERO_DESCRIPTION = `${SITE_NAME} is a decentralized live streaming platform that puts you in control of your content and earnings. Get paid 100% of streaming revenue, have access to your own social token, and monetize your content into NFTs.`
  
export const HERO_BUTTONS = {
  primary: { text: 'Get Started', href: 'https://app.unlock-protocol.com/checkout?id=bbbcff5f-835d-4fa3-9761-988d5da9da18' },
  secondary: { text: 'How It Works', href: 'https://creativeplatform.xyz/docs/intro', target: '_blank' },
}
  
export const HERO_IMAGE = 'https://bafybeiefwmq6zykvyhwih5qbhucxrc34zbtxjbwboz7hdgkyh3u6p2ykfa.ipfs.nftstorage.link'

// FEATURED VIDEO
export const FEATURED_TEXT = {
  top: 'Record. Watch. Brand.',
  middle: 'Stream. Create. Inspire.',
  bottom: 'Engage. Dream. Earn.',
}