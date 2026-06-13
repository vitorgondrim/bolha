import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bubbleSchema } from '../../shared/schemas/bubbleSchema';

const CreateBubbleForm = ({ onSubmit }) => {
  const { 
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(bubbleSchema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <textarea
          {...register('content')}
          placeholder="O que está borbulhando?"
          className={`w-full p-4 rounded-lg bg-slate-800 border ${
            errors.content ? 'border-red-500' : 'border-slate-600'
          } focus:border-cyan-500 outline-none resize-none`}
          rows="4"
        />
        {errors.content && (
          <p className="text-red-400 text-sm mt-1">{errors.content.message}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        Soprar Pensamento
      </button>
    </form>
  );
};

export default CreateBubbleForm;