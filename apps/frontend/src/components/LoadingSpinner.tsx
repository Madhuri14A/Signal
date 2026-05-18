type LoadingSpinnerProps = {
  message?: string;
};

export default function LoadingSpinner({ message = 'Loading signals...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
        <p className="mt-4 text-slate-400">{message}</p>
      </div>
    </div>
  );
}
