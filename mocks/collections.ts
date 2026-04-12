import { Collection } from '@/types/scripture';

export const COLLECTIONS: Collection[] = [
  // ─── Starter Collection (pre-loaded for all new users) ───────────────────
  {
    id: 'basic-training',
    name: 'Basic Training',
    abbreviation: 'BT',
    description: '10 essential scriptures to start your memorization journey',
    scriptures: [
      'john-3-16',
      'psalm-23-1',
      'romans-8-28',
      'phil-4-13',
      'prov-3-5-6',
      'isaiah-41-10',
      'jer-29-11',
      'romans-6-23',
      'ephes-2-8-9',
      'matt-28-19-20',
    ],
    isSystem: true,
    tags: ['STARTER'],
    createdAt: new Date().toISOString(),
  },
  // ─── System Collections ──────────────────────────────────────────────────
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
