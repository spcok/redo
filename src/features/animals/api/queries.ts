import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db'; // Adjust this import to where your PGlite instance lives

export const useAnimals = () => {
  return useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      // The raw SQL read command
      const result = await db.query('SELECT * FROM animals ORDER BY created_at DESC;');
      return result.rows;
    },
  });
};