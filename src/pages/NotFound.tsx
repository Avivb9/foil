import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '../components/ui';

export default function NotFound({ title = 'This page doesn’t exist', body = 'The link may be out of date, or the item was deleted.' }: { title?: string; body?: string }) {
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title={title}
        body={body}
        action={
          <Button variant="primary" onClick={() => nav('/')}>
            Back to spars
          </Button>
        }
      />
    </div>
  );
}
