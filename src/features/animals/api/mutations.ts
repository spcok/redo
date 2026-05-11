import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';

export const useAddAnimal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (animalData: any) => { // Replace 'any' with your actual Zod type
      await db.query(
        'INSERT INTO animals (name, species, status) VALUES ($1, $2, $3);',
        [animalData.name, animalData.species, animalData.status]
      );
    },
    onSuccess: () => {
      // This is the magic. It tells the Dashboard to instantly refresh.
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
  });
};