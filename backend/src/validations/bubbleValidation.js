export { bubbleSchema } from '../../shared/schemas/bubbleSchema';
  content: z.string()
    .min(1, 'O conteúdo não pode estar vazio')
    .max(280, 'O conteúdo não pode exceder 280 caracteres')
    .refine(val => val.trim().length > 0, {
      message: 'O conteúdo não pode ser apenas espaços em branco'
    }),
  authorId: z.string().min(1, 'ID do autor é obrigatório'),
  expiresAt: z.coerce.date().optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
});