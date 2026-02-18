import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';

interface ScreenshotProps {
  id: number;
}

export const Screenshot: React.FC<ScreenshotProps> = ({ id }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['screenshot', id],
    queryFn: () => trpc.screenshot.get.query({ id }),
  });
  
  const mutation = useMutation({
    mutationFn: trpc.screenshot.updateAltText.mutate,
  });
  
  const [altText, setAltText] = useState(data?.altText || '');
  
  const handleSave = () => {
    mutation.mutate({ id, altText });
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No screenshot found</div>;
  
  return (
    <div style={{ margin: '20px' }}>
      <img
        src={`/api/screenshots/${id}`}
        alt={data.altText || 'Screenshot'}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div>
        <label htmlFor="altText">Alt Text:</label>
        <textarea
          id="altText"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          rows={3}
          cols={50}
          maxLength={500}
        />
        <button onClick={handleSave} disabled={mutation.isPending}>
          Save Alt Text
        </button>
        {mutation.isSuccess && <p>Alt text updated!</p>}
        {mutation.error && <p>Error: {mutation.error.message}</p>}
      </div>
    </div>
  );
};
