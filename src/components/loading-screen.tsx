import { cn } from 'cn';

export function LoadingScreen({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-1 items-center justify-center', className)}>
      <div className="relative size-36">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="absolute inset-0 m-auto size-30" />
      </div>
    </div>
  );
}
