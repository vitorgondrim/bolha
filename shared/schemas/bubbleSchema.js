const { z } = require('zod');

const bubbleSchema = z.object({
  title: z.string()
    .min(1, 'O titulo e obrigatorio')
    .max(60, 'Titulo: maximo 60 caracteres')
    .transform(val => val.trim()),

  content: z.string()
    .min(1, 'O pensamento nao pode estar vazio')
    .max(280, 'Maximo de 280 caracteres permitido')
    .refine(val => val.trim().length > 0, 'Nao pode ser apenas espacos')
    .transform(val => val.trim()),

  subject: z.string()
    .max(30, 'Assunto: maximo 30 caracteres')
    .optional()
    .transform(val => val?.trim() || undefined),

  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),

  isAnonymous: z.boolean().optional().default(false)
});

module.exports = { bubbleSchema };
