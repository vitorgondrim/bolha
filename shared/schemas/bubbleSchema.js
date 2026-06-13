import { z } from 'zod';

export const bubbleSchema = z.object({
  content: z.string()
    .min(1, 'O pensamento não pode estar vazio')
    .max(280, 'Máximo de 280 caracteres permitido')
    .refine(val => val.trim().length > 0, 'Não pode ser apenas espaços'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  isAnonymous: z.boolean().optional()
}).transform(data => ({
  ...data,
  content: data.content.trim()
}));