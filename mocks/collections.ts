import { Collection } from '@/types/scripture';

export const COLLECTIONS: Collection[] = [
  // Default collections for new users (system collections)
  {
    id: 'lords-prayer',
    name: 'The Lord\'s Prayer',
    description: 'The prayer that Jesus taught his disciples - perfect for memorization practice',
    scriptures: ['john-1-12'], // Using available scripture
    isSystem: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'faith-hearing',
    name: 'Faith by Hearing',
    description: 'Key verses about faith coming through hearing God\'s Word',
    scriptures: ['romans-10-17', 'mark-1-16', 'ezekiel-2-2'],
    isSystem: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
];
