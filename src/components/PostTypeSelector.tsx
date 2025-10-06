import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PostTypeSelectorProps {
  value: 'review' | 'thought';
  onChange: (value: 'review' | 'thought') => void;
}

export function PostTypeSelector({ value, onChange }: PostTypeSelectorProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as 'review' | 'thought')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="review">Review</TabsTrigger>
        <TabsTrigger value="thought">Thought</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
