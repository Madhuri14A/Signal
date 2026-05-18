type ErrorMessageProps = {
  message?: string;
};

export default function ErrorMessage({
  message = 'Failed to load signals. Please try again.',
}: ErrorMessageProps) {
  return (
    <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4" role="alert">
      <p className="text-red-400">{message}</p>
    </div>
  );
}
