import type { IconType } from 'react-icons';
import { FaDiscord, FaYoutube, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { SiKick } from 'react-icons/si';

import { SOCIALS } from '@/lib/partners';

/**
 * One definition of every channel, shared by the sidebar and the home page.
 * Icons come from react-icons rather than image files: they stay sharp at any
 * size, take their colour from CSS, and none of them needed sourcing.
 */
export interface Social {
  key: string;
  name: string;
  href: string;
  /** Verb for the card — "Follow" is wrong for Discord. */
  action: string;
  /** Full label for the sidebar, where verb and platform sit together. */
  cta: string;
  blurb: string;
  Icon: IconType;
  /** The platform's own colour, used on the icon only. */
  brand: string;
}

export const SOCIAL_LINKS: Social[] = [
  {
    key: 'kick',
    name: 'Kick',
    href: SOCIALS.kick,
    action: 'Watch',
    cta: 'Watch on Kick',
    blurb: 'Live streams, hunts and giveaways',
    Icon: SiKick,
    brand: '#53fc18',
  },
  {
    key: 'discord',
    name: 'Discord',
    href: SOCIALS.discord,
    action: 'Join',
    cta: 'Join Discord',
    blurb: 'Where the community talks',
    Icon: FaDiscord,
    brand: '#5865f2',
  },
  {
    key: 'youtube',
    name: 'YouTube',
    href: SOCIALS.youtube,
    action: 'Subscribe',
    cta: 'Subscribe on YouTube',
    blurb: 'Highlights and full sessions',
    Icon: FaYoutube,
    brand: '#ff0033',
  },
  {
    key: 'x',
    name: 'X',
    href: SOCIALS.x,
    action: 'Follow',
    cta: 'Follow on X',
    blurb: 'Results and announcements',
    Icon: FaXTwitter,
    brand: '#eaf2ff',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    href: SOCIALS.instagram,
    action: 'Follow',
    cta: 'Follow on Instagram',
    blurb: 'Clips from the streams',
    Icon: FaInstagram,
    brand: '#e1306c',
  },
];
