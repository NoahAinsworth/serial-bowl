import { useNavigate } from 'react-router-dom';

export default function BingePage() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="text-center py-12 space-y-4">
        <h1 className="text-3xl font-bold">Binge</h1>
        <p className="text-muted-foreground">Ready for new functionality</p>
      </div>
    </div>
  );
}
